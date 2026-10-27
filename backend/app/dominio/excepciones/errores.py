class ErrorDominio(Exception):
    def __init__(self, codigo: str, mensaje: str, detalles: object | None = None):
        super().__init__(mensaje)
        self.codigo = codigo
        self.mensaje = mensaje
        self.detalles = detalles


class NoAutenticado(ErrorDominio):
    def __init__(self, mensaje: str = "La sesión no es válida o ha vencido."):
        super().__init__("no_autenticado", mensaje)


class NoAutorizado(ErrorDominio):
    def __init__(self, mensaje: str = "No tienes permiso para realizar esta acción."):
        super().__init__("no_autorizado", mensaje)


class NoEncontrado(ErrorDominio):
    def __init__(self, recurso: str):
        super().__init__("no_encontrado", f"No se encontró el recurso {recurso}.")


class Conflicto(ErrorDominio):
    def __init__(self, mensaje: str):
        super().__init__("conflicto", mensaje)


class DemasiadosIntentos(ErrorDominio):
    def __init__(self):
        super().__init__(
            "demasiados_intentos",
            "Demasiados intentos. Espera un minuto antes de volver a intentar.",
        )
