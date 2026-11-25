"""DTO de la inscripción presencial del estudiante (la hace el administrador de la sede)."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, Field, model_validator

from app.aplicacion.dtos.comun_dto import Correo, Texto
from app.aplicacion.dtos.personas_rol_dto import EstudianteRespuesta

DINERO = {"ge": 0, "max_digits": 10, "decimal_places": 2}


class PersonaNueva(BaseModel):
    nombre: Texto(100, minimo=2)
    idTipoDocumento: int = Field(gt=0)
    documento: Texto(20, minimo=5)
    telefono: Texto(20, minimo=7)
    email: Correo | None = None
    fecha_nacimiento: date | None = None


class AcudienteInscripcion(BaseModel):
    """Una persona ya registrada (idPersona, buscada por documento) o los datos de una nueva."""

    idPersona: int | None = Field(default=None, gt=0)
    persona: PersonaNueva | None = None
    idParentesco: int = Field(gt=0)

    @model_validator(mode="after")
    def una_sola_fuente(self):
        if (self.idPersona is None) == (self.persona is None):
            raise ValueError("Indica una persona registrada o los datos de una nueva, no ambos.")
        return self


class InscripcionSolicitud(BaseModel):
    # Datos del estudiante: teléfono y fecha de nacimiento son obligatorios
    nombre: Texto(100, minimo=2)
    idTipoDocumento: int = Field(gt=0)
    documento: Texto(20, minimo=5)
    telefono: Texto(20, minimo=7)
    email: Correo | None = None
    fecha_nacimiento: date
    idSede: int = Field(gt=0)
    # Acudiente opcional (uno como máximo)
    acudientes: list[AcudienteInscripcion] = Field(default_factory=list, max_length=1)
    # Matrícula opcional en un grupo de la misma sede
    idGrupo: int | None = Field(default=None, gt=0)
    valor_matricula: Decimal | None = Field(default=None, **DINERO)
    fecha_matricula: date | None = None
    # Cuenta para el portal del estudiante: su usuario es el número de documento.
    # Con clave, la sede se la entrega en persona; sin clave, le llega un enlace al correo
    # para que la cree él mismo.
    crearCuenta: bool = False
    clave: str | None = Field(default=None, min_length=8, max_length=128)

    @model_validator(mode="after")
    def matricula_completa(self):
        if self.idGrupo is not None and self.valor_matricula is None:
            raise ValueError("Indica el valor de la matrícula.")
        return self


class AcudienteRespuesta(BaseModel):
    idAcudiente: int
    idPersona: int
    nombre: str
    tipoDocumento: str
    documento: str
    telefono: str | None
    email: str | None
    idParentesco: int
    parentesco: str


class InscripcionRespuesta(BaseModel):
    estudiante: EstudianteRespuesta
    acudientes: list[AcudienteRespuesta]
    idMatricula: int | None
    cuentaCreada: bool
    # None = no había correo que enviar
    correoEnviado: bool | None = None
    aviso: str | None = None


class PersonaEncontrada(BaseModel):
    # Lo mínimo para reconocer al acudiente; sin contacto ni datos de otra sede
    idPersona: int
    nombre: str
    tipoDocumento: str
    documento: str
    esAcudiente: bool


class VincularAcudienteSolicitud(AcudienteInscripcion):
    pass
