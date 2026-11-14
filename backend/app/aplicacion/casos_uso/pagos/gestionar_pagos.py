from datetime import date

from app.aplicacion.casos_uso.gestionar_registro import GestionarRegistro
from app.aplicacion.casos_uso.pagos.pagador import validar_metodo, validar_pagador
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.repositorios.repositorio_pagos import RepositorioPagos


class GestionarPagos(GestionarRegistro):
    """Pago de una mensualidad o de una matrícula (los talleres se pagan al inscribirse).

    Se permiten abonos: el monto no puede superar el saldo pendiente. Al editar
    solo cambian la fecha y el método. Eliminar anula el pago y recalcula el
    estado de la mensualidad.
    """

    recurso = "pago"
    mensaje_no_encontrado = "Pago no encontrado"
    campos = ("fecha_pago", "idMetodo")
    repositorio: RepositorioPagos

    def acudientes(self, id_estudiante: int):
        return self.repositorio.acudientes_de_estudiante(id_estudiante)

    def completar(self, datos):
        if datos.get("fecha_pago") is None:
            datos["fecha_pago"] = date.today()
        return datos

    def validar(self, datos, identificador=None):
        validar_metodo(self.repositorio, datos["idMetodo"])
        if datos["fecha_pago"] > date.today():
            raise DatoInvalido("La fecha de pago no puede ser futura.")
        if identificador:
            return

        if (datos.get("idMensualidad") is None) == (datos.get("idMatricula") is None):
            raise DatoInvalido("Indique la mensualidad o la matrícula que se paga (solo una).")
        if datos.get("idMensualidad") is not None:
            obligacion = self.repositorio.obtener_mensualidad(datos["idMensualidad"])
            nombre = "La mensualidad"
        else:
            obligacion = self.repositorio.obtener_matricula(datos["idMatricula"])
            nombre = "La matrícula"
        if not obligacion:
            raise DatoInvalido(f"{nombre} no existe.")

        saldo = obligacion["saldo"]
        if saldo <= 0:
            raise Conflicto(f"{nombre} ya está pagada.")
        if datos.get("monto") is None:
            datos["monto"] = saldo
        elif datos["monto"] > saldo:
            raise DatoInvalido(f"El monto supera el saldo pendiente ({saldo}).")

        validar_pagador(
            self.repositorio, obligacion["idEstudiante"], datos.get("idAcudiente"), datos["fecha_pago"]
        )
        datos["idEstudiante"] = obligacion["idEstudiante"]

    def validar_eliminacion(self, registro):
        if registro["tipo"] == "taller":
            raise Conflicto(
                "Este pago es de una inscripción a taller: anúlelo desde inscripciones a talleres."
            )
