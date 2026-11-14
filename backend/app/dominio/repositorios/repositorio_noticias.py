from abc import abstractmethod
from datetime import datetime
from typing import Any

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo
from app.dominio.repositorios.repositorio_registro import RepositorioConEstadoPorCategoria


class RepositorioNoticias(RepositorioCatalogo, RepositorioConEstadoPorCategoria):
    @abstractmethod
    def tipo_existe(self, id_tipo: int) -> bool: ...

    # Las columnas son TIMESTAMP sin zona y la semilla usa el reloj de la base de datos:
    # todas las comparaciones usan ese mismo reloj para no desfasarse con el del servidor web.
    @abstractmethod
    def ahora(self) -> datetime:
        """Fecha y hora actual de la base de datos (sin zona)."""

    @abstractmethod
    def a_hora_local(self, valor: datetime | None) -> datetime | None:
        """Convierte una fecha con zona a la hora local de la base de datos (sin zona)."""

    @abstractmethod
    def publicas(self, id_tipo: int | None, limite: int, ahora: datetime) -> list[dict[str, Any]]:
        """Disponibles, ya publicadas y sin expirar."""

    @abstractmethod
    def marcar_expiradas(self, ahora: datetime) -> int:
        """Pasa a Expirada las disponibles cuya fecha de expiración ya pasó. Devuelve cuántas."""
