from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoEncontrado
from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_grupos_competencia import RepositorioGruposCompetencia

MAX_INTEGRANTES = 60


class GestionarGruposCompetencia:
    """Crea el grupo con el que la academia compite en una convocatoria.

    Reglas:
    - Un grupo activo solo puede competir en una convocatoria a la vez (UNIQUE en la tabla).
    - Los integrantes son estudiantes con la postulación Aceptada en esa convocatoria
      y de la misma sede del grupo.
    """

    def __init__(self, repositorio: RepositorioGruposCompetencia):
        self.repositorio = repositorio

    def listar(self, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, identificador: int):
        registro = self.repositorio.obtener(identificador)
        if not registro:
            raise NoEncontrado("grupo de competencia", "Grupo de competencia no encontrado")
        return registro

    def candidatos(self, id_convocatoria: int, id_grupo: int):
        grupo = self._grupo_activo(id_grupo)
        return self.repositorio.aceptados(id_convocatoria, grupo["idSede"])

    def crear(self, datos: dict):
        grupo = self._grupo_activo(datos["idGrupo"])
        if self.repositorio.grupo_ya_compite(datos["idGrupo"]):
            raise Conflicto("Ese grupo ya está registrado como grupo de competencia.")
        estudiantes = self._integrantes(datos["idConvocatoria"], grupo["idSede"], datos["estudiantes"])
        identificador = self.repositorio.crear(datos["idGrupo"], datos["idConvocatoria"], estudiantes)
        return self.obtener(identificador)

    def actualizar(self, identificador: int, datos: dict):
        actual = self.obtener(identificador)
        convocatoria = datos.get("idConvocatoria") or actual["idConvocatoria"]
        estudiantes = datos.get("estudiantes")
        if estudiantes is None:
            estudiantes = [e["idEstudiante"] for e in actual["estudiantes"]]
        estudiantes = self._integrantes(convocatoria, actual["idSede"], estudiantes)
        self.repositorio.actualizar(identificador, convocatoria, estudiantes)
        return self.obtener(identificador)

    def eliminar(self, identificador: int):
        self.obtener(identificador)
        self.repositorio.eliminar(identificador)

    def _grupo_activo(self, id_grupo: int):
        grupo = self.repositorio.grupo(id_grupo)
        if not grupo or grupo["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El grupo no existe o está inactivo.")
        return grupo

    def _integrantes(self, id_convocatoria: int, sede: int, estudiantes: list[int]) -> list[int]:
        if not self.repositorio.convocatoria_existe(id_convocatoria):
            raise DatoInvalido("La convocatoria no existe.")
        unicos = list(dict.fromkeys(estudiantes))
        if len(unicos) != len(estudiantes):
            raise DatoInvalido("Un estudiante aparece más de una vez.")
        if len(unicos) > MAX_INTEGRANTES:
            raise DatoInvalido(f"Un grupo de competencia tiene máximo {MAX_INTEGRANTES} integrantes.")
        permitidos = {e["idEstudiante"] for e in self.repositorio.aceptados(id_convocatoria, sede)}
        if any(e not in permitidos for e in unicos):
            raise DatoInvalido(
                "Solo pueden integrar el grupo estudiantes de la sede con la postulación aceptada en la convocatoria."
            )
        return unicos
