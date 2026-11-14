from app.aplicacion.casos_uso.gestionar_registro import GestionarRegistro
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import DIAS_SEMANA, ESTADO_ACTIVO, normalizar_dia
from app.dominio.repositorios.repositorio_horarios import RepositorioHorarios


def dia_valido(dia: str) -> str:
    normalizado = normalizar_dia(dia)
    if not normalizado:
        raise DatoInvalido(f"El día no es válido. Use: {', '.join(DIAS_SEMANA)}.")
    return normalizado


class GestionarHorarios(GestionarRegistro):
    """Bloques semanales de cada grupo. No tienen estado: se eliminan físicamente."""

    recurso = "horario"
    mensaje_no_encontrado = "Horario no encontrado"
    campos = ("idGrupo", "dia_semana", "hora_inicio", "hora_fin")
    repositorio: RepositorioHorarios

    def listar(self, buscar, pagina, tamano, filtros=None):
        filtros = dict(filtros or {})
        if filtros.get("dia"):
            filtros["dia"] = dia_valido(filtros["dia"])
        return super().listar(buscar, pagina, tamano, filtros)

    def normalizar(self, datos):
        return {**datos, "dia_semana": dia_valido(datos["dia_semana"])}

    def validar(self, datos, identificador=None):
        actual = self.obtener(identificador) if identificador else {}
        inicio, fin, dia = datos["hora_inicio"], datos["hora_fin"], datos["dia_semana"]
        if fin <= inicio:
            raise DatoInvalido("La hora de fin debe ser posterior a la hora de inicio.")

        grupo = self.repositorio.obtener_grupo(datos["idGrupo"])
        cambio_grupo = datos["idGrupo"] != actual.get("idGrupo")
        if not grupo or (cambio_grupo and grupo["idEstado"] != ESTADO_ACTIVO):
            raise DatoInvalido("El grupo no existe o está inactivo.")

        if self.repositorio.cruce_en_grupo(datos["idGrupo"], dia, inicio, fin, identificador):
            raise Conflicto(f"El grupo ya tiene una clase el {dia} que se cruza con ese horario.")
        cruce = self.repositorio.cruce_en_aula(
            grupo["idAula"], datos["idGrupo"], dia, inicio, fin, identificador
        )
        if cruce:
            raise Conflicto(
                f"El aula ya está ocupada el {dia} de {cruce['hora_inicio']:%H:%M} a "
                f"{cruce['hora_fin']:%H:%M} por el grupo '{cruce['grupo']}'."
            )
