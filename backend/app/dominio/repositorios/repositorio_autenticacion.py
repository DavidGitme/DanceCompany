from abc import ABC, abstractmethod
from typing import Any


class RepositorioAutenticacion(ABC):
    """Lo mínimo que necesita el login: buscar la cuenta y resolver sus roles."""

    @abstractmethod
    def buscar_usuario_por_documento(self, documento: str) -> dict[str, Any] | None:
        """Devuelve nombre, password_hash, idEstado, idSede, sede y roles (ids) de la cuenta."""

    @abstractmethod
    def permisos_de_roles(self, roles: list[int]) -> tuple[list[str], list[str]]:
        """Devuelve (nombres de rol, permisos) de los roles recibidos."""
