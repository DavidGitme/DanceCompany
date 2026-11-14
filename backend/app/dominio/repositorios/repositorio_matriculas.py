from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioMatriculas(RepositorioCatalogo):
    @abstractmethod
    def obtener_estudiante(self, id_estudiante: int) -> dict[str, Any] | None:
        """idEstudiante, idSede, idEstado y fecha_nacimiento."""

    @abstractmethod
    def obtener_grupo(self, id_grupo: int) -> dict[str, Any] | None:
        """idGrupo, idSede, idEstado, capacidad, edadMin, edadMax y matriculasActivas."""

    @abstractmethod
    def matricula_activa_en_grupo(
        self, id_estudiante: int, id_grupo: int, excluir_id: int | None = None
    ) -> bool: ...

    @abstractmethod
    def tiene_movimientos(self, id_matricula: int) -> bool:
        """True si ya tiene mensualidades o pagos."""
