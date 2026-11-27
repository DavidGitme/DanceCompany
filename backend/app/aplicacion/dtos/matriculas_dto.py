"""DTO de matrículas e inscripciones a talleres."""

from datetime import date, datetime
from decimal import Decimal

from pydantic import BaseModel, Field

from app.aplicacion.dtos.comun_dto import Texto

DINERO = {"ge": 0, "max_digits": 10, "decimal_places": 2}


# ---------- Matrículas ----------
# El valor no se envía: la matrícula tiene un precio único (VALOR_MATRICULA en dominio/reglas.py)
class MatriculaCreateDto(BaseModel):
    idEstudiante: int = Field(gt=0)
    idGrupo: int = Field(gt=0)
    fecha_matricula: date | None = Field(default=None, description="Por defecto, hoy")


class MatriculaUpdateDto(BaseModel):
    idEstudiante: int | None = Field(default=None, gt=0)
    idGrupo: int | None = Field(default=None, gt=0)
    fecha_matricula: date | None = None


class MatriculaRespuesta(BaseModel):
    idMatricula: int
    idEstudiante: int
    estudiante: str
    documento: str
    fecha_nacimiento: date | None = None
    idGrupo: int
    grupo: str
    idSede: int
    sede: str
    nivel: str
    estilo: str
    instructor: str | None = None
    fecha_matricula: date
    valor_matricula: Decimal
    valorPagado: Decimal
    saldo: Decimal
    mensualidades: int
    # Proceso de aprobación (vacío mientras la base no tenga bd/08)
    requisitosCumplidos: int = 0
    requisitosTotal: int = 0
    fecha_aprobacion: datetime | None = None
    aprobadaPor: str | None = None
    idEstado: int
    estado: str


class RequisitoMatriculaRespuesta(BaseModel):
    idRequisito: int
    nombre: str
    descripcion: str | None
    # administrador o instructor
    responsable: str
    cumplido: bool = False
    fechaCumplido: datetime | None = None
    marcadoPor: str | None = None
    observacion: str | None = None


class MatriculaDetalleRespuesta(MatriculaRespuesta):
    requisitos: list[RequisitoMatriculaRespuesta]


class MarcarRequisitoSolicitud(BaseModel):
    cumplido: bool
    observacion: Texto(150) | None = None


class EstadoMatriculaRespuesta(BaseModel):
    idEstado: int
    nombre: str


class EstudianteParaMatricula(BaseModel):
    idEstudiante: int
    nombre: str
    documento: str | None
    idSede: int
    sede: str
    fecha_nacimiento: date | None


class GrupoParaMatricula(BaseModel):
    idGrupo: int
    nombre: str
    nivel: str
    estilo: str
    idSede: int
    sede: str
    edadMin: int | None
    edadMax: int | None
    capacidad: int
    ocupados: int


class ConfiguracionMatricula(BaseModel):
    valorMatricula: Decimal
    # False mientras la base no tenga bd/08_matricula_aprobacion.sql
    aprobacionDisponible: bool


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
