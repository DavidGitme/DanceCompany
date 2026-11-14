from datetime import date

from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO, edad_en
from app.dominio.repositorios.repositorio_matriculas import RepositorioMatriculas


class GestionarMatriculas(GestionarCatalogo):
    """Matrícula de un estudiante en un grupo.

    No se borra: `idEstado` Inactivo conserva las matrículas anteriores (cambio de
    nivel o de grupo) junto con sus mensualidades y pagos.
    """

    recurso = "matrícula"
    mensaje_no_encontrado = "Matrícula no encontrada"
    campos = ("idEstudiante", "idGrupo", "fecha_matricula", "valor_matricula")
    repositorio: RepositorioMatriculas

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def crear(self, datos):
        if datos.get("fecha_matricula") is None:
            datos = {**datos, "fecha_matricula": date.today()}
        return super().crear(datos)

    def cambiar_estado(self, identificador, id_estado):
        actual = self.obtener(identificador)
        if id_estado == ESTADO_ACTIVO and actual["idEstado"] != ESTADO_ACTIVO:
            # Reactivar ocupa otra vez un cupo del grupo
            grupo = self.repositorio.obtener_grupo(actual["idGrupo"])
            if grupo["idEstado"] != ESTADO_ACTIVO:
                raise DatoInvalido("El grupo está inactivo: no se puede reactivar la matrícula.")
            self._validar_cupo(actual["idEstudiante"], grupo, identificador)
        return super().cambiar_estado(identificador, id_estado)

    def validar(self, datos, identificador=None):
        actual = self.obtener(identificador) if identificador else {}

        def cambio(campo):
            return datos[campo] != actual.get(campo)

        estudiante = self.repositorio.obtener_estudiante(datos["idEstudiante"])
        if not estudiante or (cambio("idEstudiante") and estudiante["idEstado"] != ESTADO_ACTIVO):
            raise DatoInvalido("El estudiante no existe o está inactivo.")
        if identificador and cambio("idEstudiante") and self.repositorio.tiene_movimientos(identificador):
            raise Conflicto(
                "No se puede cambiar el estudiante: la matrícula ya tiene mensualidades o pagos."
            )

        grupo = self.repositorio.obtener_grupo(datos["idGrupo"])
        if not grupo or (cambio("idGrupo") and grupo["idEstado"] != ESTADO_ACTIVO):
            raise DatoInvalido("El grupo no existe o está inactivo.")

        if not (cambio("idEstudiante") or cambio("idGrupo") or cambio("fecha_matricula")):
            return
        if estudiante["idSede"] != grupo["idSede"]:
            raise DatoInvalido("El grupo pertenece a una sede distinta a la del estudiante.")
        self._validar_edad(estudiante, grupo, datos["fecha_matricula"])

        # Una matrícula inactiva no ocupa cupo
        vigente = not identificador or actual["idEstado"] == ESTADO_ACTIVO
        if vigente and (cambio("idEstudiante") or cambio("idGrupo")):
            self._validar_cupo(datos["idEstudiante"], grupo, identificador)

    def _validar_cupo(self, id_estudiante, grupo, identificador):
        if self.repositorio.matricula_activa_en_grupo(id_estudiante, grupo["idGrupo"], identificador):
            raise Conflicto("El estudiante ya tiene una matrícula activa en ese grupo.")
        if grupo["matriculasActivas"] >= grupo["capacidad"]:
            raise Conflicto(f"El grupo no tiene cupos disponibles (capacidad {grupo['capacidad']}).")

    @staticmethod
    def _validar_edad(estudiante, grupo, fecha_matricula):
        nacimiento = estudiante["fecha_nacimiento"]
        if nacimiento is None:
            return
        edad = edad_en(nacimiento, fecha_matricula)
        minima, maxima = grupo["edadMin"], grupo["edadMax"]
        if (minima is not None and edad < minima) or (maxima is not None and edad > maxima):
            raise DatoInvalido(
                f"La edad del estudiante ({edad} años) no está en el rango del nivel "
                f"({minima if minima is not None else '-'} a {maxima if maxima is not None else '-'})."
            )
