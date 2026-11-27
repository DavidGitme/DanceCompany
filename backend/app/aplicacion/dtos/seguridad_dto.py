"""DTO de seguridad, alineados con las tablas de Neon (backend/bd/01_esquema.sql).

Las solicitudes validan lo que entra; las respuestas solo describen lo que sale
(sin longitudes mínimas, porque los datos ya guardados pueden tener campos vacíos).
"""

from datetime import date
from typing import Generic, TypeVar

from pydantic import BaseModel, EmailStr, Field

from app.aplicacion.dtos.comun_dto import NombrePersona

T = TypeVar("T")


class ListaRespuesta(BaseModel, Generic[T]):
    datos: list[T]
    total: int
    pagina: int
    tamano: int


# ─── Personas (tabla persona) ──────────────────────────

class PersonaCrearSolicitud(BaseModel):
    nombre: NombrePersona
    idTipoDocumento: int = Field(1, gt=0, description="1 = cédula de ciudadanía (ver tipo_documento)")
    documento: str = Field(min_length=5, max_length=20)
    telefono: str | None = Field(None, min_length=7, max_length=20)
    email: EmailStr | None = None
    fecha_nacimiento: date | None = None
    idEstado: int = Field(1, gt=0)


PersonaActualizarSolicitud = PersonaCrearSolicitud


class PersonaRespuesta(BaseModel):
    idPersona: int
    nombre: str
    idTipoDocumento: int | None = None
    documento: str
    telefono: str | None = None
    email: str | None = None
    fecha_nacimiento: date | None = None
    idEstado: int


# ─── Usuarios (tabla usuarios, la llave es el documento) ───

class UsuarioCrearSolicitud(BaseModel):
    documento: str = Field(min_length=5, max_length=20, description="Documento de una persona existente")
    clave: str = Field(min_length=8, max_length=128)
    idEstado: int = Field(1, gt=0)
    roles: list[int] = Field(min_length=1)
    username: str | None = Field(None, description="Ignorado: el usuario inicia sesión con su documento")


class UsuarioActualizarSolicitud(BaseModel):
    idEstado: int = Field(gt=0)
    roles: list[int] = Field(min_length=1)
    username: str | None = Field(None, description="Ignorado: el usuario inicia sesión con su documento")


class UsuarioRespuesta(BaseModel):
    documento: str
    username: str = Field(description="Igual al documento (se conserva por compatibilidad)")
    idEstado: int
    roles: list[int]
    # Datos de la persona (solo en el listado)
    nombre: str | None = None
    email: str | None = None
    idTipoDocumento: int | None = None
    tipoDocumento: str | None = None
    estado: str | None = None
    idSede: int | None = None
    sede: str | None = None


# ─── Roles y permisos ──────────────────────────────────

class RolCrearSolicitud(BaseModel):
    nombre: str = Field(min_length=2, max_length=30)
    idEstado: int = Field(1, gt=0)
    permisos: list[int] = []


class RolRespuesta(BaseModel):
    idRol: int
    nombre: str
    idEstado: int
    permisos: list[int]


class PermisoCrearSolicitud(BaseModel):
    descripcion: str = Field(min_length=2, max_length=100)


class PermisoRespuesta(BaseModel):
    idPermiso: int
    descripcion: str


class RolesPermisosSolicitud(BaseModel):
    permisos: list[int]


class RolesPermisosRespuesta(BaseModel):
    idRol: int
    permisos: list[int]


# ─── Privilegios por módulo (nivel 3) ──────────────────

class PrivilegioEntrada(BaseModel):
    idPermiso: int = Field(gt=0)
    ver: bool = False
    crear: bool = False
    editar: bool = False
    eliminar: bool = False


class PrivilegiosSolicitud(BaseModel):
    privilegios: list[PrivilegioEntrada] = Field(max_length=100)


class PrivilegioModulo(PrivilegioEntrada):
    modulo: str


class PrivilegiosRespuesta(BaseModel):
    idRol: int
    rol: str
    editable: bool
    privilegios: list[PrivilegioModulo]


# ─── Estados ───────────────────────────────────────────

class EstadoCrearSolicitud(BaseModel):
    nombre: str = Field(min_length=2, max_length=30)
    categoria: str = Field(min_length=2, max_length=30)
    descripcion: str | None = Field(None, max_length=100)
    orden: int | None = Field(None, ge=1, description="Si no se envía, va de último en su categoría")


class EstadoRespuesta(BaseModel):
    idEstado: int
    nombre: str
    categoria: str
    descripcion: str | None = None
    orden: int | None = None
