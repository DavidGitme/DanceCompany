from app.aplicacion.dtos.auth_dto import TokenRespuesta, UsuarioSesionRespuesta
from app.aplicacion.servicios.seguridad import EmisorTokens, HasherClaves
from app.dominio.excepciones.errores import NoAutenticado
from app.dominio.reglas import ESTADO_ACTIVO, MENSAJE_CUENTA_INACTIVA
from app.dominio.repositorios.repositorio_portal_estudiante import RepositorioCuentaEstudiante

ROL_ESTUDIANTE = "estudiante"
MENSAJE_ERROR = "Correo o contraseña incorrectos."


class IniciarSesionEstudiante:
    """El estudiante entra con el correo de su persona y la clave de su usuario.

    Solo entra si la cuenta y el estudiante están activos y tiene el rol Estudiante.
    El token lleva el rol `estudiante` y ningún permiso de administración.
    """

    def __init__(self, repositorio: RepositorioCuentaEstudiante, hasher: HasherClaves, tokens: EmisorTokens):
        self.repositorio = repositorio
        self.hasher = hasher
        self.tokens = tokens

    def ejecutar(self, correo: str, clave: str) -> TokenRespuesta:
        cuenta = self.repositorio.buscar_por_correo(correo.strip())
        if not cuenta or not self.hasher.verificar(clave, cuenta["password_hash"]):
            raise NoAutenticado(MENSAJE_ERROR)
        if cuenta["bloqueado"]:
            raise NoAutenticado("Tu cuenta está bloqueada temporalmente. Intenta más tarde.")
        if not cuenta["esEstudiante"] or cuenta["idEstudiante"] is None:
            raise NoAutenticado(MENSAJE_ERROR)
        # Clave correcta pero cuenta o estudiante inactivos: se explica qué hacer
        if cuenta["idEstadoUsuario"] != ESTADO_ACTIVO or cuenta["idEstadoEstudiante"] != ESTADO_ACTIVO:
            raise NoAutenticado(MENSAJE_CUENTA_INACTIVA)

        acceso, expira_en = self.tokens.emitir_acceso(cuenta["documento"], [ROL_ESTUDIANTE], [])
        return TokenRespuesta(
            accessToken=acceso,
            expiraEn=expira_en,
            usuario=UsuarioSesionRespuesta(
                documento=cuenta["documento"],
                nombre=cuenta["nombre"],
                roles=[ROL_ESTUDIANTE],
                permisos=[],
            ),
        )
