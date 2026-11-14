from abc import abstractmethod
from datetime import time
from typing import Any

from app.dominio.repositorios.repositorio_registro import RepositorioRegistro


class RepositorioHorarios(RepositorioRegistro):
    @abstractmethod
    def obtener_grupo(self, id_grupo: int) -> dict[str, Any] | None:
        """idGrupo, nombre, idAula e idEstado del grupo."""

    @abstractmethod
    def cruce_en_grupo(
        self, id_grupo: int, dia: str, inicio: time, fin: time, excluir_id: int | None
    ) -> bool: ...

    @abstractmethod
    def cruce_en_aula(
        self, id_aula: int, id_grupo: int, dia: str, inicio: time, fin: time, excluir_id: int | None
    ) -> dict[str, Any] | None:
        """Primer horario de OTRO grupo activo que ocupa el aula en ese rango."""
