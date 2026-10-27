from abc import ABC, abstractmethod
from typing import Any


class HasherClaves(ABC):
    @abstractmethod
    def crear_hash(self, clave: str) -> str:
        raise NotImplementedError

    @abstractmethod
    def verificar(self, clave: str, hash_guardado: str) -> bool:
        raise NotImplementedError


class EmisorTokens(ABC):
    @abstractmethod
    def emitir_acceso(
        self, documento: str, roles: list[str], permisos: list[str]
    ) -> tuple[str, int]:
        raise NotImplementedError

    @abstractmethod
    def emitir_refresh(self, documento: str) -> tuple[str, int]:
        raise NotImplementedError

    @abstractmethod
    def decodificar(self, token: str, tipo: str) -> dict[str, Any]:
        raise NotImplementedError
