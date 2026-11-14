from app.aplicacion.casos_uso.gestionar_con_estado_categoria import GestionarConEstadoPorCategoria
from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.reglas import NOTICIA_DISPONIBLE
from app.dominio.repositorios.repositorio_noticias import RepositorioNoticias


class GestionarNoticias(GestionarConEstadoPorCategoria):
    """Noticias del sitio. Nacen Disponible; Expirada las oculta de la landing.

    Las fechas se comparan con el reloj de la base de datos (ver RepositorioNoticias.ahora).
    """

    recurso = "noticia"
    mensaje_no_encontrado = "Noticia no encontrada"
    campos = (
        "titulo", "contenido", "imagen_url", "idTipoNoticia", "fecha_publicacion", "fecha_expiracion",
    )
    estado_inicial = NOTICIA_DISPONIBLE
    mensaje_estado_invalido = "El estado indicado no es un estado de noticia."
    repositorio: RepositorioNoticias

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def publicas(self, id_tipo: int | None, limite: int):
        return self.repositorio.publicas(id_tipo, limite, self.repositorio.ahora())

    def actualizar_expiradas(self):
        return {"actualizadas": self.repositorio.marcar_expiradas(self.repositorio.ahora())}

    def completar(self, datos):
        if datos.get("fecha_publicacion") is None:
            datos["fecha_publicacion"] = self.repositorio.ahora()
        return datos

    def validar(self, datos, identificador=None):
        # Se ajustan aquí porque este mismo diccionario es el que se guarda
        for campo in ("fecha_publicacion", "fecha_expiracion"):
            datos[campo] = self.repositorio.a_hora_local(datos[campo])

        if not self.repositorio.tipo_existe(datos["idTipoNoticia"]):
            raise DatoInvalido("El tipo de noticia no existe.")
        expiracion = datos["fecha_expiracion"]
        if expiracion is not None:
            if expiracion <= datos["fecha_publicacion"]:
                raise DatoInvalido("La fecha de expiración debe ser posterior a la de publicación.")
            if not identificador and expiracion <= self.repositorio.ahora():
                raise DatoInvalido("La fecha de expiración ya pasó.")

    def validar_cambio_estado(self, registro, nuevo_estado):
        expiracion = registro["fecha_expiracion"]
        if nuevo_estado == NOTICIA_DISPONIBLE and expiracion and expiracion <= self.repositorio.ahora():
            raise DatoInvalido(
                "La noticia ya expiró: amplíe la fecha de expiración antes de publicarla de nuevo."
            )
