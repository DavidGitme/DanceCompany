from abc import ABC, abstractmethod
from typing import Any


class RepositorioPortalInstructor(ABC):
    """Consultas de solo lectura del portal del instructor que inició sesión."""

    @abstractmethod
    def perfil_por_documento(self, documento: str) -> dict[str, Any] | None: ...

    @abstractmethod
    def grupos(self, id_instructor: int) -> list[dict[str, Any]]: ...

    @abstractmethod
    def horarios(self, grupos: list[int]) -> list[dict[str, Any]]: ...

    @abstractmethod
    def estudiantes(self, id_instructor: int) -> list[dict[str, Any]]: ...

    @abstractmethod
    def mensualidades(self, matriculas: list[int]) -> list[dict[str, Any]]: ...
