from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_sedes import RepositorioSedes
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes

COLUMNAS = """
    s.idSede AS "idSede", s.nombre, s.direccion, s.idEstado AS "idEstado", es.nombre AS estado,
    (SELECT COUNT(*) FROM grupo g
      WHERE g.idSede = s.idSede AND g.idEstado = :activo) AS "gruposActivos",
    (SELECT COUNT(*) FROM estudiante e
      WHERE e.idSede = s.idSede AND e.idEstado = :activo) AS "estudiantesActivos"
"""
ORIGEN = "FROM sede s JOIN estados es ON es.idEstado = s.idEstado"


class RepositorioSedesSql(RepositorioBaseSql, RepositorioSedes):
    def listar(self, estado, buscar, pagina, tamano):
        filtros, parametros = [], {"activo": ESTADO_ACTIVO}
        if estado is not None:
            filtros.append("s.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(
                f"({sin_tildes('s.nombre')} LIKE {sin_tildes(':buscar')} "
                f"OR {sin_tildes('s.direccion')} LIKE {sin_tildes(':buscar')})"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "s.nombre", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text('SELECT idSede AS "idSede", nombre, direccion FROM sede WHERE idEstado = :activo ORDER BY nombre'),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE s.idSede = :id"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def nombre_existe(self, nombre, excluir_id=None):
        return self.sesion.execute(
            text(
                f"SELECT 1 FROM sede WHERE {sin_tildes('nombre')} = {sin_tildes(':nombre')} "
                "AND idSede <> :excluir"
            ),
            {"nombre": nombre, "excluir": excluir_id or 0},
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO sede (nombre, direccion, idEstado) "
            "VALUES (:nombre, :direccion, :idEstado) RETURNING idSede",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE sede SET nombre = :nombre, direccion = :direccion WHERE idSede = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE sede SET idEstado = :estado WHERE idSede = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
