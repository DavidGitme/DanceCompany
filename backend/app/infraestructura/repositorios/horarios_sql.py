from sqlalchemy import text

from app.dominio.reglas import DIAS_SEMANA, ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_horarios import RepositorioHorarios
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes

COLUMNAS = """
    h.idHorario AS "idHorario", h.idGrupo AS "idGrupo", g.nombre AS grupo,
    g.idSede AS "idSede", s.nombre AS sede, g.idAula AS "idAula",
    g.idInstructor AS "idInstructor", p.nombre AS instructor,
    h.dia_semana, h.hora_inicio, h.hora_fin
"""
ORIGEN = """
    FROM horario h
    JOIN grupo g ON g.idGrupo = h.idGrupo
    JOIN sede s ON s.idSede = g.idSede
    JOIN instructor i ON i.idInstructor = g.idInstructor
    JOIN persona p ON p.idPersona = i.idPersona
"""
# Lunes primero, domingo al final (los días son constantes del código)
ORDEN_DIA = "array_position(ARRAY[{}]::text[], h.dia_semana::text)".format(
    ", ".join(f"'{dia}'" for dia in DIAS_SEMANA)
)

# Filtros que acepta el listado: parámetro -> columna
FILTROS = {
    "grupo": "h.idGrupo",
    "sede": "g.idSede",
    "instructor": "g.idInstructor",
    "aula": "g.idAula",
    "dia": "h.dia_semana",
}

# Dos bloques se cruzan si uno empieza antes de que el otro termine
CRUCE = "h.dia_semana = :dia AND h.hora_inicio < :fin AND h.hora_fin > :inicio AND h.idHorario <> :excluir"


class RepositorioHorariosSql(RepositorioBaseSql, RepositorioHorarios):
    def listar(self, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if buscar:
            condiciones.append(f"{sin_tildes('g.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros or {}).items():
            if valor is not None:
                condiciones.append(f"{FILTROS[nombre]} = :{nombre}")
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            f"{ORDEN_DIA}, h.hora_inicio, g.nombre", pagina, tamano,
        )

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE h.idHorario = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_grupo(self, id_grupo):
        fila = self.sesion.execute(
            text(
                'SELECT idGrupo AS "idGrupo", nombre, idAula AS "idAula", idEstado AS "idEstado" '
                "FROM grupo WHERE idGrupo = :id"
            ),
            {"id": id_grupo},
        ).mappings().first()
        return dict(fila) if fila else None

    def cruce_en_grupo(self, id_grupo, dia, inicio, fin, excluir_id):
        return self.sesion.execute(
            text(f"SELECT 1 FROM horario h WHERE h.idGrupo = :grupo AND {CRUCE}"),
            {"grupo": id_grupo, "dia": dia, "inicio": inicio, "fin": fin, "excluir": excluir_id or 0},
        ).first() is not None

    def cruce_en_aula(self, id_aula, id_grupo, dia, inicio, fin, excluir_id):
        fila = self.sesion.execute(
            text(
                "SELECT g.nombre AS grupo, h.hora_inicio, h.hora_fin FROM horario h "
                "JOIN grupo g ON g.idGrupo = h.idGrupo "
                f"WHERE g.idAula = :aula AND g.idGrupo <> :grupo AND g.idEstado = :activo AND {CRUCE} "
                "ORDER BY h.hora_inicio LIMIT 1"
            ),
            {
                "aula": id_aula, "grupo": id_grupo, "activo": ESTADO_ACTIVO,
                "dia": dia, "inicio": inicio, "fin": fin, "excluir": excluir_id or 0,
            },
        ).mappings().first()
        return dict(fila) if fila else None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO horario (idGrupo, dia_semana, hora_inicio, hora_fin) "
            "VALUES (:idGrupo, :dia_semana, :hora_inicio, :hora_fin) RETURNING idHorario",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE horario SET idGrupo = :idGrupo, dia_semana = :dia_semana, "
            "hora_inicio = :hora_inicio, hora_fin = :hora_fin WHERE idHorario = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def eliminar(self, identificador):
        self._guardar("DELETE FROM horario WHERE idHorario = :id", {"id": identificador})
