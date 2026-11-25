from datetime import date

from sqlalchemy import text

from app.dominio.repositorios.repositorio_pagos import RepositorioPagos
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import (
    SALDO_MATRICULA,
    SALDO_MENSUALIDAD,
    PagadorSql,
    recalcular_estado_mensualidad,
)

TIPO = """CASE WHEN pg.idMensualidad IS NOT NULL THEN 'mensualidad'
               WHEN pg.idMatricula IS NOT NULL THEN 'matricula'
               ELSE 'taller' END"""
ID_ESTUDIANTE = "COALESCE(mme.idEstudiante, ma.idEstudiante, it.idEstudiante)"

COLUMNAS = f"""
    pg.idPago AS "idPago", {TIPO} AS tipo,
    CASE WHEN pg.idMensualidad IS NOT NULL
              THEN 'Mensualidad ' || to_char(me.fecha_pago, 'YYYY-MM') || ' · ' || gme.nombre
         WHEN pg.idMatricula IS NOT NULL THEN 'Matrícula · ' || gma.nombre
         WHEN t.idTaller IS NOT NULL THEN 'Taller · ' || t.descripcion
         ELSE 'Taller' END AS concepto,
    pg.monto, pg.fecha_pago,
    pg.idAcudiente AS "idAcudiente", pa.nombre AS pagador,
    pg.idMetodo AS "idMetodo", mp.nombre AS metodo,
    pg.idMensualidad AS "idMensualidad", pg.idMatricula AS "idMatricula",
    {ID_ESTUDIANTE} AS "idEstudiante", pe.nombre AS estudiante
"""
ORIGEN = f"""
    FROM pago pg
    JOIN metodo_pago mp ON mp.idMetodo = pg.idMetodo
    JOIN acudiente a ON a.idAcudiente = pg.idAcudiente
    JOIN persona pa ON pa.idPersona = a.idPersona
    LEFT JOIN mensualidad me ON me.idMensualidad = pg.idMensualidad
    LEFT JOIN matricula mme ON mme.idMatricula = me.idMatricula
    LEFT JOIN grupo gme ON gme.idGrupo = mme.idGrupo
    LEFT JOIN matricula ma ON ma.idMatricula = pg.idMatricula
    LEFT JOIN grupo gma ON gma.idGrupo = ma.idGrupo
    LEFT JOIN inscripcion_talle it ON it.idPago = pg.idPago
    LEFT JOIN taller t ON t.idTaller = it.idTaller
    LEFT JOIN estudiante est ON est.idEstudiante = {ID_ESTUDIANTE}
    LEFT JOIN persona pe ON pe.idPersona = est.idPersona
"""

FILTROS = {
    "acudiente": "pg.idAcudiente = :acudiente",
    "metodo": "pg.idMetodo = :metodo",
    "mensualidad": "pg.idMensualidad = :mensualidad",
    "matricula": "pg.idMatricula = :matricula",
    "estudiante": f"{ID_ESTUDIANTE} = :estudiante",
    "desde": "pg.fecha_pago >= :desde",
    "hasta": "pg.fecha_pago <= :hasta",
    "tipo": f"{TIPO} = :tipo",
    "sede": "COALESCE(gme.idSede, gma.idSede, est.idSede) = :sede",
}


class RepositorioPagosSql(PagadorSql, RepositorioBaseSql, RepositorioPagos):
    def listar(self, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if buscar:
            condiciones.append(
                f"({sin_tildes('pa.nombre')} LIKE {sin_tildes(':buscar')} OR pa.documento LIKE :buscar "
                f"OR {sin_tildes('pe.nombre')} LIKE {sin_tildes(':buscar')})"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros or {}).items():
            if valor is not None:
                condiciones.append(FILTROS[nombre])
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            "pg.fecha_pago DESC, pg.idPago DESC", pagina, tamano,
        )

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE pg.idPago = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_mensualidad(self, id_mensualidad):
        fila = self.sesion.execute(
            text(
                'SELECT me.idMensualidad AS "idMensualidad", m.idEstudiante AS "idEstudiante", '
                f"{SALDO_MENSUALIDAD} AS saldo FROM mensualidad me "
                "JOIN matricula m ON m.idMatricula = me.idMatricula WHERE me.idMensualidad = :id"
            ),
            {"id": id_mensualidad},
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_matricula(self, id_matricula):
        fila = self.sesion.execute(
            text(
                'SELECT m.idMatricula AS "idMatricula", m.idEstudiante AS "idEstudiante", '
                f"{SALDO_MATRICULA} AS saldo FROM matricula m WHERE m.idMatricula = :id"
            ),
            {"id": id_matricula},
        ).mappings().first()
        return dict(fila) if fila else None

    def crear(self, datos):
        def operacion():
            id_pago = self._insertar_pago(datos)
            if datos.get("idMensualidad") is not None:
                recalcular_estado_mensualidad(self.sesion, datos["idMensualidad"], date.today())
            return id_pago

        return self.obtener(self._en_transaccion(operacion))

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE pago SET fecha_pago = :fecha_pago, idMetodo = :idMetodo WHERE idPago = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def eliminar(self, identificador):
        def operacion():
            id_mensualidad = self.sesion.execute(
                text("DELETE FROM pago WHERE idPago = :id RETURNING idMensualidad"), {"id": identificador}
            ).scalar_one()
            if id_mensualidad is not None:
                recalcular_estado_mensualidad(self.sesion, id_mensualidad, date.today())

        self._en_transaccion(operacion)
