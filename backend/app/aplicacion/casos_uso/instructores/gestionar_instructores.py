from app.aplicacion.casos_uso.gestionar_persona_rol import CAMPOS_PERSONA, GestionarPersonaRol
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO
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

    def crear_cuenta(self, identificador: int, password_hash: str):
        """Crea el usuario de acceso del instructor. Inicia sesión con su documento."""
        instructor = self.obtener(identificador)
        if instructor["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El instructor está inactivo.")
        if not instructor["documento"]:
            raise DatoInvalido("El instructor no tiene documento para iniciar sesión.")
        if self.repositorio.tiene_cuenta(instructor["documento"]):
            raise Conflicto("El instructor ya tiene una cuenta de acceso.")
        id_rol = self.repositorio.id_rol_por_nombre("instructor")
        if not id_rol:
            raise DatoInvalido("No existe el rol 'instructor' en la tabla roles.")
        self.repositorio.crear_cuenta(instructor["documento"], password_hash, id_rol)
        return self.obtener(identificador)
