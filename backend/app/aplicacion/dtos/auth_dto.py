from pydantic import BaseModel, Field


class InicioSesionSolicitud(BaseModel):
    documento: str = Field(min_length=5, max_length=30, pattern=r"^[A-Za-z0-9@._+-]+$")
    clave: str = Field(min_length=8, max_length=128)


class UsuarioSesionRespuesta(BaseModel):
    documento: str
    nombre: str
    roles: list[str]
    permisos: list[str]
    idSede: int | None = None
    sede: str | None = None
    # Módulo -> acciones (ver, crear, editar, eliminar) para mostrar solo lo permitido
    privilegios: dict[str, list[str]] = Field(default_factory=dict)
    # True si la cuenta todavía no acepta la versión vigente de los términos
    terminosPendientes: bool = False


class TokenRespuesta(BaseModel):
    accessToken: str
    tipo: str = "bearer"
    expiraEn: int
    usuario: UsuarioSesionRespuesta


class AceptarTerminosSolicitud(BaseModel):
    version: str = Field(min_length=1, max_length=10)


class RecuperarClaveSolicitud(BaseModel):
    documento: str = Field(min_length=5, max_length=30, pattern=r"^[A-Za-z0-9.\- ]+$")


class RestablecerClaveSolicitud(BaseModel):
    token: str = Field(min_length=20, max_length=200)
    clave: str = Field(min_length=8, max_length=128)


class MensajeRespuesta(BaseModel):
    mensaje: str
