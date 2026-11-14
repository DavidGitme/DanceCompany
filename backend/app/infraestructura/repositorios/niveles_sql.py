from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_niveles import RepositorioNiveles
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes

COLUMNAS = """
    n.idNivel AS "idNivel", n.nombre, n.orden,
    n.edad_minima AS "edadMin", n.edad_maxima AS "edadMax",
    n.idEstado AS "idEstado", es.nombre AS estado,
    (SELECT COUNT(*) FROM grupo g
      WHERE g.idNivel = n.idNivel AND g.idEstado = :activo) AS "gruposActivos"
"""
ORIGEN = "FROM nivel n JOIN estados es ON es.idEstado = n.idEstado"


class RepositorioNivelesSql(RepositorioBaseSql, RepositorioNiveles):
    def listar(self, estado, buscar, pagina, tamano):
        filtros, parametros = [], {"activo": ESTADO_ACTIVO}
        if estado is not None:
            filtros.append("n.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(f"{sin_tildes('n.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "n.orden", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                'SELECT idNivel AS "idNivel", nombre, orden, edad_minima AS "edadMin", '
                'edad_maxima AS "edadMax" FROM nivel WHERE idEstado = :activo ORDER BY orden'
            ),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE n.idNivel = :id"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def nombre_existe(self, nombre, excluir_id=None):
        return self.sesion.execute(
            text(
                f"SELECT 1 FROM nivel WHERE {sin_tildes('nombre')} = {sin_tildes(':nombre')} "
                "AND idNivel <> :excluir"
            ),
            {"nombre": nombre, "excluir": excluir_id or 0},
        ).first() is not None

    def orden_existe(self, orden, excluir_id=None):
        return self.sesion.execute(
            text("SELECT 1 FROM nivel WHERE orden = :orden AND idNivel <> :excluir"),
            {"orden": orden, "excluir": excluir_id or 0},
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO nivel (nombre, orden, edad_minima, edad_maxima, idEstado) "
            "VALUES (:nombre, :orden, :edadMin, :edadMax, :idEstado) RETURNING idNivel",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE nivel SET nombre = :nombre, orden = :orden, edad_minima = :edadMin, "
            "edad_maxima = :edadMax WHERE idNivel = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE nivel SET idEstado = :estado WHERE idNivel = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
