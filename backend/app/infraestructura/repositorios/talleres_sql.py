from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_talleres import RepositorioTalleres
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes

COLUMNAS = """
    t.idTaller AS "idTaller", t.descripcion, t.valor, t.idEstado AS "idEstado", es.nombre AS estado
"""
ORIGEN = "FROM taller t JOIN estados es ON es.idEstado = t.idEstado"


class RepositorioTalleresSql(RepositorioBaseSql, RepositorioTalleres):
    def listar(self, estado, buscar, pagina, tamano):
        filtros, parametros = [], {}
        if estado is not None:
            filtros.append("t.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(f"{sin_tildes('t.descripcion')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "t.descripcion", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                'SELECT idTaller AS "idTaller", descripcion, valor FROM taller '
                "WHERE idEstado = :activo ORDER BY descripcion"
            ),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE t.idTaller = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO taller (descripcion, valor, idEstado) "
            "VALUES (:descripcion, :valor, :idEstado) RETURNING idTaller",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE taller SET descripcion = :descripcion, valor = :valor WHERE idTaller = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE taller SET idEstado = :estado WHERE idTaller = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
