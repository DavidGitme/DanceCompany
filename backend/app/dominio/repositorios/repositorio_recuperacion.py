from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any


class RepositorioRecuperacion(ABC):
    """Enlaces de un solo uso para crear o recuperar la contraseña (tabla recuperacion_clave)."""

    @abstractmethod
    def cuenta(self, documento: str) -> dict[str, Any] | None:
        """documento, nombre, email e idEstado de la cuenta."""

    @abstractmethod
    def guardar_token(self, documento: str, token_hash: str, expira: datetime) -> None:
        """Invalida los enlaces anteriores sin usar y guarda el nuevo."""

    @abstractmethod
    def consumir_token(self, token_hash: str) -> str | None:
        """Marca el enlace como usado y devuelve el documento si era válido y vigente."""

    @abstractmethod
    def cambiar_clave(self, documento: str, password_hash: str) -> None:
        """Nueva contraseña; también quita el bloqueo por intentos fallidos."""

    @abstractmethod
    def confirmar(self) -> None: ...

    @abstractmethod
    def deshacer(self) -> None: ...
