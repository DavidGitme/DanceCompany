"""Mismos campos que las interfaces de modulos/instructores/datos/instructorMock.ts."""

from pydantic import BaseModel


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
