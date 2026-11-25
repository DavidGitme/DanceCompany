from sqlalchemy import text

from app.dominio.reglas import CATEGORIA_POSTULACION, ESTADO_ACTIVO, POSTULACION_ACEPTADO
from app.dominio.repositorios.repositorio_grupos_competencia import RepositorioGruposCompetencia
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.convocatorias_sql import VIGENCIA

COLUMNAS = f"""
    gc.idgrupocompe AS "idGrupoCompetencia", g.idGrupo AS "idGrupo", g.nombre AS grupo,
    g.idSede AS "idSede", s.nombre AS sede,
    c.idConvocatoria AS "idConvocatoria", c.nombre AS convocatoria, {VIGENCIA} AS vigencia,
    (SELECT COUNT(*) FROM grupo_competencia_estudiante gce
      WHERE gce.idgrupocompe = gc.idgrupocompe) AS integrantes
"""
ORIGEN = """
    FROM grupo_competencia gc
    JOIN grupo g ON g.idGrupo = gc.idGrupo
    JOIN sede s ON s.idSede = g.idSede
    JOIN convocatoria c ON c.idConvocatoria = gc.idConvocatoria
"""


class RepositorioGruposCompetenciaSql(RepositorioBaseSql, RepositorioGruposCompetencia):
    def listar(self, buscar, pagina, tamano, filtros):
        condiciones, parametros = [], {}
        if buscar:
            condiciones.append(
                f"({sin_tildes('g.nombre')} LIKE {sin_tildes(':buscar')} "
                f"OR {sin_tildes('c.nombre')} LIKE {sin_tildes(':buscar')})"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        if filtros.get("convocatoria") is not None:
            condiciones.append("gc.idConvocatoria = :convocatoria")
            parametros["convocatoria"] = filtros["convocatoria"]
        if filtros.get("sede") is not None:
            condiciones.append("g.idSede = :sede")
            parametros["sede"] = filtros["sede"]
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            "c.fecha_inicio DESC, g.nombre", pagina, tamano,
        )

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE gc.idgrupocompe = :id"), {"id": identificador}
        ).mappings().first()
        if not fila:
            return None
        registro = dict(fila)
        registro["estudiantes"] = [
            dict(e)
            for e in self.sesion.execute(
                text(
                    'SELECT e.idEstudiante AS "idEstudiante", p.nombre, p.documento '
                    "FROM grupo_competencia_estudiante gce "
                    "JOIN estudiante e ON e.idEstudiante = gce.idEstudiante "
                    "JOIN persona p ON p.idPersona = e.idPersona "
                    "WHERE gce.idgrupocompe = :id ORDER BY p.nombre"
                ),
                {"id": identificador},
            ).mappings()
        ]
        return registro

    def grupo(self, id_grupo):
        fila = self.sesion.execute(
            text('SELECT idGrupo AS "idGrupo", idSede AS "idSede", idEstado AS "idEstado" FROM grupo WHERE idGrupo = :id'),
            {"id": id_grupo},
        ).mappings().first()
        return dict(fila) if fila else None

    def convocatoria_existe(self, id_convocatoria):
        return self.sesion.execute(
            text("SELECT 1 FROM convocatoria WHERE idConvocatoria = :id"), {"id": id_convocatoria}
        ).first() is not None

    def grupo_ya_compite(self, id_grupo, excluir_id=None):
        return self.sesion.execute(
            text("SELECT 1 FROM grupo_competencia WHERE idGrupo = :grupo AND idgrupocompe <> COALESCE(:excluir, 0)"),
            {"grupo": id_grupo, "excluir": excluir_id},
        ).first() is not None

    def aceptados(self, id_convocatoria, sede):
        filas = self.sesion.execute(
            text(
                'SELECT e.idEstudiante AS "idEstudiante", p.nombre, p.documento '
                "FROM convocatoria_estudiante ce "
                "JOIN estados es ON es.idEstado = ce.idEstado "
                "JOIN estudiante e ON e.idEstudiante = ce.idEstudiante "
                "JOIN persona p ON p.idPersona = e.idPersona "
                "WHERE ce.idConvocatoria = :convocatoria AND es.nombre = :aceptado "
                "AND es.categoria = :categoria AND e.idEstado = :activo "
                "AND (CAST(:sede AS INT) IS NULL OR e.idSede = :sede) "
                "ORDER BY p.nombre"
            ),
            {"convocatoria": id_convocatoria, "aceptado": POSTULACION_ACEPTADO,
             "categoria": CATEGORIA_POSTULACION, "activo": ESTADO_ACTIVO, "sede": sede},
        ).mappings()
        return [dict(fila) for fila in filas]

    def crear(self, id_grupo, id_convocatoria, estudiantes):
        try:
            identificador = self.sesion.execute(
                text(
                    "INSERT INTO grupo_competencia (idGrupo, idConvocatoria) "
                    "VALUES (:grupo, :convocatoria) RETURNING idgrupocompe"
                ),
                {"grupo": id_grupo, "convocatoria": id_convocatoria},
            ).scalar_one()
            self._guardar_integrantes(identificador, estudiantes)
            self.sesion.commit()
            return identificador
        except Exception:
            self.sesion.rollback()
            raise

    def actualizar(self, identificador, id_convocatoria, estudiantes):
        try:
            self.sesion.execute(
                text("UPDATE grupo_competencia SET idConvocatoria = :convocatoria WHERE idgrupocompe = :id"),
                {"id": identificador, "convocatoria": id_convocatoria},
            )
            self.sesion.execute(
                text("DELETE FROM grupo_competencia_estudiante WHERE idgrupocompe = :id"), {"id": identificador}
            )
            self._guardar_integrantes(identificador, estudiantes)
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise

    def eliminar(self, identificador):
        try:
            self.sesion.execute(
                text("DELETE FROM grupo_competencia_estudiante WHERE idgrupocompe = :id"), {"id": identificador}
            )
            self.sesion.execute(text("DELETE FROM grupo_competencia WHERE idgrupocompe = :id"), {"id": identificador})
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise

    def _guardar_integrantes(self, identificador, estudiantes):
        for id_estudiante in estudiantes:
            self.sesion.execute(
                text("INSERT INTO grupo_competencia_estudiante (idgrupocompe, idEstudiante) VALUES (:id, :estudiante)"),
                {"id": identificador, "estudiante": id_estudiante},
            )
