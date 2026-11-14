from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo
from app.dominio.repositorios.repositorio_registro import (
    RepositorioConEstadoPorCategoria,
    RepositorioRegistro,
)


class RepositorioConvocatorias(RepositorioRegistro):
    @abstractmethod
    def tipo_existe(self, id_tipo: int) -> bool: ...

    @abstractmethod
    def nombre_existe(self, nombre: str, excluir_id: int | None = None) -> bool: ...

    @abstractmethod
    def disponibles(self) -> list[dict[str, Any]]:
        """Convocatorias abiertas hoy, para postular estudiantes."""

    @abstractmethod
    def tiene_grupo_competencia(self, id_convocatoria: int) -> bool: ...


class RepositorioPostulaciones(RepositorioCatalogo, RepositorioConEstadoPorCategoria):
    @abstractmethod
    def obtener_convocatoria(self, id_convocatoria: int) -> dict[str, Any] | None:
        """idConvocatoria y vigencia."""

    @abstractmethod
    def estudiante_activo(self, id_estudiante: int) -> bool: ...

    @abstractmethod
    def postulacion_existe(self, id_convocatoria: int, id_estudiante: int) -> bool: ...

    @abstractmethod
    def eliminar(self, identificador: int) -> None: ...
