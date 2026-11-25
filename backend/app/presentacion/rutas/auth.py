from fastapi import APIRouter, Cookie, Depends, Response
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.autenticacion.iniciar_sesion import IniciarSesion
from app.aplicacion.casos_uso.autenticacion.recuperar_clave import RecuperarClave
from app.aplicacion.dtos.auth_dto import (
    AceptarTerminosSolicitud,
    InicioSesionSolicitud,
    MensajeRespuesta,
    RecuperarClaveSolicitud,
    RestablecerClaveSolicitud,
    TokenRespuesta,
)
from app.config.settings import obtener_configuracion
from app.dominio.excepciones.errores import DatoInvalido, NoAutenticado
from app.dominio.reglas import ESTADO_ACTIVO, TERMINOS_VERSION
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.correo.smtp import CorreoSmtp
from app.infraestructura.repositorios.recuperacion_sql import RepositorioRecuperacionSql
from app.infraestructura.seguridad.hash_claves import HasherArgon2
from app.infraestructura.seguridad.jwt_tokens import EmisorJwt
from app.presentacion.dependencias.auth import get_usuario_actual
from app.presentacion.dependencias.servicios import obtener_repositorio_auth
from app.presentacion.middlewares.limite_intentos import limitar_inicio_sesion, limitar_recuperacion

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _guardar_cookie(response: Response, token: str, max_age: int):
    configuracion = obtener_configuracion()
    response.set_cookie(
        "refresh_token",
        token,
        max_age=max_age,
        httponly=True,
        secure=configuracion.cookie_segura,
        samesite="strict",
        path="/api/v1/auth",
    )


@router.post(
    "/login",
    response_model=TokenRespuesta,
    dependencies=[Depends(limitar_inicio_sesion)],
)
def login(solicitud: InicioSesionSolicitud, response: Response, repositorio=Depends(obtener_repositorio_auth)):
    caso = IniciarSesion(repositorio, HasherArgon2(), EmisorJwt(obtener_configuracion()))
    token, refresh, max_age = caso.ejecutar(solicitud)
    _guardar_cookie(response, refresh, max_age)
    return token


@router.post("/refresh", response_model=TokenRespuesta)
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), repositorio=Depends(obtener_repositorio_auth)):
    if not refresh_token:
        raise NoAutenticado()
    emisor = EmisorJwt(obtener_configuracion())
    contenido = emisor.decodificar(refresh_token, "refresh")
    registro = repositorio.buscar_usuario_por_documento(contenido["sub"])
    # Un usuario inactivado no puede seguir renovando su sesión
    if not registro or registro["idEstado"] != ESTADO_ACTIVO:
        raise NoAutenticado()
    roles, permisos = repositorio.permisos_de_roles(registro["roles"])
    acceso, expira = emisor.emitir_acceso(contenido["sub"], roles, permisos, registro.get("idSede"))
    nuevo_refresh, max_age = emisor.emitir_refresh(contenido["sub"])
    _guardar_cookie(response, nuevo_refresh, max_age)
    return {
        "accessToken": acceso,
        "tipo": "bearer",
        "expiraEn": expira,
        "usuario": {
            "documento": contenido["sub"],
            "nombre": registro["nombre"],
            "roles": roles,
            "permisos": permisos,
            "idSede": registro.get("idSede"),
            "sede": registro.get("sede"),
            "privilegios": repositorio.privilegios_de_roles(registro["roles"]),
            "terminosPendientes": registro.get("terminosVersion") != TERMINOS_VERSION,
        },
    }


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie("refresh_token", path="/api/v1/auth")


@router.get("/me")
def me(usuario: dict = Depends(get_usuario_actual), repositorio=Depends(obtener_repositorio_auth)):
    registro = repositorio.buscar_usuario_por_documento(usuario["sub"]) or {}
    return {
        "documento": usuario["sub"],
        "nombre": registro.get("nombre", ""),
        "roles": usuario.get("roles", []),
        "permisos": usuario.get("permisos", []),
        "idSede": usuario.get("sede"),
        "sede": registro.get("sede"),
        "privilegios": repositorio.privilegios_de_roles(registro.get("roles", [])),
        "terminosPendientes": registro.get("terminosVersion") != TERMINOS_VERSION,
    }


# La cuenta acepta los términos vigentes (se pide una vez por versión)
@router.post("/terminos", status_code=204)
def aceptar_terminos(
    solicitud: AceptarTerminosSolicitud,
    usuario: dict = Depends(get_usuario_actual),
    repositorio=Depends(obtener_repositorio_auth),
):
    if solicitud.version != TERMINOS_VERSION:
        raise DatoInvalido("Esa versión de los términos ya no está vigente. Recarga la página.")
    repositorio.aceptar_terminos(usuario["sub"], TERMINOS_VERSION)
    return Response(status_code=204)


def _recuperar(sesion: Session = Depends(obtener_sesion)) -> RecuperarClave:
    configuracion = obtener_configuracion()
    return RecuperarClave(
        RepositorioRecuperacionSql(sesion), HasherArgon2(), CorreoSmtp(configuracion), configuracion.frontend_url
    )


# "¿Olvidaste tu contraseña?": siempre la misma respuesta, exista o no la cuenta
@router.post(
    "/recuperar",
    response_model=MensajeRespuesta,
    status_code=202,
    dependencies=[Depends(limitar_recuperacion)],
)
def solicitar_recuperacion(solicitud: RecuperarClaveSolicitud, caso: RecuperarClave = Depends(_recuperar)):
    return {"mensaje": caso.solicitar(solicitud.documento)}


@router.post(
    "/restablecer",
    response_model=MensajeRespuesta,
    dependencies=[Depends(limitar_inicio_sesion)],
)
def restablecer_clave(solicitud: RestablecerClaveSolicitud, caso: RecuperarClave = Depends(_recuperar)):
    caso.restablecer(solicitud.token, solicitud.clave)
    return {"mensaje": "Tu contraseña se actualizó. Ya puedes iniciar sesión."}
