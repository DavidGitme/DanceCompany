from sqlalchemy import text

from app.dominio.reglas import CATEGORIA_MATRICULA, ESTADO_ACTIVO, ESTADO_INACTIVO, MATRICULA_PENDIENTE
from app.dominio.repositorios.repositorio_matriculas import RepositorioMatriculas
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import (
    PAGADO_MATRICULA,
    SALDO_MATRICULA,
    EstadoCategoriaSql,
    PagadorSql,
)

# Estado Pendiente de la matrícula (bd/08). NULL si la migración no se ha ejecutado.
ID_PENDIENTE = (
    f"(SELECT idEstado FROM estados WHERE nombre = '{MATRICULA_PENDIENTE}' "
    f"AND categoria = '{CATEGORIA_MATRICULA}')"
)
# Una matrícula activa o en proceso ocupa su cupo en el grupo (alias `m`)
OCUPA_CUPO = f"m.idEstado IN ({ESTADO_ACTIVO}, COALESCE({ID_PENDIENTE}, {ESTADO_ACTIVO}))"

COLUMNAS_BASE = f"""
    m.idMatricula AS "idMatricula", m.idEstudiante AS "idEstudiante",
    p.nombre AS estudiante, p.documento, p.fecha_nacimiento,
    m.idGrupo AS "idGrupo", g.nombre AS grupo, g.idSede AS "idSede", s.nombre AS sede,
    n.nombre AS nivel, est.nombre AS estilo,
    g.idInstructor AS "idInstructor", pinst.nombre AS instructor,
    m.fecha_matricula, m.valor_matricula,
    {PAGADO_MATRICULA} AS "valorPagado", {SALDO_MATRICULA} AS saldo,
    (SELECT COUNT(*) FROM mensualidad me WHERE me.idMatricula = m.idMatricula) AS mensualidades,
    m.idEstado AS "idEstado", es.nombre AS estado
"""
# Columnas del proceso de aprobación (solo existen con bd/08)
COLUMNAS_APROBACION = f""",
    (SELECT COUNT(*) FROM matricula_requisito mr
       JOIN requisito_matricula rq ON rq.idRequisito = mr.idRequisito
      WHERE mr.idMatricula = m.idMatricula AND rq.idEstado = {ESTADO_ACTIVO}) AS "requisitosCumplidos",
    (SELECT COUNT(*) FROM requisito_matricula rq WHERE rq.idEstado = {ESTADO_ACTIVO}) AS "requisitosTotal",
    m.fecha_aprobacion,
    (SELECT pa.nombre FROM persona pa WHERE pa.documento = m.aprobada_por LIMIT 1) AS "aprobadaPor"
"""
COLUMNAS_SIN_APROBACION = """,
    0 AS "requisitosCumplidos", 0 AS "requisitosTotal",
    NULL AS fecha_aprobacion, NULL AS "aprobadaPor"
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
    LEFT JOIN instructor i ON i.idInstructor = g.idInstructor
    LEFT JOIN persona pinst ON pinst.idPersona = i.idPersona
"""

FILTROS = {"estudiante": "m.idEstudiante", "grupo": "m.idGrupo", "sede": "g.idSede"}

# Se recuerda por proceso cuando la base ya tiene la migración 08
_aprobacion_lista = False


