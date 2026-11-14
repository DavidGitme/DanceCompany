"""DTO de instructores y estudiantes (sus datos personales viven en `persona`)."""

from datetime import date

from pydantic import BaseModel, EmailStr, Field

from app.aplicacion.dtos.comun_dto import Texto


class PersonaDatos(BaseModel):
    nombre: Texto(100, minimo=2)
    idTipoDocumento: int = Field(gt=0)
    documento: Texto(20, minimo=5)
    telefono: Texto(20, minimo=7) | None = None
    email: EmailStr | None = None
    fecha_nacimiento: date | None = None


class PersonaCambios(BaseModel):
    nombre: Texto(100, minimo=2) | None = None
    idTipoDocumento: int | None = Field(default=None, gt=0)
    documento: Texto(20, minimo=5) | None = None
    telefono: Texto(20, minimo=7) | None = None
    email: EmailStr | None = None
    fecha_nacimiento: date | None = None


class PersonaRespuesta(BaseModel):
    idPersona: int
    nombre: str
    idTipoDocumento: int
    tipoDocumento: str
    documento: str | None
    telefono: str | None
    email: str | None
    fecha_nacimiento: date | None


# ---------- Instructores ----------
class SedeResumen(BaseModel):
    idSede: int
    nombre: str


class InstructorCreateDto(PersonaDatos):
    descripcion: Texto(100) | None = None
    sedes: list[int] = Field(min_length=1)


class InstructorUpdateDto(PersonaCambios):
    descripcion: Texto(100) | None = None
    sedes: list[int] | None = Field(default=None, min_length=1)


class InstructorRespuesta(PersonaRespuesta):
    idInstructor: int
    descripcion: str | None
    idEstado: int
    estado: str
    sedes: list[SedeResumen]
    gruposActivos: int


class InstructorOpcion(BaseModel):
    idInstructor: int
    nombre: str


# ---------- Estudiantes ----------
class GrupoResumen(BaseModel):
    idGrupo: int
    nombre: str


class EstudianteCreateDto(PersonaDatos):
    idSede: int = Field(gt=0)


class EstudianteUpdateDto(PersonaCambios):
    idSede: int | None = Field(default=None, gt=0)


class EstudianteRespuesta(PersonaRespuesta):
    idEstudiante: int
    idSede: int
    sede: str
    idEstado: int
    estado: str
    grupos: list[GrupoResumen]


class EstudianteOpcion(BaseModel):
    idEstudiante: int
    nombre: str
    documento: str | None
