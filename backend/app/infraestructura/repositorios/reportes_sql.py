"""Cifras financieras del Dashboard, calculadas sobre mensualidad y pago.

Reglas (ver docs/estandarizacion-modulos.md):
- Esperado de un mes: suma de valor_pagar de las mensualidades cobradas ese mes (fecha_pago).
- Recaudado de un mes: lo pagado a esas mismas mensualidades (cualquier fecha de pago).
- Pendiente: esperado - recaudado (saldo de esas mensualidades).
- Recibido en un mes: todos los pagos con fecha en ese mes (mensualidad, matrícula o taller).
- Vencida: mensualidad con saldo y fecha límite anterior a hoy, o en estado Vencida o Mora.
- Al día: estudiante activo con matrícula activa y sin mensualidades vencidas.
"""

from sqlalchemy import text

from app.dominio.reglas import CATEGORIA_MENSUALIDAD, ESTADO_ACTIVO, MENSUALIDAD_VENCIDA
from app.infraestructura.bd.consultas import RepositorioBaseSql
from app.infraestructura.repositorios.comun_sql import PAGADO_MENSUALIDAD, SALDO_MENSUALIDAD

ORIGEN_MENSUALIDAD = """
    FROM mensualidad me
    JOIN matricula m ON m.idMatricula = me.idMatricula
    JOIN grupo g ON g.idGrupo = m.idGrupo
    JOIN estados es ON es.idEstado = me.idEstado
"""
VENCIDA = (
    f"({SALDO_MENSUALIDAD} > 0 AND (me.fecha_limite < :hoy OR "
    "(es.categoria = :categoria AND es.nombre IN (:vencida, 'Mora'))))"
)
# Sede de un pago: la de su mensualidad, su matrícula o el estudiante del taller
SEDE_PAGO = "COALESCE(gme.idSede, gma.idSede, e.idSede)"
ORIGEN_PAGO = """
    FROM pago pg
    LEFT JOIN mensualidad me ON me.idMensualidad = pg.idMensualidad
    LEFT JOIN matricula mme ON mme.idMatricula = me.idMatricula
    LEFT JOIN grupo gme ON gme.idGrupo = mme.idGrupo
    LEFT JOIN matricula ma ON ma.idMatricula = pg.idMatricula
    LEFT JOIN grupo gma ON gma.idGrupo = ma.idGrupo
    LEFT JOIN inscripcion_talle it ON it.idPago = pg.idPago
    LEFT JOIN estudiante e ON e.idEstudiante = it.idEstudiante
"""


