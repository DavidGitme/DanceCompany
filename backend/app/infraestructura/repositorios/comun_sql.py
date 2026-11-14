"""Consultas que comparten los módulos de aulas, matrículas, pagos, convocatorias y noticias."""

from datetime import date
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.reglas import (
    CATEGORIA_MENSUALIDAD,
    ESTADO_ACTIVO,
    MENSUALIDAD_PAGADA,
    MENSUALIDAD_PENDIENTE,
    MENSUALIDAD_VENCIDA,
)

# Lo pagado y el saldo de cada obligación. `m` = matricula, `me` = mensualidad
PAGADO_MATRICULA = "(SELECT COALESCE(SUM(pg.monto), 0) FROM pago pg WHERE pg.idMatricula = m.idMatricula)"
PAGADO_MENSUALIDAD = (
    "(SELECT COALESCE(SUM(pg.monto), 0) FROM pago pg WHERE pg.idMensualidad = me.idMensualidad)"
)
SALDO_MATRICULA = f"GREATEST(m.valor_matricula - {PAGADO_MATRICULA}, 0)"
SALDO_MENSUALIDAD = f"GREATEST(me.valor_pagar - {PAGADO_MENSUALIDAD}, 0)"

ID_ESTADO = "(SELECT idEstado FROM estados WHERE nombre = {nombre} AND categoria = {categoria})"


class EstadoCategoriaSql:
    """Estados de una sola categoría de la tabla `estados` (va antes de RepositorioBaseSql)."""

    sesion: Session
    categoria = "general"

    def id_estado(self, nombre: str) -> int:
        id_estado = self.sesion.execute(
            text("SELECT idEstado FROM estados WHERE nombre = :nombre AND categoria = :categoria"),
            {"nombre": nombre, "categoria": self.categoria},
        ).scalar()
        if id_estado is None:
            raise DatoInvalido(f"Falta el estado '{nombre}' ({self.categoria}) en la tabla estados.")
        return id_estado

    def estado_existe(self, id_estado: int) -> bool:
        return self.nombre_estado(id_estado) is not None

    def nombre_estado(self, id_estado: int) -> str | None:
        return self.sesion.execute(
            text("SELECT nombre FROM estados WHERE idEstado = :id AND categoria = :categoria"),
            {"id": id_estado, "categoria": self.categoria},
        ).scalar()


def recalcular_estado_mensualidad(sesion: Session, id_mensualidad: int, hoy: date) -> None:
    """Pagada si los pagos cubren el valor; si deja de estarlo vuelve a Pendiente o Vencida.

    No confirma: se llama dentro de la transacción del pago o de la mensualidad.
    """
    def estado(parametro: str) -> str:
        return ID_ESTADO.format(nombre=parametro, categoria=":categoria")

    sesion.execute(
        text(
            f"""
            UPDATE mensualidad me SET idEstado = CASE
                WHEN {PAGADO_MENSUALIDAD} >= me.valor_pagar THEN {estado(':pagada')}
                WHEN me.idEstado = {estado(':pagada')} THEN
                    CASE WHEN me.fecha_limite < :hoy THEN {estado(':vencida')} ELSE {estado(':pendiente')} END
                ELSE me.idEstado
            END
            WHERE me.idMensualidad = :id
            """
        ),
        {
            "id": id_mensualidad,
            "hoy": hoy,
            "categoria": CATEGORIA_MENSUALIDAD,
            "pagada": MENSUALIDAD_PAGADA,
            "vencida": MENSUALIDAD_VENCIDA,
            "pendiente": MENSUALIDAD_PENDIENTE,
        },
    )


