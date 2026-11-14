"""Regla compartida por pagos e inscripciones a talleres: quién puede pagar."""

from datetime import date

from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.reglas import EDAD_ADULTO, ESTADO_ACTIVO, edad_en
from app.dominio.repositorios.repositorio_pagador import RepositorioPagador


def validar_pagador(
    repositorio: RepositorioPagador, id_estudiante: int, id_acudiente: int | None, fecha: date
) -> None:
    """Paga un acudiente responsable del estudiante, o el propio estudiante si es adulto.

    Con `id_acudiente` vacío el repositorio registra el pago a nombre del estudiante.
    """
    if id_acudiente is not None:
        if not repositorio.acudiente_activo(id_acudiente):
            raise DatoInvalido("El acudiente no existe o está inactivo.")
        if not repositorio.acudiente_responsable(id_acudiente, id_estudiante):
            raise DatoInvalido("El acudiente no está registrado como responsable de este estudiante.")
        return

    estudiante = repositorio.obtener_estudiante(id_estudiante)
    nacimiento = estudiante["fecha_nacimiento"] if estudiante else None
    if nacimiento is None or edad_en(nacimiento, fecha) < EDAD_ADULTO:
        raise DatoInvalido(
            "El estudiante es menor de edad o no tiene fecha de nacimiento: indique el acudiente que paga."
        )


def validar_estudiante_activo(repositorio: RepositorioPagador, id_estudiante: int) -> None:
    estudiante = repositorio.obtener_estudiante(id_estudiante)
    if not estudiante or estudiante["idEstado"] != ESTADO_ACTIVO:
        raise DatoInvalido("El estudiante no existe o está inactivo.")


def validar_metodo(repositorio: RepositorioPagador, id_metodo: int) -> None:
    if not repositorio.metodo_existe(id_metodo):
        raise DatoInvalido("El método de pago no existe.")
