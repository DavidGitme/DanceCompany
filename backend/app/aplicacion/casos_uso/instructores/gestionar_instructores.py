from app.aplicacion.casos_uso.gestionar_persona_rol import CAMPOS_PERSONA, GestionarPersonaRol
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.repositorios.repositorio_instructores import RepositorioInstructores


class GestionarInstructores(GestionarPersonaRol):
    recurso = "instructor"
    mensaje_no_encontrado = "Instructor no encontrado"
    campos = (*CAMPOS_PERSONA, "descripcion", "sedes")
    repositorio: RepositorioInstructores

    def listar(self, estado, buscar, pagina, tamano, sede=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, sede)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def valores_actuales(self, registro):
        # El detalle trae las sedes como objetos; la edición las recibe como ids
        return {**registro, "sedes": [sede["idSede"] for sede in registro["sedes"]]}

    def validar(self, datos, identificador=None):
        self.validar_persona(datos, identificador)
        sedes = set(datos["sedes"])
        if not sedes:
            raise DatoInvalido("El instructor debe pertenecer al menos a una sede.")
        actuales = set(self.valores_actuales(self.obtener(identificador))["sedes"]) if identificador else set()
        nuevas = sedes - actuales
        if nuevas - self.repositorio.sedes_activas(list(nuevas)):
            raise DatoInvalido("Alguna de las sedes no existe o está inactiva.")
        if identificador:
            # No se puede quitar una sede donde todavía dicta grupos activos
            quitadas = self.repositorio.sedes_con_grupos_activos(identificador) - sedes
            if quitadas:
                raise Conflicto("El instructor tiene grupos activos en una sede que se intenta quitar.")
