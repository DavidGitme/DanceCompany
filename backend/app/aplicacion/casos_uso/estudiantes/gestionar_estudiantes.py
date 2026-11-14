from app.aplicacion.casos_uso.gestionar_persona_rol import CAMPOS_PERSONA, GestionarPersonaRol
from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.repositorios.repositorio_estudiantes import RepositorioEstudiantes


class GestionarEstudiantes(GestionarPersonaRol):
    recurso = "estudiante"
    mensaje_no_encontrado = "Estudiante no encontrado"
    campos = (*CAMPOS_PERSONA, "idSede")
    repositorio: RepositorioEstudiantes

    def listar(self, estado, buscar, pagina, tamano, sede=None, grupo=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, sede, grupo)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def validar(self, datos, identificador=None):
        self.validar_persona(datos, identificador)
        # Solo se revisa la sede si es nueva o cambió (una sede inactivada no bloquea otras ediciones)
        sede_actual = self.obtener(identificador)["idSede"] if identificador else None
        if datos["idSede"] != sede_actual and not self.repositorio.sedes_activas([datos["idSede"]]):
            raise DatoInvalido("La sede no existe o está inactiva.")
