from typing import Annotated, Generic, TypeVar

from pydantic import BaseModel, Field, StringConstraints

T = TypeVar("T")


def Texto(maximo: int, minimo: int = 1):
    """Texto obligatorio, sin espacios sobrantes."""
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=minimo, max_length=maximo)]


class ListaRespuesta(BaseModel, Generic[T]):
    datos: list[T]
    total: int
    pagina: int
    tamano: int


class CambioEstadoSolicitud(BaseModel):
    idEstado: int = Field(gt=0)
