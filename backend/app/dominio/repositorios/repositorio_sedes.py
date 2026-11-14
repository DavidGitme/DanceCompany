from abc import abstractmethod

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioSedes(RepositorioCatalogo):
    @abstractmethod
    def nombre_existe(self, nombre: str, excluir_id: int | None = None) -> bool: ...
