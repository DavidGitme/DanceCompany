from fastapi import Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError

from app.dominio.excepciones.errores import (
    Conflicto,
    DemasiadosIntentos,
    ErrorDominio,
    NoAutenticado,
    NoAutorizado,
    NoEncontrado,
)


async def manejar_error_dominio(_: Request, error: ErrorDominio):
    estado = 400
    if isinstance(error, NoAutenticado):
        estado = 401
    elif isinstance(error, NoAutorizado):
        estado = 403
    elif isinstance(error, NoEncontrado):
        estado = 404
    elif isinstance(error, Conflicto):
        estado = 409
    elif isinstance(error, DemasiadosIntentos):
        estado = 429
    return JSONResponse(
        status_code=estado,
        content={
            "codigo": error.codigo,
            "mensaje": error.mensaje,
            "detalles": error.detalles,
        },
    )


async def manejar_error_validacion(_: Request, error: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={
            "codigo": "datos_invalidos",
            "mensaje": "Los datos enviados no son válidos.",
            "detalles": jsonable_encoder(error.errors()),
        },
    )


# Respaldo por si dos peticiones chocan con un UNIQUE o una FK al mismo tiempo
async def manejar_error_integridad(_: Request, error: IntegrityError):
    return JSONResponse(
        status_code=409,
        content={
            "codigo": "conflicto",
            "mensaje": "La operación choca con datos existentes o relacionados.",
            "detalles": None,
        },
    )
