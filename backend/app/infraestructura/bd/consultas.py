"""Piezas de SQL (PostgreSQL) que comparten los repositorios académicos."""

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dominio.reglas import CON_TILDE, SIN_TILDE


def sin_tildes(expresion: str) -> str:
    """Devuelve la expresión en minúsculas y sin tildes, para buscar y validar duplicados."""
    return f"translate(lower(trim({expresion})), '{CON_TILDE}', '{SIN_TILDE}')"


def listar_paginado(
    sesion: Session,
    columnas: str,
    origen: str,
    filtros: list[str],
    parametros: dict[str, Any],
    orden: str,
    pagina: int,
    tamano: int,
) -> tuple[list[dict[str, Any]], int]:
    """Arma el WHERE con los filtros recibidos y devuelve (filas, total)."""
    where = f"WHERE {' AND '.join(filtros)}" if filtros else ""
    total = sesion.execute(
        text(f"SELECT COUNT(*) {origen} {where}"), parametros
    ).scalar_one()
    filas = sesion.execute(
        text(f"SELECT {columnas} {origen} {where} ORDER BY {orden} LIMIT :tamano OFFSET :inicio"),
        {**parametros, "tamano": tamano, "inicio": (pagina - 1) * tamano},
    ).mappings()
    return [dict(fila) for fila in filas], total


class RepositorioBaseSql:
    def __init__(self, sesion: Session):
        self.sesion = sesion

    def estado_existe(self, id_estado: int) -> bool:
        return self.sesion.execute(
            text("SELECT 1 FROM estados WHERE idEstado = :id"), {"id": id_estado}
        ).first() is not None

    def _guardar(self, sql: str, parametros: dict[str, Any]):
        """Ejecuta una escritura y confirma; si falla, deshace la transacción."""
        try:
            resultado = self.sesion.execute(text(sql), parametros)
            self.sesion.commit()
            return resultado
        except Exception:
            self.sesion.rollback()
            raise
