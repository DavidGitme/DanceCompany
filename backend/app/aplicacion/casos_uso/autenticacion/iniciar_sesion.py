from app.aplicacion.dtos.auth_dto import (
    InicioSesionSolicitud,
    TokenRespuesta,
    UsuarioSesionRespuesta,
)
from app.aplicacion.servicios.seguridad import EmisorTokens, HasherClaves
from app.dominio.excepciones.errores import NoAutenticado
from app.dominio.repositorios.repositorio_seguridad import RepositorioSeguridad


class IniciarSesion:
    def __init__(
        self,
        repositorio: RepositorioSeguridad,
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
        if registro["idEstado"] not in (1, 8):
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
