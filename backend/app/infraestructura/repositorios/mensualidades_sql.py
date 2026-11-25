from datetime import date

from sqlalchemy import text

from app.dominio.reglas import (
    CATEGORIA_MENSUALIDAD,
    MENSUALIDAD_PENDIENTE,
    MENSUALIDAD_VENCIDA,
)
from app.dominio.repositorios.repositorio_mensualidades import RepositorioMensualidades
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import (
    PAGADO_MENSUALIDAD,
    SALDO_MENSUALIDAD,
    EstadoCategoriaSql,
    recalcular_estado_mensualidad,
)

COLUMNAS = f"""
    me.idMensualidad AS "idMensualidad", me.idMatricula AS "idMatricula",
    m.idEstudiante AS "idEstudiante", p.nombre AS estudiante, g.nombre AS grupo,
    to_char(me.fecha_pago, 'YYYY-MM') AS periodo,
    me.fecha_pago, me.valor_pagar, me.fecha_limite,
    {PAGADO_MENSUALIDAD} AS "valorPagado", {SALDO_MENSUALIDAD} AS saldo,
    me.idEstado AS "idEstado", es.nombre AS estado
"""
ORIGEN = """
    FROM mensualidad me
    JOIN matricula m ON m.idMatricula = me.idMatricula
    JOIN estudiante e ON e.idEstudiante = m.idEstudiante
    JOIN persona p ON p.idPersona = e.idPersona
    JOIN grupo g ON g.idGrupo = m.idGrupo
    JOIN estados es ON es.idEstado = me.idEstado
"""

FILTROS = {
    "matricula": "me.idMatricula",
    "estudiante": "m.idEstudiante",
    "grupo": "m.idGrupo",
    "sede": "g.idSede",
    "periodo": "to_char(me.fecha_pago, 'YYYY-MM')",
}


class RepositorioMensualidadesSql(EstadoCategoriaSql, RepositorioBaseSql, RepositorioMensualidades):
    categoria = CATEGORIA_MENSUALIDAD

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if estado is not None:
            condiciones.append("me.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            condiciones.append(
                f"({sin_tildes('p.nombre')} LIKE {sin_tildes(':buscar')} OR p.documento LIKE :buscar)"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros or {}).items():
            if valor is not None:
                condiciones.append(f"{FILTROS[nombre]} = :{nombre}")
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            "me.fecha_pago DESC, p.nombre", pagina, tamano,
        )

    def disponibles(self, sede=None):
        """Mensualidades con saldo pendiente, para el formulario de pagos."""
        filtro_sede = "AND g.idSede = :sede" if sede is not None else ""
        filas = self.sesion.execute(
            text(
                'SELECT me.idMensualidad AS "idMensualidad", me.idMatricula AS "idMatricula", '
                "p.nombre AS estudiante, to_char(me.fecha_pago, 'YYYY-MM') AS periodo, "
                f"{SALDO_MENSUALIDAD} AS saldo {ORIGEN} "
                f"WHERE {PAGADO_MENSUALIDAD} < me.valor_pagar {filtro_sede} "
                "ORDER BY p.nombre, me.fecha_pago"
            ),
            {"sede": sede},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE me.idMensualidad = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_matricula(self, id_matricula):
        fila = self.sesion.execute(
            text('SELECT idMatricula AS "idMatricula", idEstado AS "idEstado" FROM matricula WHERE idMatricula = :id'),
            {"id": id_matricula},
        ).mappings().first()
        return dict(fila) if fila else None

    def existe_en_periodo(self, id_matricula, fecha_cobro, excluir_id=None):
        return self.sesion.execute(
            text(
                "SELECT 1 FROM mensualidad WHERE idMatricula = :matricula "
                "AND date_trunc('month', fecha_pago) = date_trunc('month', CAST(:fecha AS date)) "
                "AND idMensualidad <> :excluir"
            ),
            {"matricula": id_matricula, "fecha": fecha_cobro, "excluir": excluir_id or 0},
        ).first() is not None

    def marcar_vencidas(self, hoy, sede=None):
        # Un administrador de sede solo actualiza las mensualidades de su sede
        filtro_sede = (
            "AND idMatricula IN (SELECT m.idMatricula FROM matricula m "
            "JOIN grupo g ON g.idGrupo = m.idGrupo WHERE g.idSede = :sede)"
            if sede is not None
            else ""
        )
        resultado = self._guardar(
            "UPDATE mensualidad SET idEstado = :vencida "
            f"WHERE idEstado = :pendiente AND fecha_limite < :hoy {filtro_sede}",
            {
                "vencida": self.id_estado(MENSUALIDAD_VENCIDA),
                "pendiente": self.id_estado(MENSUALIDAD_PENDIENTE),
                "hoy": hoy,
                "sede": sede,
            },
        )
        return resultado.rowcount

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO mensualidad (idMatricula, fecha_pago, valor_pagar, fecha_limite, idEstado) "
            "VALUES (:idMatricula, :fecha_pago, :valor_pagar, :fecha_limite, :idEstado) "
            "RETURNING idMensualidad",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        try:
            self.sesion.execute(
                text(
                    "UPDATE mensualidad SET idMatricula = :idMatricula, fecha_pago = :fecha_pago, "
                    "valor_pagar = :valor_pagar, fecha_limite = :fecha_limite WHERE idMensualidad = :id"
                ),
                {**datos, "id": identificador},
            )
            # Si cambió el valor, puede quedar pagada (o dejar de estarlo)
            recalcular_estado_mensualidad(self.sesion, identificador, date.today())
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE mensualidad SET idEstado = :estado WHERE idMensualidad = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
