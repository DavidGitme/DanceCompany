from fastapi import APIRouter, Cookie, Depends, Response

from app.aplicacion.casos_uso.autenticacion.iniciar_sesion import IniciarSesion
from app.aplicacion.dtos.auth_dto import InicioSesionSolicitud, TokenRespuesta
from app.config.settings import obtener_configuracion
from app.dominio.excepciones.errores import NoAutenticado
from app.infraestructura.seguridad.hash_claves import HasherArgon2
from app.infraestructura.seguridad.jwt_tokens import EmisorJwt
from app.presentacion.dependencias.auth import get_usuario_actual
from app.presentacion.dependencias.servicios import obtener_repositorio
from app.presentacion.middlewares.limite_intentos import limitar_inicio_sesion

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
def login(solicitud: InicioSesionSolicitud, response: Response, repositorio=Depends(obtener_repositorio)):
    caso = IniciarSesion(repositorio, HasherArgon2(), EmisorJwt(obtener_configuracion()))
    token, refresh, max_age = caso.ejecutar(solicitud)
    _guardar_cookie(response, refresh, max_age)
    return token


@router.post("/refresh", response_model=TokenRespuesta)
def refresh(response: Response, refresh_token: str | None = Cookie(default=None), repositorio=Depends(obtener_repositorio)):
    if not refresh_token:
        raise NoAutenticado()
    emisor = EmisorJwt(obtener_configuracion())
    contenido = emisor.decodificar(refresh_token, "refresh")
    registro = repositorio.buscar_usuario_por_documento(contenido["sub"])
    if not registro:
        raise NoAutenticado()
    roles, permisos = repositorio.permisos_de_roles(registro["roles"])
    acceso, expira = emisor.emitir_acceso(contenido["sub"], roles, permisos)
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
        },
    }


@router.post("/logout", status_code=204)
def logout(response: Response):
    response.delete_cookie("refresh_token", path="/api/v1/auth")


@router.get("/me")
def me(usuario: dict = Depends(get_usuario_actual)):
    return {
        "documento": usuario["sub"],
        "nombre": usuario.get("nombre", ""),
        "roles": usuario.get("roles", []),
        "permisos": usuario.get("permisos", []),
    }
