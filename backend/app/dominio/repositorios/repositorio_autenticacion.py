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

    @abstractmethod
    def privilegios_de_roles(self, roles: list[int]) -> dict[str, list[str]]:
        """Módulo -> acciones permitidas (ver, crear, editar, eliminar) de los roles recibidos."""

    @abstractmethod
    def tiene_privilegio(self, documento: str, modulo: str, accion: str) -> bool:
        """True si algún rol activo de la cuenta tiene esa acción en ese módulo."""

    @abstractmethod
    def aceptar_terminos(self, documento: str, version: str) -> None:
        """Guarda la versión de los términos que aceptó la cuenta y la fecha."""
