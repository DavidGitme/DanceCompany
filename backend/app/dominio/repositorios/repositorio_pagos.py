from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_pagador import RepositorioPagador
from app.dominio.repositorios.repositorio_registro import RepositorioRegistro


class RepositorioPagos(RepositorioRegistro, RepositorioPagador):
    @abstractmethod
    def obtener_mensualidad(self, id_mensualidad: int) -> dict[str, Any] | None:
        """idMensualidad, idEstudiante y saldo."""

    @abstractmethod
    def obtener_matricula(self, id_matricula: int) -> dict[str, Any] | None:
        """idMatricula, idEstudiante y saldo."""
