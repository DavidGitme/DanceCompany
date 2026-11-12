from abc import abstractmethod

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioNiveles(RepositorioCatalogo):
    @abstractmethod
    def nombre_existe(self, nombre: str, excluir_id: int | None = None) -> bool: ...

    @abstractmethod
    def orden_existe(self, orden: int, excluir_id: int | None = None) -> bool: ...
