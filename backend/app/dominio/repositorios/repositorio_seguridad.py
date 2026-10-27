from abc import ABC, abstractmethod
from typing import Any


class RepositorioSeguridad(ABC):
    @abstractmethod
    def listar(self, recurso: str, pagina: int, tamano: int) -> tuple[list[dict[str, Any]], int]:
        raise NotImplementedError

    @abstractmethod
    def obtener(self, recurso: str, identificador: int | str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def crear(self, recurso: str, datos: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError

    @abstractmethod
    def actualizar(
        self, recurso: str, identificador: int | str, datos: dict[str, Any]
    ) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def inactivar(self, recurso: str, identificador: int | str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def buscar_usuario_por_documento(self, documento: str) -> dict[str, Any] | None:
        raise NotImplementedError

    @abstractmethod
    def permisos_de_roles(self, roles: list[int]) -> tuple[list[str], list[str]]:
        raise NotImplementedError

    @abstractmethod
    def asignar_permisos_rol(self, id_rol: int, permisos: list[int]) -> list[int]:
        raise NotImplementedError
