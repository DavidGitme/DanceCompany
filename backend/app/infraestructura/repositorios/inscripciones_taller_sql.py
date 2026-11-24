from sqlalchemy import text

from app.dominio.repositorios.repositorio_inscripciones_taller import (
    RepositorioInscripcionesTaller,
)
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import PagadorSql

COLUMNAS = """
    it.idInscripcionT AS "idInscripcion", it.idEstudiante AS "idEstudiante",
    p.nombre AS estudiante, p.documento,
    it.idTaller AS "idTaller", t.descripcion AS taller, it.fecha_inscripcion,
    it.idPago AS "idPago", pg.monto, pg.idMetodo AS "idMetodo", mp.nombre AS metodo,
    pg.idAcudiente AS "idAcudiente", pa.nombre AS pagador
"""
ORIGEN = """
    FROM inscripcion_talle it
    JOIN estudiante e ON e.idEstudiante = it.idEstudiante
    JOIN persona p ON p.idPersona = e.idPersona
    JOIN taller t ON t.idTaller = it.idTaller
    JOIN pago pg ON pg.idPago = it.idPago
    JOIN metodo_pago mp ON mp.idMetodo = pg.idMetodo
    JOIN acudiente a ON a.idAcudiente = pg.idAcudiente
    JOIN persona pa ON pa.idPersona = a.idPersona
"""

FILTROS = {"estudiante": "it.idEstudiante", "taller": "it.idTaller", "sede": "e.idSede"}


class RepositorioInscripcionesTallerSql(PagadorSql, RepositorioBaseSql, RepositorioInscripcionesTaller):
    def listar(self, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if buscar:
            condiciones.append(
                f"({sin_tildes('p.nombre')} LIKE {sin_tildes(':buscar')} OR p.documento LIKE :buscar "
                f"OR {sin_tildes('t.descripcion')} LIKE {sin_tildes(':buscar')})"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros or {}).items():
            if valor is not None:
                condiciones.append(f"{FILTROS[nombre]} = :{nombre}")
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            "it.fecha_inscripcion DESC, p.nombre", pagina, tamano,
        )

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE it.idInscripcionT = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_taller(self, id_taller):
        fila = self.sesion.execute(
            text('SELECT idTaller AS "idTaller", valor, idEstado AS "idEstado" FROM taller WHERE idTaller = :id'),
            {"id": id_taller},
        ).mappings().first()
        return dict(fila) if fila else None

    def inscripcion_existe(self, id_estudiante, id_taller):
        return self.sesion.execute(
            text("SELECT 1 FROM inscripcion_talle WHERE idEstudiante = :estudiante AND idTaller = :taller"),
            {"estudiante": id_estudiante, "taller": id_taller},
        ).first() is not None

    def crear(self, datos):
        def operacion():
            id_pago = self._insertar_pago({**datos, "fecha_pago": datos["fecha_inscripcion"]})
            return self.sesion.execute(
                text(
                    "INSERT INTO inscripcion_talle (idEstudiante, idTaller, fecha_inscripcion, idPago) "
                    "VALUES (:idEstudiante, :idTaller, :fecha_inscripcion, :idPago) RETURNING idInscripcionT"
                ),
                {**datos, "idPago": id_pago},
            ).scalar_one()

        return self.obtener(self._en_transaccion(operacion))

    def actualizar(self, identificador, datos):
        def operacion():
            id_pago = self.sesion.execute(
                text(
                    "UPDATE inscripcion_talle SET fecha_inscripcion = :fecha "
                    "WHERE idInscripcionT = :id RETURNING idPago"
                ),
                {"fecha": datos["fecha_inscripcion"], "id": identificador},
            ).scalar_one()
            self.sesion.execute(
                text("UPDATE pago SET idMetodo = :metodo, fecha_pago = :fecha WHERE idPago = :pago"),
                {"metodo": datos["idMetodo"], "fecha": datos["fecha_inscripcion"], "pago": id_pago},
            )

        self._en_transaccion(operacion)
        return self.obtener(identificador)

    def eliminar(self, identificador):
        def operacion():
            id_pago = self.sesion.execute(
                text("DELETE FROM inscripcion_talle WHERE idInscripcionT = :id RETURNING idPago"),
                {"id": identificador},
            ).scalar_one()
            self.sesion.execute(text("DELETE FROM pago WHERE idPago = :id"), {"id": id_pago})

        self._en_transaccion(operacion)
