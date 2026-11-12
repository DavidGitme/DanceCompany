from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.repositorios.repositorio_talleres import RepositorioTalleres


class GestionarTalleres(GestionarCatalogo):
    recurso = "taller"
    mensaje_no_encontrado = "Taller no encontrado"
    campos = ("descripcion", "valor")
    repositorio: RepositorioTalleres
