from abc import ABC, abstractmethod
from typing import Any


class RepositorioGruposCompetencia(ABC):
    """Grupos que representan a la academia en una convocatoria (grupo_competencia)."""

    @abstractmethod
    def listar(self, buscar: str | None, pagina: int, tamano: int, filtros: dict[str, Any]) -> tuple[list[dict], int]: ...

    @abstractmethod
    def obtener(self, identificador: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def grupo(self, id_grupo: int) -> dict[str, Any] | None:
        """idGrupo, idSede e idEstado del grupo."""

    @abstractmethod
    def convocatoria_existe(self, id_convocatoria: int) -> bool: ...

    @abstractmethod
    def grupo_ya_compite(self, id_grupo: int, excluir_id: int | None = None) -> bool: ...

    @abstractmethod
    def aceptados(self, id_convocatoria: int, sede: int | None) -> list[dict[str, Any]]:
        """Estudiantes activos con postulación Aceptada en la convocatoria (de la sede)."""

    @abstractmethod
    def crear(self, id_grupo: int, id_convocatoria: int, estudiantes: list[int]) -> int: ...

    @abstractmethod
    def actualizar(self, identificador: int, id_convocatoria: int, estudiantes: list[int]) -> None: ...

    @abstractmethod
    def eliminar(self, identificador: int) -> None: ...
