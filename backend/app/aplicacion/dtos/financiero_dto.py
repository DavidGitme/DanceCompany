"""DTO de mensualidades, pagos y métodos de pago."""

from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, model_validator

from app.aplicacion.dtos.comun_dto import Texto

DINERO = {"max_digits": 10, "decimal_places": 2}


# ---------- Métodos de pago ----------
class MetodoPagoCreateDto(BaseModel):
    nombre: Texto(30)


class MetodoPagoUpdateDto(BaseModel):
    nombre: Texto(30) | None = None


class MetodoPagoRespuesta(BaseModel):
    idMetodo: int
    nombre: str
    registrosAsociados: int


class MetodoPagoOpcion(BaseModel):
    idMetodo: int
    nombre: str


# ---------- Mensualidades ----------
class MensualidadCreateDto(BaseModel):
    idMatricula: int = Field(gt=0)
    fecha_pago: date = Field(description="Fecha de cobro: inicio del periodo que se cobra")
    valor_pagar: Decimal = Field(gt=0, **DINERO)
    fecha_limite: date


class MensualidadUpdateDto(BaseModel):
    idMatricula: int | None = Field(default=None, gt=0)
    fecha_pago: date | None = None
    valor_pagar: Decimal | None = Field(default=None, gt=0, **DINERO)
    fecha_limite: date | None = None


class MensualidadRespuesta(BaseModel):
    idMensualidad: int
    idMatricula: int
    idEstudiante: int
    estudiante: str
    grupo: str
    periodo: str
    fecha_pago: date
    valor_pagar: Decimal
    fecha_limite: date
    valorPagado: Decimal
    saldo: Decimal
    idEstado: int
    estado: str


class MensualidadOpcion(BaseModel):
    idMensualidad: int
    idMatricula: int
    estudiante: str
    periodo: str
    saldo: Decimal


class ActualizacionMasivaRespuesta(BaseModel):
    actualizadas: int


# ---------- Pagos ----------
class PagoCreateDto(BaseModel):
    idMensualidad: int | None = Field(default=None, gt=0)
    idMatricula: int | None = Field(default=None, gt=0)
    monto: Decimal | None = Field(
        default=None, gt=0, description="Por defecto, todo el saldo pendiente", **DINERO
    )
    fecha_pago: date | None = Field(default=None, description="Por defecto, hoy")
    idMetodo: int = Field(gt=0)
    idAcudiente: int | None = Field(
        default=None, gt=0, description="Vacío = paga el propio estudiante (debe ser mayor de edad)"
    )

    @model_validator(mode="after")
    def una_sola_obligacion(self):
        if (self.idMensualidad is None) == (self.idMatricula is None):
            raise ValueError(
                "Indique idMensualidad o idMatricula (solo uno). "
                "Los talleres se pagan desde inscripciones a talleres."
            )
        return self


class PagoUpdateDto(BaseModel):
    fecha_pago: date | None = None
    idMetodo: int | None = Field(default=None, gt=0)


class PagoRespuesta(BaseModel):
    idPago: int
    tipo: Literal["mensualidad", "matricula", "taller"]
    concepto: str
    monto: Decimal
    fecha_pago: date
    idAcudiente: int
    pagador: str
    idMetodo: int
    metodo: str
    idMensualidad: int | None
    idMatricula: int | None
    idEstudiante: int | None
    estudiante: str | None


class AcudienteOpcion(BaseModel):
    idAcudiente: int
    nombre: str
    documento: str
    parentesco: str