class RepositorioMatriculasSql(EstadoCategoriaSql, PagadorSql, RepositorioBaseSql, RepositorioMatriculas):
    def _columnas(self) -> str:
        return COLUMNAS_BASE + (COLUMNAS_APROBACION if self.aprobacion_disponible() else COLUMNAS_SIN_APROBACION)

    def _filas(self, sql, parametros=None):
        return [dict(fila) for fila in self.sesion.execute(text(sql), parametros or {}).mappings()]

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
            self.sesion, self._columnas(), ORIGEN, condiciones, parametros,
            "m.fecha_matricula DESC, p.nombre", pagina, tamano,
        )

    def disponibles(self, sede=None):
        filtro_sede = "AND g.idSede = :sede" if sede is not None else ""
        filas = self.sesion.execute(
            text(
                'SELECT m.idMatricula AS "idMatricula", m.idEstudiante AS "idEstudiante", '
                f"p.nombre AS estudiante, g.nombre AS grupo, m.valor_matricula, {SALDO_MATRICULA} AS saldo "
                f"{ORIGEN} WHERE m.idEstado = :activo {filtro_sede} ORDER BY p.nombre, g.nombre"
            ),
            {"activo": ESTADO_ACTIVO, "sede": sede},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {self._columnas()} {ORIGEN} WHERE m.idMatricula = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_grupo(self, id_grupo):
        fila = self.sesion.execute(
            text(
                'SELECT g.idGrupo AS "idGrupo", g.idSede AS "idSede", g.idEstado AS "idEstado", '
                'g.capacidad, n.edad_minima AS "edadMin", n.edad_maxima AS "edadMax", '
                f"(SELECT COUNT(*) FROM matricula m WHERE m.idGrupo = g.idGrupo AND {OCUPA_CUPO}) "
                'AS "matriculasActivas" '
                "FROM grupo g JOIN nivel n ON n.idNivel = g.idNivel WHERE g.idGrupo = :id"
            ),
            {"id": id_grupo},
        ).mappings().first()
        return dict(fila) if fila else None

    def matricula_activa_en_grupo(self, id_estudiante, id_grupo, excluir_id=None):
        return self.sesion.execute(
            text(
                "SELECT 1 FROM matricula m WHERE m.idEstudiante = :estudiante AND m.idGrupo = :grupo "
                f"AND {OCUPA_CUPO} AND m.idMatricula <> :excluir"
            ),
            {"estudiante": id_estudiante, "grupo": id_grupo, "excluir": excluir_id or 0},
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
        # El valor no cambia: es el precio único de la matrícula
        self._guardar(
            "UPDATE matricula SET idEstudiante = :idEstudiante, idGrupo = :idGrupo, "
            "fecha_matricula = :fecha_matricula WHERE idMatricula = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE matricula SET idEstado = :estado WHERE idMatricula = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)

    # ---------- Proceso de aprobación (bd/08_matricula_aprobacion.sql) ----------
    def aprobacion_disponible(self):
        global _aprobacion_lista
        if not _aprobacion_lista:
            _aprobacion_lista = bool(
                self.sesion.execute(
                    text(
                        "SELECT to_regclass('matricula_requisito') IS NOT NULL "
                        "AND to_regclass('requisito_matricula') IS NOT NULL "
                        "AND EXISTS (SELECT 1 FROM information_schema.columns "
                        "  WHERE table_schema = current_schema() AND table_name = 'matricula' "
                        "  AND column_name = 'fecha_aprobacion')"
                    )
                ).scalar()
            )
        return _aprobacion_lista

    def id_estado_pendiente(self):
        return self.sesion.execute(text(f"SELECT {ID_PENDIENTE}")).scalar()

    def estados(self):
        return self._filas(
            'SELECT idEstado AS "idEstado", nombre FROM estados '
            "WHERE (categoria = 'general' AND idEstado IN (:activo, :inactivo)) "
            "   OR (nombre = :pendiente AND categoria = :categoria) "
            "ORDER BY CASE WHEN categoria = :categoria THEN 0 ELSE idEstado END",
            {
                "activo": ESTADO_ACTIVO, "inactivo": ESTADO_INACTIVO,
                "pendiente": MATRICULA_PENDIENTE, "categoria": CATEGORIA_MATRICULA,
            },
        )

    def requisitos(self, id_matricula=None):
        return self._filas(
            'SELECT rq.idRequisito AS "idRequisito", rq.nombre, rq.descripcion, rq.responsable, '
            "(mr.idMatricula IS NOT NULL) AS cumplido, mr.fecha_cumplido AS \"fechaCumplido\", "
            "COALESCE((SELECT pm.nombre FROM persona pm WHERE pm.documento = mr.documento_usuario LIMIT 1), "
            '  mr.documento_usuario) AS "marcadoPor", mr.observacion '
            "FROM requisito_matricula rq "
            "LEFT JOIN matricula_requisito mr ON mr.idRequisito = rq.idRequisito AND mr.idMatricula = :id "
            "WHERE rq.idEstado = :activo ORDER BY rq.orden, rq.idRequisito",
            {"id": id_matricula or 0, "activo": ESTADO_ACTIVO},
        )

    def obtener_requisito(self, id_requisito):
        fila = self.sesion.execute(
            text(
                'SELECT idRequisito AS "idRequisito", nombre, responsable, idEstado AS "idEstado" '
                "FROM requisito_matricula WHERE idRequisito = :id"
            ),
            {"id": id_requisito},
        ).mappings().first()
        return dict(fila) if fila else None

    def marcar_requisito(self, id_matricula, id_requisito, cumplido, documento, observacion):
        parametros = {"matricula": id_matricula, "requisito": id_requisito}
        if not cumplido:
            self._guardar(
                "DELETE FROM matricula_requisito WHERE idMatricula = :matricula AND idRequisito = :requisito",
                parametros,
            )
            return
        self._guardar(
            "INSERT INTO matricula_requisito (idMatricula, idRequisito, documento_usuario, observacion) "
            "VALUES (:matricula, :requisito, :documento, :observacion) "
            "ON CONFLICT (idMatricula, idRequisito) DO UPDATE SET "
            "fecha_cumplido = CURRENT_TIMESTAMP, documento_usuario = EXCLUDED.documento_usuario, "
            "observacion = EXCLUDED.observacion",
            {**parametros, "documento": documento, "observacion": observacion},
        )

    def aprobar(self, id_matricula, documento):
        self._guardar(
            f"UPDATE matricula SET idEstado = :activo, fecha_aprobacion = CURRENT_TIMESTAMP, "
            f"aprobada_por = :documento WHERE idMatricula = :id AND idEstado = {ID_PENDIENTE}",
            {"activo": ESTADO_ACTIVO, "documento": documento, "id": id_matricula},
        )
        return self.obtener(id_matricula)

    def id_instructor_por_documento(self, documento):
        return self.sesion.execute(
            text(
                "SELECT i.idInstructor FROM instructor i JOIN persona p ON p.idPersona = i.idPersona "
                "WHERE p.documento = :documento AND i.idEstado = :activo"
            ),
            {"documento": documento, "activo": ESTADO_ACTIVO},
        ).scalar()

    def pendientes_de_instructor(self, id_instructor):
        return self._filas(
            f"SELECT {self._columnas()} {ORIGEN} "
            f"WHERE g.idInstructor = :instructor AND g.idEstado = :activo AND m.idEstado = {ID_PENDIENTE} "
            "ORDER BY m.fecha_matricula, p.nombre",
            {"instructor": id_instructor, "activo": ESTADO_ACTIVO},
        )

    def estudiantes_para_matricular(self, sede=None):
        filtro_sede = "AND e.idSede = :sede" if sede is not None else ""
        return self._filas(
            'SELECT e.idEstudiante AS "idEstudiante", p.nombre, p.documento, e.idSede AS "idSede", '
            "s.nombre AS sede, p.fecha_nacimiento FROM estudiante e "
            "JOIN persona p ON p.idPersona = e.idPersona JOIN sede s ON s.idSede = e.idSede "
            f"WHERE e.idEstado = :activo {filtro_sede} ORDER BY p.nombre",
            {"activo": ESTADO_ACTIVO, "sede": sede},
        )

    def grupos_para_matricular(self, sede=None):
        filtro_sede = "AND g.idSede = :sede" if sede is not None else ""
        return self._filas(
            'SELECT g.idGrupo AS "idGrupo", g.nombre, n.nombre AS nivel, est.nombre AS estilo, '
            'g.idSede AS "idSede", s.nombre AS sede, n.edad_minima AS "edadMin", '
            'n.edad_maxima AS "edadMax", g.capacidad, '
            f"(SELECT COUNT(*) FROM matricula m WHERE m.idGrupo = g.idGrupo AND {OCUPA_CUPO}) AS ocupados "
            "FROM grupo g JOIN nivel n ON n.idNivel = g.idNivel "
            "JOIN estilo est ON est.idEstilo = g.idEstilo JOIN sede s ON s.idSede = g.idSede "
            f"WHERE g.idEstado = :activo {filtro_sede} ORDER BY s.nombre, g.nombre",
            {"activo": ESTADO_ACTIVO, "sede": sede},
        )
