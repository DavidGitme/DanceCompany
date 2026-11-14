from pydantic import BaseModel, Field

from app.aplicacion.dtos.comun_dto import Texto


class GrupoCreateDto(BaseModel):
    nombre: Texto(50)
    idNivel: int = Field(gt=0)
    idEstilo: int = Field(gt=0)
    idInstructor: int = Field(gt=0)
    idSede: int = Field(gt=0)
    idAula: int = Field(gt=0)
    idTipoGrupo: int = Field(gt=0)
    capacidad: int = Field(gt=0, le=200)


class GrupoUpdateDto(BaseModel):
    nombre: Texto(50) | None = None
    idNivel: int | None = Field(default=None, gt=0)
    idEstilo: int | None = Field(default=None, gt=0)
    idInstructor: int | None = Field(default=None, gt=0)
    idSede: int | None = Field(default=None, gt=0)
    idAula: int | None = Field(default=None, gt=0)
    idTipoGrupo: int | None = Field(default=None, gt=0)
    capacidad: int | None = Field(default=None, gt=0, le=200)


class GrupoRespuesta(BaseModel):
    idGrupo: int
    nombre: str
    idNivel: int
    nivel: str
    idEstilo: int
    estilo: str
    idInstructor: int
    instructor: str
    idSede: int
    sede: str
    idAula: int
    idTipoGrupo: int
    tipoGrupo: str
    capacidad: int
    matriculados: int
    idEstado: int
    estado: str


class GrupoOpcion(BaseModel):
    idGrupo: int
    nombre: str
    sede: str
    estilo: str
    nivel: str


class TipoGrupoRespuesta(BaseModel):
    idTipoGrupo: int
    nombre: str


class AulaOpcion(BaseModel):
    idAula: int
    capacidad: int
