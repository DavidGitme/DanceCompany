"""Catálogos con solo nombre: métodos de pago, tipos de convocatoria y tipos de noticia."""

from app.aplicacion.casos_uso.gestionar_catalogo_simple import GestionarCatalogoSimple


class GestionarMetodosPago(GestionarCatalogoSimple):
    recurso = "método de pago"
    mensaje_no_encontrado = "Método de pago no encontrado"
    mensaje_duplicado = "Ya existe un método de pago con ese nombre."
    mensaje_en_uso = "No se puede eliminar: hay pagos registrados con este método"


class GestionarTiposConvocatoria(GestionarCatalogoSimple):
    recurso = "tipo de convocatoria"
    mensaje_no_encontrado = "Tipo de convocatoria no encontrado"
    mensaje_duplicado = "Ya existe un tipo de convocatoria con ese nombre."
    mensaje_en_uso = "No se puede eliminar: hay convocatorias de este tipo"


class GestionarTiposNoticia(GestionarCatalogoSimple):
    recurso = "tipo de noticia"
    mensaje_no_encontrado = "Tipo de noticia no encontrado"
    mensaje_duplicado = "Ya existe un tipo de noticia con ese nombre."
    mensaje_en_uso = "No se puede eliminar: hay noticias de este tipo"
