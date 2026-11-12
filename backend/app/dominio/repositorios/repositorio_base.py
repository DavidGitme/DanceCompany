from abc import ABC, abstractmethod
from typing import Any


class RepositorioCatalogo(ABC):
    """Operaciones comunes de los módulos con nombre y estado (sedes, estilos, niveles...)."""

    @abstractmethod
    def listar(
        self, estado: int | None, buscar: str | None, pagina: int, tamano: int
    ) -> tuple[list[dict[str, Any]], int]: ...

    @abstractmethod
    def disponibles(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def obtener(self, identificador: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def crear(self, datos: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def actualizar(self, identificador: int, datos: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def cambiar_estado(self, identificador: int, id_estado: int) -> dict[str, Any]: ...

    @abstractmethod
    def estado_existe(self, id_estado: int) -> bool: ...
