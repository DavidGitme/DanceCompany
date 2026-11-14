"""DTO del portal del estudiante (lo que ve el estudiante al iniciar sesión)."""

from datetime import date
from decimal import Decimal

from pydantic import BaseModel, EmailStr, Field

from app.aplicacion.dtos.catalogos_dto import TallerOpcion
from app.aplicacion.dtos.convocatorias_dto import ConvocatoriaOpcion, PostulacionRespuesta
from app.aplicacion.dtos.financiero_dto import AcudienteOpcion, MensualidadRespuesta, PagoRespuesta
from app.aplicacion.dtos.matriculas_dto import InscripcionTallerRespuesta


class InicioSesionEstudianteSolicitud(BaseModel):
    correo: EmailStr
    clave: str = Field(min_length=1, max_length=128)


class PerfilEstudiante(BaseModel):
    idEstudiante: int
    nombre: str
    tipoDocumento: str
    documento: str
    email: str | None
    telefono: str | None
    fecha_nacimiento: date | None
    edad: int | None
    sede: str
    direccionSede: str | None
    estado: str
    acudientes: list[AcudienteOpcion]


class BloqueHorario(BaseModel):
    dia_semana: str
    hora_inicio: str
    hora_fin: str


class ClaseEstudiante(BaseModel):
    idMatricula: int
    idGrupo: int
    grupo: str
    nivel: str
    estilo: str
    instructor: str
    sede: str
    idAula: int
    fecha_matricula: date
    estado: str
    horarios: list[BloqueHorario]


class ClasesEstudiante(BaseModel):
    vigentes: list[ClaseEstudiante]
    historial: list[ClaseEstudiante]


class MatriculaSaldo(BaseModel):
    idMatricula: int
    grupo: str
    valor_matricula: Decimal
    valorPagado: Decimal
    saldo: Decimal
    estado: str


class ResumenFinanciero(BaseModel):
    saldoPendiente: Decimal
    totalPagado: Decimal
    mensualidadesPendientes: int
    proximoVencimiento: date | None


class FinanzasEstudiante(BaseModel):
    resumen: ResumenFinanciero
    matriculas: list[MatriculaSaldo]
    mensualidades: list[MensualidadRespuesta]
    pagos: list[PagoRespuesta]


class TalleresEstudiante(BaseModel):
    inscritos: list[InscripcionTallerRespuesta]
    disponibles: list[TallerOpcion]


class ConvocatoriaAbierta(ConvocatoriaOpcion):
    descripcion: str | None
    fecha_inicio: date
    yaPostulado: bool


class ConvocatoriasEstudiante(BaseModel):
    abiertas: list[ConvocatoriaAbierta]
    postulaciones: list[PostulacionRespuesta]
