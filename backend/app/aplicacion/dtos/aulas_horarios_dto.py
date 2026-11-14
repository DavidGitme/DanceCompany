"""DTO de aulas y horarios."""

from datetime import time

from pydantic import BaseModel, Field

from app.aplicacion.dtos.comun_dto import Texto


# ---------- Aulas ----------
class AulaCreateDto(BaseModel):
    capacidad: int = Field(gt=0, le=200)
    idSede: int = Field(gt=0)


class AulaUpdateDto(BaseModel):
    capacidad: int | None = Field(default=None, gt=0, le=200)
    idSede: int | None = Field(default=None, gt=0)


class AulaRespuesta(BaseModel):
    idAula: int
    capacidad: int
    idSede: int
    sede: str
    idEstado: int
    estado: str
    gruposActivos: int


class AulaDisponible(BaseModel):
    idAula: int
    capacidad: int
    idSede: int
    sede: str


# ---------- Horarios ----------
class HorarioCreateDto(BaseModel):
    idGrupo: int = Field(gt=0)
    dia_semana: Texto(20)
    hora_inicio: time
    hora_fin: time


class HorarioUpdateDto(BaseModel):
    idGrupo: int | None = Field(default=None, gt=0)
    dia_semana: Texto(20) | None = None
    hora_inicio: time | None = None
    hora_fin: time | None = None


class HorarioRespuesta(BaseModel):
    idHorario: int
    idGrupo: int
    grupo: str
    idSede: int
    sede: str
    idAula: int
    idInstructor: int
    instructor: str
    dia_semana: str
    hora_inicio: time
    hora_fin: time
