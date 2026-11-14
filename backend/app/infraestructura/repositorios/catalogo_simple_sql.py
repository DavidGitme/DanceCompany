"""Repositorio genérico para las tablas con solo `nombre` (sin estado)."""

from sqlalchemy import text

from app.dominio.repositorios.repositorio_catalogo_simple import RepositorioCatalogoSimple
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes


class RepositorioCatalogoSimpleSql(RepositorioBaseSql, RepositorioCatalogoSimple):
    """Cada subclase fija la tabla y cómo contar los registros que la usan.

    Los nombres de tabla y columna son constantes del código: nunca llegan del usuario.
    """

    tabla = ""
    columna_id = ""
    alias_id = ""
    # SQL que cuenta las filas que usan el registro; `c` es el alias de la tabla
    conteo_usos = "0"

    def _columnas(self) -> str:
        return (
            f'c.{self.columna_id} AS "{self.alias_id}", c.nombre, '
            f'({self.conteo_usos}) AS "registrosAsociados"'
        )

    def listar(self, buscar, pagina, tamano, filtros=None):
        filtros_sql, parametros = [], {}
        if buscar:
            filtros_sql.append(f"{sin_tildes('c.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, self._columnas(), f"FROM {self.tabla} c", filtros_sql, parametros,
            "c.nombre", pagina, tamano,
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(f'SELECT {self.columna_id} AS "{self.alias_id}", nombre FROM {self.tabla} ORDER BY nombre')
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {self._columnas()} FROM {self.tabla} c WHERE c.{self.columna_id} = :id"),
            {"id": identificador},
        ).mappings().first()
        return dict(fila) if fila else None

    def nombre_existe(self, nombre, excluir_id=None):
        return self.sesion.execute(
            text(
                f"SELECT 1 FROM {self.tabla} WHERE {sin_tildes('nombre')} = {sin_tildes(':nombre')} "
                f"AND {self.columna_id} <> :excluir"
            ),
            {"nombre": nombre, "excluir": excluir_id or 0},
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            f"INSERT INTO {self.tabla} (nombre) VALUES (:nombre) RETURNING {self.columna_id}",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            f"UPDATE {self.tabla} SET nombre = :nombre WHERE {self.columna_id} = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def eliminar(self, identificador):
        self._guardar(f"DELETE FROM {self.tabla} WHERE {self.columna_id} = :id", {"id": identificador})
