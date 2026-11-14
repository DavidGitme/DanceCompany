from datetime import date

from app.aplicacion.casos_uso.gestionar_registro import GestionarRegistro
from app.aplicacion.casos_uso.pagos.pagador import (
    validar_estudiante_activo,
    validar_metodo,
    validar_pagador,
)
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_inscripciones_taller import (
    RepositorioInscripcionesTaller,
)


class GestionarInscripcionesTaller(GestionarRegistro):
    """Inscribir un estudiante a un taller registra también su pago (valor del taller).

    Al editar solo cambian la fecha y el método de pago. Eliminar anula la
    inscripción junto con su pago.
    """

    recurso = "inscripción"
    mensaje_no_encontrado = "Inscripción no encontrada"
    campos = ("fecha_inscripcion", "idMetodo")
    repositorio: RepositorioInscripcionesTaller

    def acudientes(self, id_estudiante: int):
        return self.repositorio.acudientes_de_estudiante(id_estudiante)

    def completar(self, datos):
        if datos.get("fecha_inscripcion") is None:
            datos["fecha_inscripcion"] = date.today()
        return datos

    def validar(self, datos, identificador=None):
        validar_metodo(self.repositorio, datos["idMetodo"])
        if datos["fecha_inscripcion"] > date.today():
            raise DatoInvalido("La fecha de inscripción no puede ser futura.")
        if identificador:
            return

        validar_estudiante_activo(self.repositorio, datos["idEstudiante"])
        taller = self.repositorio.obtener_taller(datos["idTaller"])
        if not taller or taller["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El taller no existe o está inactivo.")
        if self.repositorio.inscripcion_existe(datos["idEstudiante"], datos["idTaller"]):
            raise Conflicto("El estudiante ya está inscrito en ese taller.")
        validar_pagador(
            self.repositorio, datos["idEstudiante"], datos.get("idAcudiente"), datos["fecha_inscripcion"]
        )
        # El pago se toma del valor actual del taller
        datos["monto"] = taller["valor"] or 0
