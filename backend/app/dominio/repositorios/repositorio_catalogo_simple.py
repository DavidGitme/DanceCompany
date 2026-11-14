from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_registro import RepositorioRegistro


class RepositorioCatalogoSimple(RepositorioRegistro):
    """Catálogos que solo tienen nombre: métodos de pago, tipos de convocatoria y de noticia."""

    @abstractmethod
    def nombre_existe(self, nombre: str, excluir_id: int | None = None) -> bool: ...

    @abstractmethod
    def disponibles(self) -> list[dict[str, Any]]: ...
