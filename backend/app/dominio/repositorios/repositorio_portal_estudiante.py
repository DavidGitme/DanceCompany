from abc import ABC, abstractmethod
from typing import Any


class RepositorioCuentaEstudiante(ABC):
    """Cuenta y datos propios del estudiante que inicia sesión en su portal."""

    @abstractmethod
    def buscar_por_correo(self, correo: str) -> dict[str, Any] | None:
        """documento, nombre, password_hash, idEstadoUsuario, bloqueado, idEstudiante,
        idEstadoEstudiante y esEstudiante (tiene el rol Estudiante activo)."""

    @abstractmethod
    def id_estudiante_activo(self, documento: str) -> int | None:
        """Id del estudiante activo cuya persona tiene ese documento."""

    @abstractmethod
    def perfil(self, id_estudiante: int) -> dict[str, Any]: ...

    @abstractmethod
    def acudientes(self, id_estudiante: int) -> list[dict[str, Any]]: ...
