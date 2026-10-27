from datetime import date
from typing import Generic, TypeVar

from pydantic import BaseModel, EmailStr, Field

T = TypeVar("T")


class ListaRespuesta(BaseModel, Generic[T]):
    datos: list[T]
    total: int
    pagina: int
    tamano: int


class PersonaBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    documento: str = Field(min_length=5, max_length=30)
    telefono: str = Field(min_length=7, max_length=30)
    email: EmailStr
    fecha_nacimiento: date
    idEstado: int = Field(gt=0)


class PersonaCrearSolicitud(PersonaBase):
    pass


class PersonaActualizarSolicitud(PersonaBase):
    pass


class PersonaRespuesta(PersonaBase):
    idPersona: int


class UsuarioCrearSolicitud(BaseModel):
    documento: str = Field(min_length=5, max_length=30)
    username: str = Field(min_length=3, max_length=80)
    clave: str = Field(min_length=8, max_length=128)
    idEstado: int = Field(gt=0)
    roles: list[int] = Field(min_length=1)


class UsuarioActualizarSolicitud(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    idEstado: int = Field(gt=0)
    roles: list[int] = Field(min_length=1)


class UsuarioRespuesta(BaseModel):
    documento: str
    username: str
    idEstado: int
    roles: list[int]


class RolCrearSolicitud(BaseModel):
    nombre: str = Field(min_length=2, max_length=80)
    idEstado: int = Field(gt=0)
    permisos: list[int] = []


class RolRespuesta(RolCrearSolicitud):
    idRol: int


class PermisoCrearSolicitud(BaseModel):
    descripcion: str = Field(min_length=2, max_length=120)


class PermisoRespuesta(PermisoCrearSolicitud):
    idPermiso: int


class EstadoCrearSolicitud(BaseModel):
    nombre: str = Field(min_length=2, max_length=60)
    categoria: str = Field(min_length=2, max_length=60)
    descripcion: str = Field(min_length=2, max_length=250)


class EstadoRespuesta(EstadoCrearSolicitud):
    idEstado: int


class RolesPermisosSolicitud(BaseModel):
    permisos: list[int]


class RolesPermisosRespuesta(BaseModel):
    idRol: int
    permisos: list[int]