class RepositorioReportesSql(RepositorioBaseSql):
    def _parametros(self, sede, hoy, **extra):
        return {"sede": sede, "hoy": hoy, "categoria": CATEGORIA_MENSUALIDAD, "vencida": MENSUALIDAD_VENCIDA, **extra}

    def mensualidades_por_mes(self, sede, desde, hasta, hoy):
        """Esperado, recaudado y pendiente por mes de cobro entre dos meses 'YYYY-MM'."""
        filtro = "AND g.idSede = :sede" if sede is not None else ""
        filas = self.sesion.execute(
            text(
                "SELECT to_char(me.fecha_pago, 'YYYY-MM') AS periodo, "
                "COALESCE(SUM(me.valor_pagar), 0) AS esperado, "
                f"COALESCE(SUM(LEAST({PAGADO_MENSUALIDAD}, me.valor_pagar)), 0) AS recaudado, "
                f"COALESCE(SUM({SALDO_MENSUALIDAD}), 0) AS pendiente, COUNT(*) AS cantidad, "
                f"COUNT(*) FILTER (WHERE {SALDO_MENSUALIDAD} = 0) AS pagadas "
                f"{ORIGEN_MENSUALIDAD} WHERE to_char(me.fecha_pago, 'YYYY-MM') BETWEEN :desde AND :hasta {filtro} "
                "GROUP BY 1 ORDER BY 1"
            ),
            self._parametros(sede, hoy, desde=desde, hasta=hasta),
        ).mappings()
        return [dict(f) for f in filas]

    def recibido_por_mes(self, sede, desde, hasta):
        filtro = f"AND {SEDE_PAGO} = :sede" if sede is not None else ""
        filas = self.sesion.execute(
            text(
                "SELECT to_char(pg.fecha_pago, 'YYYY-MM') AS periodo, COALESCE(SUM(pg.monto), 0) AS total, "
                "COALESCE(SUM(pg.monto) FILTER (WHERE pg.idMensualidad IS NOT NULL), 0) AS mensualidad, "
                "COALESCE(SUM(pg.monto) FILTER (WHERE pg.idMensualidad IS NULL AND pg.idMatricula IS NOT NULL), 0) "
                "AS matricula, "
                "COALESCE(SUM(pg.monto) FILTER (WHERE pg.idMensualidad IS NULL AND pg.idMatricula IS NULL), 0) "
                "AS taller, COUNT(*) AS cantidad "
                f"{ORIGEN_PAGO} WHERE to_char(pg.fecha_pago, 'YYYY-MM') BETWEEN :desde AND :hasta {filtro} "
                "GROUP BY 1 ORDER BY 1"
            ),
            {"sede": sede, "desde": desde, "hasta": hasta},
        ).mappings()
        return [dict(f) for f in filas]

    def vencidas(self, sede, hoy):
        filtro = "AND g.idSede = :sede" if sede is not None else ""
        fila = self.sesion.execute(
            text(
                f"SELECT COUNT(*) AS cantidad, COALESCE(SUM({SALDO_MENSUALIDAD}), 0) AS valor, "
                "COUNT(DISTINCT m.idEstudiante) AS estudiantes "
                f"{ORIGEN_MENSUALIDAD} WHERE {VENCIDA} {filtro}"
            ),
            self._parametros(sede, hoy),
        ).mappings().one()
        return dict(fila)

    def detalle_vencidas(self, sede, hoy, limite=5):
        """Las mensualidades vencidas más antiguas (misma regla que vencidas)."""
        filtro = "AND g.idSede = :sede" if sede is not None else ""
        filas = self.sesion.execute(
            text(
                'SELECT me.idMensualidad AS "idMensualidad", p.nombre AS estudiante, g.nombre AS grupo, '
                "to_char(me.fecha_pago, 'YYYY-MM') AS periodo, me.fecha_limite, "
                f"{SALDO_MENSUALIDAD} AS saldo, es.nombre AS estado "
                f"{ORIGEN_MENSUALIDAD} JOIN estudiante e ON e.idEstudiante = m.idEstudiante "
                f"JOIN persona p ON p.idPersona = e.idPersona WHERE {VENCIDA} {filtro} "
                "ORDER BY me.fecha_limite LIMIT :limite"
            ),
            self._parametros(sede, hoy, limite=limite),
        ).mappings()
        return [dict(f) for f in filas]

    def estudiantes(self, sede, hoy):
        """Estudiantes activos con matrícula activa y cuántos tienen mensualidades vencidas."""
        filtro = "AND e.idSede = :sede" if sede is not None else ""
        fila = self.sesion.execute(
            text(
                "SELECT COUNT(DISTINCT e.idEstudiante) AS matriculados, "
                "COUNT(DISTINCT e.idEstudiante) FILTER (WHERE EXISTS ("
                f"  SELECT 1 {ORIGEN_MENSUALIDAD} WHERE m.idEstudiante = e.idEstudiante AND {VENCIDA}"
                ")) AS con_vencidas "
                "FROM estudiante e JOIN matricula mt ON mt.idEstudiante = e.idEstudiante "
                f"WHERE e.idEstado = :activo AND mt.idEstado = :activo {filtro}"
            ),
            self._parametros(sede, hoy, activo=ESTADO_ACTIVO),
        ).mappings().one()
        return dict(fila)
