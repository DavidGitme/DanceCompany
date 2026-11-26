from abc import ABC, abstractmethod
from typing import Any


class RepositorioPortalInstructor(ABC):
    """Consultas del portal del instructor que inició sesión y los cambios de su propia cuenta."""

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

    @abstractmethod
    def actualizar_contacto(self, documento: str, correo: str, telefono: str | None) -> None: ...

    @abstractmethod
    def hash_clave(self, documento: str) -> str | None: ...

    @abstractmethod
    def guardar_clave(self, documento: str, password_hash: str) -> None: ...

    @abstractmethod
    def confirmar(self) -> None: ...

    @abstractmethod
    def deshacer(self) -> None: ...
