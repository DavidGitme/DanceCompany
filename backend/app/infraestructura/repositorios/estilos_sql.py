from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_estilos import RepositorioEstilos
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes

COLUMNAS = """
    e.idEstilo AS "idEstilo", e.nombre, e.idEstado AS "idEstado", es.nombre AS estado,
    (SELECT COUNT(*) FROM grupo g
      WHERE g.idEstilo = e.idEstilo AND g.idEstado = :activo) AS "gruposActivos"
"""
ORIGEN = "FROM estilo e JOIN estados es ON es.idEstado = e.idEstado"


class RepositorioEstilosSql(RepositorioBaseSql, RepositorioEstilos):
    def listar(self, estado, buscar, pagina, tamano):
        filtros, parametros = [], {"activo": ESTADO_ACTIVO}
        if estado is not None:
            filtros.append("e.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(f"{sin_tildes('e.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "e.nombre", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text('SELECT idEstilo AS "idEstilo", nombre FROM estilo WHERE idEstado = :activo ORDER BY nombre'),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE e.idEstilo = :id"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def nombre_existe(self, nombre, excluir_id=None):
        return self.sesion.execute(
            text(
                f"SELECT 1 FROM estilo WHERE {sin_tildes('nombre')} = {sin_tildes(':nombre')} "
                "AND idEstilo <> :excluir"
            ),
            {"nombre": nombre, "excluir": excluir_id or 0},
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO estilo (nombre, idEstado) VALUES (:nombre, :idEstado) RETURNING idEstilo",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE estilo SET nombre = :nombre WHERE idEstilo = :id", {**datos, "id": identificador}
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE estilo SET idEstado = :estado WHERE idEstilo = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
