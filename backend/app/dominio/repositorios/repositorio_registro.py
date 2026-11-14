from abc import ABC, abstractmethod
from typing import Any


class RepositorioRegistro(ABC):
    """Operaciones de los módulos cuya tabla no tiene `idEstado` (horarios, pagos...).

    Como no hay baja lógica, el borrado es físico y cada caso de uso decide cuándo se permite.
    """

    @abstractmethod
    def listar(
        self, buscar: str | None, pagina: int, tamano: int, filtros: dict[str, Any]
    ) -> tuple[list[dict[str, Any]], int]: ...

    @abstractmethod
    def obtener(self, identificador: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def crear(self, datos: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def actualizar(self, identificador: int, datos: dict[str, Any]) -> dict[str, Any]: ...

    @abstractmethod
    def eliminar(self, identificador: int) -> None: ...


class RepositorioConEstadoPorCategoria(ABC):
    """Para tablas cuyo `idEstado` pertenece a una categoría propia (mensualidad, noticia...)."""

    @abstractmethod
    def id_estado(self, nombre: str) -> int:
        """Id del estado con ese nombre dentro de la categoría del módulo."""

    @abstractmethod
    def estado_existe(self, id_estado: int) -> bool:
        """True solo si el estado existe y es de la categoría del módulo."""

    @abstractmethod
    def nombre_estado(self, id_estado: int) -> str | None: ...
