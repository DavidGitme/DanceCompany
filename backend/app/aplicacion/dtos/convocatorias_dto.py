"""DTO de tipos de convocatoria, convocatorias y postulaciones (convocatoria_estudiante)."""

from datetime import date

from pydantic import BaseModel, Field

from app.aplicacion.dtos.comun_dto import Texto


# ---------- Tipos de convocatoria ----------
class TipoConvocatoriaCreateDto(BaseModel):
    nombre: Texto(30)


class TipoConvocatoriaUpdateDto(BaseModel):
    nombre: Texto(30) | None = None


class TipoConvocatoriaRespuesta(BaseModel):
    idTipoConvocatoria: int
    nombre: str
    registrosAsociados: int


class TipoConvocatoriaOpcion(BaseModel):
    idTipoConvocatoria: int
    nombre: str


# ---------- Convocatorias ----------
class ConvocatoriaCreateDto(BaseModel):
    nombre: Texto(50)
    fecha_inicio: date
    fecha_fin: date | None = None
    descripcion: Texto(300) | None = None
    idTipoConvocatoria: int = Field(gt=0)


class ConvocatoriaUpdateDto(BaseModel):
    nombre: Texto(50) | None = None
    fecha_inicio: date | None = None
    fecha_fin: date | None = None
    descripcion: Texto(300) | None = None
    idTipoConvocatoria: int | None = Field(default=None, gt=0)


class ConvocatoriaRespuesta(BaseModel):
    idConvocatoria: int
    nombre: str
    fecha_inicio: date
    fecha_fin: date | None
    descripcion: str | None
    idTipoConvocatoria: int
    tipoConvocatoria: str
    vigencia: str
    postulados: int
    aceptados: int


class ConvocatoriaOpcion(BaseModel):
    idConvocatoria: int
    nombre: str
    tipoConvocatoria: str
    fecha_fin: date | None


# ---------- Postulaciones (convocatoria_estudiante) ----------
class PostulacionCreateDto(BaseModel):
    idConvocatoria: int = Field(gt=0)
    idEstudiante: int = Field(gt=0)
    beneficio: Texto(50) | None = None


class PostulacionUpdateDto(BaseModel):
    beneficio: Texto(50) | None = None


class PostulacionRespuesta(BaseModel):
    idPostulacion: int
    idConvocatoria: int
    convocatoria: str
    vigencia: str
    idEstudiante: int
    estudiante: str
    documento: str
    sede: str
    idEstado: int
    estado: str
    beneficio: str | None
