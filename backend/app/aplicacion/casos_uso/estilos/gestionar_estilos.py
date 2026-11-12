from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto
from app.dominio.repositorios.repositorio_estilos import RepositorioEstilos


class GestionarEstilos(GestionarCatalogo):
    recurso = "estilo"
    mensaje_no_encontrado = "Estilo no encontrado"
    campos = ("nombre",)
    repositorio: RepositorioEstilos

    def validar(self, datos, identificador=None):
        # El repositorio compara sin mayúsculas ni tildes ("Breaking" = "bréaking")
        if self.repositorio.nombre_existe(datos["nombre"], identificador):
            raise Conflicto("Ya existe un estilo con ese nombre.")
