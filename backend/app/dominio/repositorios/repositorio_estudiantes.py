from abc import ABC, abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_personas_rol import RepositorioPersonaRol


class RepositorioEstudiantes(RepositorioPersonaRol):
    @abstractmethod
    def tiene_matricula_activa(self, id_estudiante: int) -> bool:
        """True si el estudiante tiene alguna matrícula activa (bloquea el traslado de sede)."""


class RepositorioInscripciones(ABC):
    """Escrituras de la inscripción presencial. Nada se confirma hasta `confirmar()`."""

    @abstractmethod
    def buscar_persona(self, documento: str) -> dict[str, Any] | None:
        """Persona por documento con idAcudiente (o None) y si ya es estudiante."""

    @abstractmethod
    def obtener_persona(self, id_persona: int) -> dict[str, Any] | None: ...

    @abstractmethod
    def parentesco_existe(self, id_parentesco: int) -> bool: ...

    @abstractmethod
    def id_rol(self, nombre: str) -> int | None: ...

    @abstractmethod
    def insertar_persona(self, datos: dict[str, Any]) -> int: ...

    @abstractmethod
    def insertar_estudiante(self, id_persona: int, id_sede: int) -> int: ...

    @abstractmethod
    def asegurar_acudiente(self, id_persona: int) -> int:
        """Devuelve el idAcudiente de la persona; lo crea si no existe."""

    @abstractmethod
    def vincular_acudiente(self, id_estudiante: int, id_acudiente: int, id_parentesco: int) -> None: ...

    @abstractmethod
    def desvincular_acudiente(self, id_estudiante: int, id_acudiente: int) -> bool: ...

    @abstractmethod
    def acudientes_de(self, id_estudiante: int) -> list[dict[str, Any]]: ...

    @abstractmethod
    def crear_cuenta(self, documento: str, password_hash: str, id_rol: int) -> None: ...

    @abstractmethod
    def confirmar(self) -> None: ...

    @abstractmethod
    def deshacer(self) -> None: ...
