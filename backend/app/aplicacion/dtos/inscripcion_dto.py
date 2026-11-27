"""DTO de la inscripción presencial del estudiante (la hace el administrador de la sede)."""

from datetime import date

from pydantic import BaseModel, Field, model_validator

from app.aplicacion.dtos.comun_dto import Correo, NombrePersona, Texto
from app.aplicacion.dtos.personas_rol_dto import EstudianteRespuesta


class PersonaNueva(BaseModel):
    nombre: NombrePersona
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
    nombre: NombrePersona
    idTipoDocumento: int = Field(gt=0)
    documento: Texto(20, minimo=5)
    telefono: Texto(20, minimo=7)
    email: Correo | None = None
    fecha_nacimiento: date
    idSede: int = Field(gt=0)
    # Acudiente opcional (uno como máximo)
    acudientes: list[AcudienteInscripcion] = Field(default_factory=list, max_length=1)
    # Matrícula opcional en un grupo de la misma sede. El valor no se envía: es el precio
    # único (VALOR_MATRICULA) y la matrícula queda pendiente de aprobación.
    idGrupo: int | None = Field(default=None, gt=0)
    fecha_matricula: date | None = None
    # Cuenta para el portal del estudiante: su usuario es el número de documento.
    # Con clave, la sede se la entrega en persona; sin clave, le llega un enlace al correo
    # para que la cree él mismo.
    crearCuenta: bool = False
    clave: str | None = Field(default=None, min_length=8, max_length=128)


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


class EditarAcudienteSolicitud(BaseModel):
    """Datos del acudiente que se editan desde la edición del estudiante (el documento no cambia)."""

    nombre: NombrePersona
    telefono: Texto(20, minimo=7)
    email: Correo | None = None
    idParentesco: int = Field(gt=0)
