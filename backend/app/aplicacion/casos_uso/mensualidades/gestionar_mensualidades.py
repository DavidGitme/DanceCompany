from datetime import date

from app.aplicacion.casos_uso.gestionar_con_estado_categoria import GestionarConEstadoPorCategoria
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO, MENSUALIDAD_PAGADA, MENSUALIDAD_PENDIENTE
from app.dominio.repositorios.repositorio_mensualidades import RepositorioMensualidades


class GestionarMensualidades(GestionarConEstadoPorCategoria):
    """Cobro mensual de una matrícula.

    Nace Pendiente. Queda Pagada automáticamente cuando los pagos cubren el valor
    (ver Pagos) y vuelve a Pendiente/Vencida si se anula un pago.
    """

    recurso = "mensualidad"
    mensaje_no_encontrado = "Mensualidad no encontrada"
    campos = ("idMatricula", "fecha_pago", "valor_pagar", "fecha_limite")
    estado_inicial = MENSUALIDAD_PENDIENTE
    mensaje_estado_invalido = "El estado indicado no es un estado de mensualidad."
    repositorio: RepositorioMensualidades

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def actualizar_vencidas(self, sede=None):
        return {"actualizadas": self.repositorio.marcar_vencidas(date.today(), sede)}

    def validar(self, datos, identificador=None):
        actual = self.obtener(identificador) if identificador else {}
        cambio_matricula = datos["idMatricula"] != actual.get("idMatricula")

        if cambio_matricula:
            matricula = self.repositorio.obtener_matricula(datos["idMatricula"])
            if not matricula or matricula["idEstado"] != ESTADO_ACTIVO:
                raise DatoInvalido("La matrícula no existe o no está activa.")
        if datos["fecha_limite"] < datos["fecha_pago"]:
            raise DatoInvalido("La fecha límite no puede ser anterior a la fecha de cobro.")

        pagado = actual.get("valorPagado") or 0
        if pagado and cambio_matricula:
            raise Conflicto("La mensualidad ya tiene pagos: no se puede cambiar de matrícula.")
        if datos["valor_pagar"] < pagado:
            raise DatoInvalido(f"El valor no puede ser menor a lo ya pagado ({pagado}).")

        if self.repositorio.existe_en_periodo(datos["idMatricula"], datos["fecha_pago"], identificador):
            raise Conflicto("La matrícula ya tiene una mensualidad para ese mes.")

    def validar_cambio_estado(self, registro, nuevo_estado):
        if nuevo_estado == MENSUALIDAD_PAGADA and registro["saldo"] > 0:
            raise DatoInvalido(
                "La mensualidad tiene saldo pendiente: registre el pago en Pagos y quedará Pagada."
            )
        if registro["estado"] == MENSUALIDAD_PAGADA and registro["saldo"] <= 0 and nuevo_estado != MENSUALIDAD_PAGADA:
            raise Conflicto("La mensualidad ya está pagada por completo.")
