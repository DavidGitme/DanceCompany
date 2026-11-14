from app.aplicacion.casos_uso.gestionar_registro import GestionarRegistro
from app.dominio.excepciones.errores import Conflicto
from app.dominio.repositorios.repositorio_catalogo_simple import RepositorioCatalogoSimple


class GestionarCatalogoSimple(GestionarRegistro):
    """Catálogo con un único campo `nombre` y sin estado.

    Solo se puede eliminar mientras ningún registro lo use (`registrosAsociados`).
    """

    campos = ("nombre",)
    mensaje_duplicado = "Ya existe un registro con ese nombre."
    mensaje_en_uso = "No se puede eliminar: hay registros que lo usan."
    repositorio: RepositorioCatalogoSimple

    def disponibles(self):
        return self.repositorio.disponibles()

    def validar(self, datos, identificador=None):
        if self.repositorio.nombre_existe(datos["nombre"], identificador):
            raise Conflicto(self.mensaje_duplicado)

    def validar_eliminacion(self, registro):
        if registro["registrosAsociados"]:
            raise Conflicto(f"{self.mensaje_en_uso} ({registro['registrosAsociados']}).")
