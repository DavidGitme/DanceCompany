from datetime import date
from decimal import Decimal

from pydantic import BaseModel


class CobroMes(BaseModel):
    esperado: Decimal
    recaudado: Decimal
    pendiente: Decimal
    cantidad: int
    pagadas: int


class RecibidoMes(BaseModel):
    total: Decimal
    mensualidad: Decimal
    matricula: Decimal
    taller: Decimal
    cantidad: int


class MensualidadVencida(BaseModel):
    idMensualidad: int
    estudiante: str
    grupo: str
    periodo: str
    fecha_limite: date
    saldo: Decimal
    estado: str


class Vencidas(BaseModel):
    cantidad: int
    valor: Decimal
    estudiantes: int
    detalle: list[MensualidadVencida] = []


class EstudiantesPagos(BaseModel):
    matriculados: int
    alDia: int
    conVencidas: int


class PuntoSerie(BaseModel):
    periodo: str
    esperado: Decimal
    recaudado: Decimal
    pendiente: Decimal
    recibido: Decimal


class ResumenFinancieroRespuesta(BaseModel):
    periodo: str
    corte: date
    mensualidades: CobroMes
    recibido: RecibidoMes
    vencidas: Vencidas
    estudiantes: EstudiantesPagos
    serie: list[PuntoSerie]
