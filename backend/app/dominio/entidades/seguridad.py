from dataclasses import dataclass, field


@dataclass(slots=True)
class Estado:
    idEstado: int
    nombre: str
    categoria: str
    descripcion: str


@dataclass(slots=True)
class Persona:
    idPersona: int
    nombre: str
    documento: str
    telefono: str
    email: str
    fecha_nacimiento: str
    idEstado: int


@dataclass(slots=True)
class Permiso:
    idPermiso: int
    descripcion: str


@dataclass(slots=True)
class Rol:
    idRol: int
    nombre: str
    idEstado: int
    permisos: list[int] = field(default_factory=list)


@dataclass(slots=True)
class Usuario:
    documento: str
    username: str
    password_hash: str
    idEstado: int
    roles: list[int] = field(default_factory=list)
