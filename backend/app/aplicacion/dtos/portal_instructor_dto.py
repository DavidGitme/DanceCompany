"""Mismos campos que las interfaces de modulos/instructores/datos/instructorMock.ts."""

from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

from app.aplicacion.dtos.comun_dto import Correo


class PerfilInstructorRespuesta(BaseModel):
    nombre: str
    documento: str
    correo: str
    telefono: str
    especialidad: str


class GrupoInstructorRespuesta(BaseModel):
    idGrupo: int
    nombre: str
    estilo: str
    nivel: str
    sede: str
    aula: str
    dias: str
    horario: str
    estudiantes: int


class MensualidadInstructorRespuesta(BaseModel):
    periodo: str
    valor: float
    fechaLimite: str
    estado: str


class EstudianteInstructorRespuesta(BaseModel):
    idEstudiante: int
    nombre: str
    documento: str
    correo: str
    telefono: str
    idGrupo: int
    estado: str
    mensualidades: list[MensualidadInstructorRespuesta]


# ---------- Lo que el instructor puede cambiar desde "Mi perfil" ----------
# Nombre y documento los gestiona la sede; aquí solo se actualiza el contacto (persona.email y persona.telefono).
Telefono = Annotated[str, StringConstraints(strip_whitespace=True, max_length=20, pattern=r"^[0-9+()\s-]*$")]


class ContactoInstructorSolicitud(BaseModel):
    correo: Correo
    telefono: Telefono = ""


class CambioClaveSolicitud(BaseModel):
    actual: str = Field(min_length=1, max_length=128)
    nueva: str = Field(min_length=8, max_length=128)
