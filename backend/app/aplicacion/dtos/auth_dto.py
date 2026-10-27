from pydantic import BaseModel, Field


class InicioSesionSolicitud(BaseModel):
    documento: str = Field(min_length=5, max_length=30, pattern=r"^[A-Za-z0-9@._+-]+$")
    clave: str = Field(min_length=8, max_length=128)


class UsuarioSesionRespuesta(BaseModel):
    documento: str
    nombre: str
    roles: list[str]
    permisos: list[str]


class TokenRespuesta(BaseModel):
    accessToken: str
    tipo: str = "bearer"
    expiraEn: int
    usuario: UsuarioSesionRespuesta
