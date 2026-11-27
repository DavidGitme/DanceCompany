from typing import Annotated, Generic, TypeVar

from pydantic import AfterValidator, BaseModel, EmailStr, Field, StringConstraints

from app.dominio.reglas import error_nombre_persona

T = TypeVar("T")


def Texto(maximo: int, minimo: int = 1):
    """Texto obligatorio, sin espacios sobrantes."""
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=minimo, max_length=maximo)]


def _nombre_valido(valor: str) -> str:
    error = error_nombre_persona(valor)
    if error:
        raise ValueError(error)
    return " ".join(valor.split())


# Nombre de una persona (persona.nombre VARCHAR(100)): sin números ni símbolos
NombrePersona = Annotated[
    str, StringConstraints(strip_whitespace=True, min_length=2, max_length=100), AfterValidator(_nombre_valido)
]

# persona.email es VARCHAR(100)
Correo = Annotated[EmailStr, Field(max_length=100)]


class ListaRespuesta(BaseModel, Generic[T]):
    datos: list[T]
    total: int
    pagina: int
    tamano: int


class CambioEstadoSolicitud(BaseModel):
    idEstado: int = Field(gt=0)
