from app.aplicacion.dtos.auth_dto import (
    InicioSesionSolicitud,
    TokenRespuesta,
    UsuarioSesionRespuesta,
)
from app.aplicacion.servicios.seguridad import EmisorTokens, HasherClaves
from app.dominio.excepciones.errores import NoAutenticado
from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_autenticacion import RepositorioAutenticacion


class IniciarSesion:
    def __init__(
        self,
        repositorio: RepositorioAutenticacion,
        hasher: HasherClaves,
        tokens: EmisorTokens,
    ):
        self.repositorio = repositorio
        self.hasher = hasher
        self.tokens = tokens

    def ejecutar(self, solicitud: InicioSesionSolicitud) -> tuple[TokenRespuesta, str, int]:
        registro = self.repositorio.buscar_usuario_por_documento(solicitud.documento)
        if not registro or not self.hasher.verificar(
            solicitud.clave, registro["password_hash"]
        ):
            raise NoAutenticado("Documento o clave incorrectos.")
        # Solo entra una cuenta Activa (estados.idEstado = 1)
        if registro["idEstado"] != ESTADO_ACTIVO:
            raise NoAutenticado("Documento o clave incorrectos.")

        roles, permisos = self.repositorio.permisos_de_roles(registro["roles"])
        acceso, expira_en = self.tokens.emitir_acceso(
            solicitud.documento, roles, permisos
        )
        refresh, refresh_expira_en = self.tokens.emitir_refresh(solicitud.documento)
        respuesta = TokenRespuesta(
            accessToken=acceso,
            expiraEn=expira_en,
            usuario=UsuarioSesionRespuesta(
                documento=solicitud.documento,
                nombre=registro["nombre"],
                roles=roles,
                permisos=permisos,
            ),
        )
        return respuesta, refresh, refresh_expira_en
