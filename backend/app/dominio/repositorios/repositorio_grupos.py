from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioGrupos(RepositorioCatalogo):
    @abstractmethod
    def esta_activo(self, tabla: str, identificador: int) -> bool:
        """tabla: 'nivel', 'estilo', 'instructor' o 'sede'."""

    @abstractmethod
    def obtener_aula(self, id_aula: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def tipo_grupo_existe(self, id_tipo: int) -> bool: ...

    @abstractmethod
    def instructor_en_sede(self, id_instructor: int, id_sede: int) -> bool: ...

    @abstractmethod
    def nombre_en_sede_existe(self, nombre: str, id_sede: int, excluir_id: int | None = None) -> bool: ...

    @abstractmethod
    def listar_tipos(self) -> list[dict[str, Any]]: ...

    @abstractmethod
    def listar_aulas(self, id_sede: int) -> list[dict[str, Any]]: ...
