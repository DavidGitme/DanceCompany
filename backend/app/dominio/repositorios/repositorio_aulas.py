from abc import abstractmethod

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioAulas(RepositorioCatalogo):
    @abstractmethod
    def sede_activa(self, id_sede: int) -> bool: ...

    @abstractmethod
    def cantidad_grupos(self, id_aula: int) -> int:
        """Grupos (activos o no) que usan el aula."""

    @abstractmethod
    def capacidad_maxima_grupos_activos(self, id_aula: int) -> int:
        """La mayor capacidad entre los grupos activos del aula (0 si no tiene)."""
