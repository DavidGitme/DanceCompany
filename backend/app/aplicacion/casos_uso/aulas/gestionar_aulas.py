from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.repositorios.repositorio_aulas import RepositorioAulas


class GestionarAulas(GestionarCatalogo):
    recurso = "aula"
    mensaje_no_encontrado = "Aula no encontrada"
    campos = ("capacidad", "idSede")
    repositorio: RepositorioAulas

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def disponibles(self, id_sede: int | None = None):
        return self.repositorio.disponibles(id_sede)

    def validar(self, datos, identificador=None):
        actual = self.obtener(identificador) if identificador else {}
        cambio_sede = datos["idSede"] != actual.get("idSede")

        # Solo se revisa la sede si es nueva o cambió (una sede inactivada no bloquea otras ediciones)
        if cambio_sede and not self.repositorio.sede_activa(datos["idSede"]):
            raise DatoInvalido("La sede no existe o está inactiva.")
        if not identificador:
            return

        # Un grupo siempre usa un aula de su misma sede
        if cambio_sede and self.repositorio.cantidad_grupos(identificador):
            raise Conflicto("No se puede cambiar la sede: el aula ya está asignada a grupos.")
        maxima = self.repositorio.capacidad_maxima_grupos_activos(identificador)
        if datos["capacidad"] < maxima:
            raise DatoInvalido(
                f"Hay un grupo activo con capacidad {maxima}: el aula no puede tener menos."
            )
