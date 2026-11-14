from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_matriculas import RepositorioMatriculas
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import (
    PAGADO_MATRICULA,
    SALDO_MATRICULA,
    EstadoCategoriaSql,
    PagadorSql,
)

COLUMNAS = f"""
    m.idMatricula AS "idMatricula", m.idEstudiante AS "idEstudiante",
    p.nombre AS estudiante, p.documento,
    m.idGrupo AS "idGrupo", g.nombre AS grupo, g.idSede AS "idSede", s.nombre AS sede,
    n.nombre AS nivel, est.nombre AS estilo,
    m.fecha_matricula, m.valor_matricula,
    {PAGADO_MATRICULA} AS "valorPagado", {SALDO_MATRICULA} AS saldo,
    (SELECT COUNT(*) FROM mensualidad me WHERE me.idMatricula = m.idMatricula) AS mensualidades,
    m.idEstado AS "idEstado", es.nombre AS estado
"""
ORIGEN = """
    FROM matricula m
    JOIN estudiante e ON e.idEstudiante = m.idEstudiante
    JOIN persona p ON p.idPersona = e.idPersona
    JOIN grupo g ON g.idGrupo = m.idGrupo
    JOIN sede s ON s.idSede = g.idSede
    JOIN nivel n ON n.idNivel = g.idNivel
    JOIN estilo est ON est.idEstilo = g.idEstilo
    JOIN estados es ON es.idEstado = m.idEstado
"""

FILTROS = {"estudiante": "m.idEstudiante", "grupo": "m.idGrupo", "sede": "g.idSede"}


class RepositorioMatriculasSql(EstadoCategoriaSql, PagadorSql, RepositorioBaseSql, RepositorioMatriculas):
    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if estado is not None:
            condiciones.append("m.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            condiciones.append(
                f"({sin_tildes('p.nombre')} LIKE {sin_tildes(':buscar')} "
                f"OR p.documento LIKE :buscar OR {sin_tildes('g.nombre')} LIKE {sin_tildes(':buscar')})"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros or {}).items():
            if valor is not None:
                condiciones.append(f"{FILTROS[nombre]} = :{nombre}")
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            "m.fecha_matricula DESC, p.nombre", pagina, tamano,
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                'SELECT m.idMatricula AS "idMatricula", m.idEstudiante AS "idEstudiante", '
                f"p.nombre AS estudiante, g.nombre AS grupo, m.valor_matricula, {SALDO_MATRICULA} AS saldo "
                f"{ORIGEN} WHERE m.idEstado = :activo ORDER BY p.nombre, g.nombre"
            ),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE m.idMatricula = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_grupo(self, id_grupo):
        fila = self.sesion.execute(
            text(
                'SELECT g.idGrupo AS "idGrupo", g.idSede AS "idSede", g.idEstado AS "idEstado", '
                'g.capacidad, n.edad_minima AS "edadMin", n.edad_maxima AS "edadMax", '
                "(SELECT COUNT(*) FROM matricula m WHERE m.idGrupo = g.idGrupo "
                ' AND m.idEstado = :activo) AS "matriculasActivas" '
                "FROM grupo g JOIN nivel n ON n.idNivel = g.idNivel WHERE g.idGrupo = :id"
            ),
            {"id": id_grupo, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def matricula_activa_en_grupo(self, id_estudiante, id_grupo, excluir_id=None):
        return self.sesion.execute(
            text(
                "SELECT 1 FROM matricula WHERE idEstudiante = :estudiante AND idGrupo = :grupo "
                "AND idEstado = :activo AND idMatricula <> :excluir"
            ),
            {
                "estudiante": id_estudiante, "grupo": id_grupo,
                "activo": ESTADO_ACTIVO, "excluir": excluir_id or 0,
            },
        ).first() is not None

    def tiene_movimientos(self, id_matricula):
        return self.sesion.execute(
            text(
                "SELECT 1 WHERE EXISTS (SELECT 1 FROM mensualidad WHERE idMatricula = :id) "
                "OR EXISTS (SELECT 1 FROM pago WHERE idMatricula = :id)"
            ),
            {"id": id_matricula},
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO matricula (idEstudiante, idGrupo, fecha_matricula, valor_matricula, idEstado) "
            "VALUES (:idEstudiante, :idGrupo, :fecha_matricula, :valor_matricula, :idEstado) "
            "RETURNING idMatricula",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE matricula SET idEstudiante = :idEstudiante, idGrupo = :idGrupo, "
            "fecha_matricula = :fecha_matricula, valor_matricula = :valor_matricula "
            "WHERE idMatricula = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE matricula SET idEstado = :estado WHERE idMatricula = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
