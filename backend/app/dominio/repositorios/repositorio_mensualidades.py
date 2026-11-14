from abc import abstractmethod
from datetime import date
from typing import Any

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo
from app.dominio.repositorios.repositorio_registro import RepositorioConEstadoPorCategoria


class RepositorioMensualidades(RepositorioCatalogo, RepositorioConEstadoPorCategoria):
    @abstractmethod
    def obtener_matricula(self, id_matricula: int) -> dict[str, Any] | None:
        """idMatricula e idEstado."""

    @abstractmethod
    def existe_en_periodo(
        self, id_matricula: int, fecha_cobro: date, excluir_id: int | None = None
    ) -> bool:
        """True si la matrícula ya tiene una mensualidad en el mismo año y mes."""

    @abstractmethod
    def marcar_vencidas(self, hoy: date) -> int:
        """Pasa a Vencida las pendientes con fecha límite anterior a hoy. Devuelve cuántas."""
