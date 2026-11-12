from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.repositorios.repositorio_niveles import RepositorioNiveles


class GestionarNiveles(GestionarCatalogo):
    recurso = "nivel"
    mensaje_no_encontrado = "Nivel no encontrado"
    campos = ("nombre", "orden", "edadMin", "edadMax")
    repositorio: RepositorioNiveles

    def validar(self, datos, identificador=None):
        edad_min, edad_max = datos["edadMin"], datos["edadMax"]
        if edad_min is not None and edad_max is not None and edad_max <= edad_min:
            raise DatoInvalido("La edad máxima debe ser mayor que la edad mínima.")
        # CA_10_143: el nombre del nivel no se puede repetir
        if self.repositorio.nombre_existe(datos["nombre"], identificador):
            raise Conflicto("Ya existe un nivel con ese nombre.")
        if self.repositorio.orden_existe(datos["orden"], identificador):
            raise Conflicto("Ya existe un nivel con ese orden.")
