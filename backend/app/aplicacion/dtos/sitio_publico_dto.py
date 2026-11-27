"""DTO del sitio público (bd/07_sitio_publico.sql) y de sus módulos del panel."""

from datetime import date, datetime, time
from decimal import Decimal

from pydantic import BaseModel, Field

from app.aplicacion.dtos.comun_dto import Correo, NombrePersona, Texto


class PlanRespuesta(BaseModel):
    idPlan: int
    nombre: str
    meses: int
    valor: Decimal
    descripcion: str | None = None
    idEstado: int
    estado: str


class PlanSolicitud(BaseModel):
    nombre: Texto(30, minimo=2)
    meses: int = Field(gt=0, le=60)
    valor: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    descripcion: Texto(150) | None = None


class SedePublica(BaseModel):
    idSede: int
    nombre: str
    direccion: str | None = None
    horaApertura: str | None = None
    horaCierre: str | None = None


class TipoDocumentoPublico(BaseModel):
    id: int
    nombre: str


class EstiloPublico(BaseModel):
    idEstilo: int
    nombre: str


class FranjaOcupada(BaseModel):
    horaInicio: str
    horaFin: str
    motivo: str


class AulaDisponibilidad(BaseModel):
    idAula: int
    nombre: str
    capacidad: int
    ocupado: list[FranjaOcupada]


class DisponibilidadRespuesta(BaseModel):
    idSede: int
    sede: str
    fecha: date
    dia: str
    abierta: bool
    horaApertura: str | None = None
    horaCierre: str | None = None
    aulas: list[AulaDisponibilidad]


class SolicitudEspacioSolicitud(BaseModel):
    nombre: NombrePersona
    email: Correo
    telefono: Texto(20, minimo=7)
    idAula: int = Field(gt=0)
    fecha: date
    hora_inicio: time
    hora_fin: time
    personas: int = Field(gt=0, le=500)
    mensaje: Texto(300) | None = None


class SolicitudCreadaRespuesta(BaseModel):
    idSolicitud: int
    estado: str
    correoEnviado: bool


class SolicitudRespuesta(BaseModel):
    idSolicitud: int
    nombre: str
    email: str
    telefono: str
    idAula: int
    idSede: int
    sede: str
    capacidad: int
    fecha: date
    horaInicio: str
    horaFin: str
    personas: int
    mensaje: str | None = None
    creado: datetime
    idEstado: int
    estado: str


class PeriodoSolicitud(BaseModel):
    nombre: Texto(50, minimo=3)
    fecha_inicio: date
    fecha_fin: date


class PeriodoRespuesta(BaseModel):
    idPeriodo: int
    nombre: str
    fecha_inicio: date
    fecha_fin: date
    idEstado: int
    estado: str
    vigencia: str
    preinscripciones: int


class PeriodoPublico(BaseModel):
    idPeriodo: int
    nombre: str
    fecha_inicio: date
    fecha_fin: date


class EstadoPreinscripcionPublico(BaseModel):
    abierta: bool
    periodo: PeriodoPublico | None = None
    terminosVersion: str


class PreinscripcionSolicitud(BaseModel):
    nombre: NombrePersona
    idTipoDocumento: int = Field(gt=0)
    documento: Texto(20, minimo=5)
    fecha_nacimiento: date
    telefono: Texto(20, minimo=7)
    email: Correo
    idSede: int = Field(gt=0)
    idEstilo: int | None = Field(default=None, gt=0)
    idPlan: int | None = Field(default=None, gt=0)
    nombre_acudiente: Texto(100) | None = None
    telefono_acudiente: Texto(20) | None = None
    aceptaTerminos: bool
    terminosVersion: Texto(10)


class PreinscripcionCreadaRespuesta(BaseModel):
    idPreinscripcion: int
    estado: str
    correoEnviado: bool
    email: str


class ConfirmarPreinscripcionSolicitud(BaseModel):
    token: Texto(200, minimo=20)


class MensajeRespuesta(BaseModel):
    mensaje: str


class PreinscripcionRespuesta(BaseModel):
    idPreinscripcion: int
    idPeriodo: int
    periodo: str
    nombre: str
    idTipoDocumento: int
    tipoDocumento: str
    documento: str
    fecha_nacimiento: date
    telefono: str
    email: str
    idSede: int
    sede: str
    idEstilo: int | None = None
    estilo: str | None = None
    idPlan: int | None = None
    plan: str | None = None
    nombreAcudiente: str | None = None
    telefonoAcudiente: str | None = None
    fechaConfirmacion: datetime | None = None
    creado: datetime
    idEstado: int
    estado: str


class EstadoOpcion(BaseModel):
    idEstado: int
    nombre: str
