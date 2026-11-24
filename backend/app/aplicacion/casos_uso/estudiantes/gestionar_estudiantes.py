from datetime import date

from app.aplicacion.casos_uso.gestionar_persona_rol import CAMPOS_PERSONA, GestionarPersonaRol
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import edad_en, error_tipo_para_edad
from app.dominio.repositorios.repositorio_estudiantes import RepositorioEstudiantes


class GestionarEstudiantes(GestionarPersonaRol):
    """Datos del estudiante. Los nuevos entran por la inscripción presencial (InscribirEstudiante)."""

    recurso = "estudiante"
    mensaje_no_encontrado = "Estudiante no encontrado"
    campos = (*CAMPOS_PERSONA, "idSede")
    repositorio: RepositorioEstudiantes

    def listar(self, estado, buscar, pagina, tamano, sede=None, grupo=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, sede, grupo)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def validar(self, datos, identificador=None):
        tipo = self.validar_persona(datos, identificador)
        # Teléfono y fecha de nacimiento son obligatorios: la matrícula valida la edad
        # contra el nivel y la academia necesita un contacto
        if not datos.get("telefono"):
            raise DatoInvalido("El teléfono del estudiante es obligatorio.")
        if not datos.get("fecha_nacimiento"):
            raise DatoInvalido("La fecha de nacimiento del estudiante es obligatoria.")
        error = error_tipo_para_edad(tipo, edad_en(datos["fecha_nacimiento"], date.today()))
        if error:
            raise DatoInvalido(error)

        # Solo se revisa la sede si es nueva o cambió (una sede inactivada no bloquea otras ediciones)
        sede_actual = self.obtener(identificador)["idSede"] if identificador else None
        if datos["idSede"] != sede_actual:
            if not self.repositorio.sedes_activas([datos["idSede"]]):
                raise DatoInvalido("La sede no existe o está inactiva.")
            # Traslado: primero se inactiva la matrícula vigente (queda en el historial)
            if identificador and self.repositorio.tiene_matricula_activa(identificador):
                raise Conflicto(
                    "Para trasladar al estudiante de sede, primero inactiva su matrícula activa."
                )
