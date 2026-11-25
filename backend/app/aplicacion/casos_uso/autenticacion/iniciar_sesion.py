from app.aplicacion.dtos.auth_dto import (
    InicioSesionSolicitud,
    TokenRespuesta,
    UsuarioSesionRespuesta,
)
from app.aplicacion.servicios.seguridad import EmisorTokens, HasherClaves
from app.dominio.excepciones.errores import NoAutenticado
from app.dominio.reglas import ESTADO_ACTIVO, normalizar_documento
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
        # Acepta el documento con puntos o espacios ("1.000.000.001")
        documento = normalizar_documento(solicitud.documento)
        registro = self.repositorio.buscar_usuario_por_documento(documento)
        if not registro and documento != solicitud.documento:
            # Cuentas anteriores a la normalización (por ejemplo, un pasaporte en minúscula)
            documento = solicitud.documento
            registro = self.repositorio.buscar_usuario_por_documento(documento)
        if not registro or not self.hasher.verificar(
            solicitud.clave, registro["password_hash"]
        ):
            raise NoAutenticado("Documento o clave incorrectos.")
        # Solo entra una cuenta Activa (estados.idEstado = 1)
        if registro["idEstado"] != ESTADO_ACTIVO:
            raise NoAutenticado("Documento o clave incorrectos.")

        roles, permisos = self.repositorio.permisos_de_roles(registro["roles"])
        id_sede = registro.get("idSede")
        acceso, expira_en = self.tokens.emitir_acceso(
            documento, roles, permisos, id_sede
        )
        refresh, refresh_expira_en = self.tokens.emitir_refresh(documento)
        respuesta = TokenRespuesta(
            accessToken=acceso,
            expiraEn=expira_en,
            usuario=UsuarioSesionRespuesta(
                documento=documento,
                nombre=registro["nombre"],
                roles=roles,
                permisos=permisos,
                idSede=id_sede,
                sede=registro.get("sede"),
            ),
        )
        return respuesta, refresh, refresh_expira_en
