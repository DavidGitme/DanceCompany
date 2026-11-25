from abc import abstractmethod

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioPersonaRol(RepositorioCatalogo):
    """Base de estudiantes e instructores: ambos guardan sus datos en `persona`."""

    @abstractmethod
    def nombre_tipo_documento(self, id_tipo_documento: int) -> str | None:
        """Nombre del tipo de documento, o None si no existe."""

    @abstractmethod
    def documento_existe(self, documento: str, excluir_persona: int | None = None) -> bool: ...

    @abstractmethod
    def email_existe(self, email: str, excluir_persona: int | None = None) -> bool: ...

    @abstractmethod
    def sedes_activas(self, sedes: list[int]) -> set[int]:
        """Devuelve cuáles de las sedes recibidas existen y están activas."""