class PagadorSql:
    """Consultas sobre quién paga (acudiente o el propio estudiante)."""

    sesion: Session

    def obtener_estudiante(self, id_estudiante):
        fila = self.sesion.execute(
            text(
                'SELECT e.idEstudiante AS "idEstudiante", e.idSede AS "idSede", '
                'e.idEstado AS "idEstado", p.fecha_nacimiento FROM estudiante e '
                "JOIN persona p ON p.idPersona = e.idPersona WHERE e.idEstudiante = :id"
            ),
            {"id": id_estudiante},
        ).mappings().first()
        return dict(fila) if fila else None

    def acudiente_activo(self, id_acudiente):
        return self.sesion.execute(
            text("SELECT 1 FROM acudiente WHERE idAcudiente = :id AND idEstado = :activo"),
            {"id": id_acudiente, "activo": ESTADO_ACTIVO},
        ).first() is not None

    def acudiente_responsable(self, id_acudiente, id_estudiante):
        return self.sesion.execute(
            text(
                "SELECT 1 FROM acudiente a JOIN estudiante e ON e.idEstudiante = :estudiante "
                "WHERE a.idAcudiente = :acudiente AND (a.idPersona = e.idPersona OR EXISTS ("
                "  SELECT 1 FROM estudiante_responsable r "
                "  WHERE r.idEstudiante = e.idEstudiante AND r.idAcudiente = a.idAcudiente))"
            ),
            {"acudiente": id_acudiente, "estudiante": id_estudiante},
        ).first() is not None

    def metodo_existe(self, id_metodo):
        return self.sesion.execute(
            text("SELECT 1 FROM metodo_pago WHERE idMetodo = :id"), {"id": id_metodo}
        ).first() is not None

    def acudientes_de_estudiante(self, id_estudiante):
        filas = self.sesion.execute(
            text(
                """
                SELECT a.idAcudiente AS "idAcudiente", p.nombre, p.documento, pa.nombre AS parentesco
                  FROM estudiante_responsable r
                  JOIN acudiente a ON a.idAcudiente = r.idAcudiente
                  JOIN persona p ON p.idPersona = a.idPersona
                  JOIN parentesco pa ON pa.idParentesco = r.idParentesco
                 WHERE r.idEstudiante = :id AND a.idEstado = :activo
                UNION
                SELECT a.idAcudiente, p.nombre, p.documento, 'El propio estudiante'
                  FROM estudiante e
                  JOIN acudiente a ON a.idPersona = e.idPersona
                  JOIN persona p ON p.idPersona = e.idPersona
                 WHERE e.idEstudiante = :id AND a.idEstado = :activo
                ORDER BY nombre
                """
            ),
            {"id": id_estudiante, "activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    # Los siguientes no confirman: se usan dentro de la transacción de cada repositorio
    def _acudiente_del_estudiante(self, id_estudiante: int) -> int:
        """Acudiente de la misma persona del estudiante; lo crea si no existe."""
        existente = self.sesion.execute(
            text(
                "SELECT a.idAcudiente FROM acudiente a "
                "JOIN estudiante e ON e.idPersona = a.idPersona WHERE e.idEstudiante = :id"
            ),
            {"id": id_estudiante},
        ).scalar()
        if existente is not None:
            return existente
        return self.sesion.execute(
            text(
                "INSERT INTO acudiente (idPersona, idEstado) "
                "SELECT idPersona, :activo FROM estudiante WHERE idEstudiante = :id RETURNING idAcudiente"
            ),
            {"id": id_estudiante, "activo": ESTADO_ACTIVO},
        ).scalar_one()

    def _insertar_pago(self, datos: dict[str, Any]) -> int:
        id_acudiente = datos.get("idAcudiente")
        if id_acudiente is None:
            id_acudiente = self._acudiente_del_estudiante(datos["idEstudiante"])
        return self.sesion.execute(
            text(
                "INSERT INTO pago (monto, fecha_pago, idAcudiente, idMetodo, idMensualidad, idMatricula) "
                "VALUES (:monto, :fecha_pago, :idAcudiente, :idMetodo, :idMensualidad, :idMatricula) "
                "RETURNING idPago"
            ),
            {
                "monto": datos["monto"],
                "fecha_pago": datos["fecha_pago"],
                "idAcudiente": id_acudiente,
                "idMetodo": datos["idMetodo"],
                "idMensualidad": datos.get("idMensualidad"),
                "idMatricula": datos.get("idMatricula"),
            },
        ).scalar_one()

    def _en_transaccion(self, operacion):
        """Ejecuta varias escrituras como una sola: confirma al final o deshace todo."""
        try:
            resultado = operacion()
            self.sesion.commit()
            return resultado
        except Exception:
            self.sesion.rollback()
            raise
