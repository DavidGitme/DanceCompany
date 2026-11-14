"""DTO de matrículas e inscripciones a talleres."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field

DINERO = {"ge": 0, "max_digits": 10, "decimal_places": 2}


# ---------- Matrículas ----------
class MatriculaCreateDto(BaseModel):
    idEstudiante: int = Field(gt=0)
    idGrupo: int = Field(gt=0)
    fecha_matricula: date | None = Field(default=None, description="Por defecto, hoy")
    valor_matricula: Decimal = Field(**DINERO)


class MatriculaUpdateDto(BaseModel):
    idEstudiante: int | None = Field(default=None, gt=0)
    idGrupo: int | None = Field(default=None, gt=0)
    fecha_matricula: date | None = None
    valor_matricula: Decimal | None = Field(default=None, **DINERO)


class MatriculaRespuesta(BaseModel):
    idMatricula: int
    idEstudiante: int
    estudiante: str
    documento: str
    idGrupo: int
    grupo: str
    idSede: int
    sede: str
    nivel: str
    estilo: str
    fecha_matricula: date
    valor_matricula: Decimal
    valorPagado: Decimal
    saldo: Decimal
    mensualidades: int
    idEstado: int
    estado: str


class MatriculaOpcion(BaseModel):
    idMatricula: int
    idEstudiante: int
    estudiante: str
    grupo: str
    valor_matricula: Decimal
    saldo: Decimal


# ---------- Inscripciones a talleres ----------
class InscripcionTallerCreateDto(BaseModel):
    idEstudiante: int = Field(gt=0)
    idTaller: int = Field(gt=0)
    fecha_inscripcion: date | None = Field(default=None, description="Por defecto, hoy")
    idMetodo: int = Field(gt=0)
    idAcudiente: int | None = Field(
        default=None, gt=0, description="Vacío = paga el propio estudiante (debe ser mayor de edad)"
    )


class InscripcionTallerUpdateDto(BaseModel):
    fecha_inscripcion: date | None = None
    idMetodo: int | None = Field(default=None, gt=0)


class InscripcionTallerRespuesta(BaseModel):
    idInscripcion: int
    idEstudiante: int
    estudiante: str
    documento: str
    idTaller: int
    taller: str
    fecha_inscripcion: date
    idPago: int
    monto: Decimal
    idMetodo: int
    metodo: str
    idAcudiente: int
    pagador: str
