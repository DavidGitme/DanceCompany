from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_pagador import RepositorioPagador
from app.dominio.repositorios.repositorio_registro import RepositorioRegistro


class RepositorioInscripcionesTaller(RepositorioRegistro, RepositorioPagador):
    @abstractmethod
    def obtener_taller(self, id_taller: int) -> dict[str, Any] | None:
        """idTaller, valor e idEstado."""

    @abstractmethod
    def inscripcion_existe(self, id_estudiante: int, id_taller: int) -> bool: ...
