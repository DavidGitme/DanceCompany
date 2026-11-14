from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto
from app.dominio.repositorios.repositorio_sedes import RepositorioSedes


class GestionarSedes(GestionarCatalogo):
    recurso = "sede"
    mensaje_no_encontrado = "Sede no encontrada"
    campos = ("nombre", "direccion")
    repositorio: RepositorioSedes

    def validar(self, datos, identificador=None):
        if self.repositorio.nombre_existe(datos["nombre"], identificador):
            raise Conflicto("Ya existe una sede con ese nombre.")
