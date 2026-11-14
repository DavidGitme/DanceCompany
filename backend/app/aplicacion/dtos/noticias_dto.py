"""DTO de tipos de noticia y noticias."""

from datetime import datetime
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.aplicacion.dtos.comun_dto import Texto

UrlImagen = Annotated[
    str, StringConstraints(strip_whitespace=True, max_length=300, pattern=r"^https?://\S+$")
]

# Fechas: sin zona se toman en la hora de la base de datos; con zona se convierten a ella.


# ---------- Tipos de noticia ----------
class TipoNoticiaCreateDto(BaseModel):
    nombre: Texto(30)


class TipoNoticiaUpdateDto(BaseModel):
    nombre: Texto(30) | None = None


class TipoNoticiaRespuesta(BaseModel):
    idTipoNoticia: int
    nombre: str
    registrosAsociados: int


class TipoNoticiaOpcion(BaseModel):
    idTipoNoticia: int
    nombre: str


# ---------- Noticias ----------
class NoticiaCreateDto(BaseModel):
    titulo: Texto(150)
    contenido: Texto(5000)
    imagen_url: UrlImagen | None = None
    idTipoNoticia: int = Field(gt=0)
    fecha_publicacion: datetime | None = Field(default=None, description="Por defecto, ahora")
    fecha_expiracion: datetime | None = None


class NoticiaUpdateDto(BaseModel):
    titulo: Texto(150) | None = None
    contenido: Texto(5000) | None = None
    imagen_url: UrlImagen | None = None
    idTipoNoticia: int | None = Field(default=None, gt=0)
    fecha_publicacion: datetime | None = None
    fecha_expiracion: datetime | None = None


class NoticiaRespuesta(BaseModel):
    idNoticia: int
    titulo: str
    contenido: str
    imagen_url: str | None
    idTipoNoticia: int
    tipoNoticia: str
    fecha_publicacion: datetime
    fecha_expiracion: datetime | None
    idEstado: int
    estado: str


class NoticiaPublica(BaseModel):
    idNoticia: int
    titulo: str
    contenido: str
    imagen_url: str | None
    tipoNoticia: str
    fecha_publicacion: datetime
    fecha_expiracion: datetime | None
