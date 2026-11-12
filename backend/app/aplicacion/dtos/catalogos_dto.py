"""DTO de sedes, estilos, niveles y talleres."""

from decimal import Decimal

from pydantic import BaseModel, Field

from app.aplicacion.dtos.comun_dto import Texto


# ---------- Estilos ----------
class EstiloCreateDto(BaseModel):
    nombre: Texto(50)


class EstiloUpdateDto(BaseModel):
    nombre: Texto(50) | None = None


class EstiloRespuesta(BaseModel):
    idEstilo: int
    nombre: str
    idEstado: int
    estado: str
    gruposActivos: int


class EstiloOpcion(BaseModel):
    idEstilo: int
    nombre: str


# ---------- Sedes ----------
class SedeCreateDto(BaseModel):
    nombre: Texto(30)
    direccion: Texto(50) | None = None


class SedeUpdateDto(BaseModel):
    nombre: Texto(30) | None = None
    direccion: Texto(50) | None = None


class SedeRespuesta(BaseModel):
    idSede: int
    nombre: str
    direccion: str | None
    idEstado: int
    estado: str
    gruposActivos: int
    estudiantesActivos: int


class SedeOpcion(BaseModel):
    idSede: int
    nombre: str
    direccion: str | None


# ---------- Niveles ----------
class NivelCreateDto(BaseModel):
    nombre: Texto(30)
    orden: int = Field(gt=0)
    edadMin: int = Field(ge=0, le=99)
    edadMax: int = Field(ge=0, le=99)


class NivelUpdateDto(BaseModel):
    nombre: Texto(30) | None = None
    orden: int | None = Field(default=None, gt=0)
    edadMin: int | None = Field(default=None, ge=0, le=99)
    edadMax: int | None = Field(default=None, ge=0, le=99)


class NivelRespuesta(BaseModel):
    idNivel: int
    nombre: str
    orden: int
    edadMin: int | None
    edadMax: int | None
    idEstado: int
    estado: str
    gruposActivos: int


class NivelOpcion(BaseModel):
    idNivel: int
    nombre: str
    orden: int
    edadMin: int | None
    edadMax: int | None


# ---------- Talleres ----------
class TallerCreateDto(BaseModel):
    descripcion: Texto(200)
    valor: Decimal = Field(ge=0, max_digits=10, decimal_places=2)


class TallerUpdateDto(BaseModel):
    descripcion: Texto(200) | None = None
    valor: Decimal | None = Field(default=None, ge=0, max_digits=10, decimal_places=2)


class TallerRespuesta(BaseModel):
    idTaller: int
    descripcion: str
    valor: Decimal
    idEstado: int
    estado: str


class TallerOpcion(BaseModel):
    idTaller: int
    descripcion: str
    valor: Decimal
