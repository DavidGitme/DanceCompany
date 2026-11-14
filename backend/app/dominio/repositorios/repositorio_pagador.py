from abc import ABC, abstractmethod
from typing import Any


class RepositorioPagador(ABC):
    """Consultas para validar quién paga (pagos e inscripciones a talleres).

    `pago.idAcudiente` es obligatorio: cuando paga el propio estudiante (adulto),
    el repositorio usa o crea el registro de acudiente de su misma persona.
    """

    @abstractmethod
    def obtener_estudiante(self, id_estudiante: int) -> dict[str, Any] | None:
        """idEstudiante, idSede, idEstado y fecha_nacimiento."""

    @abstractmethod
    def acudiente_activo(self, id_acudiente: int) -> bool: ...

    @abstractmethod
    def acudiente_responsable(self, id_acudiente: int, id_estudiante: int) -> bool:
        """True si es su acudiente registrado o es la misma persona del estudiante."""

    @abstractmethod
    def metodo_existe(self, id_metodo: int) -> bool: ...

    @abstractmethod
    def acudientes_de_estudiante(self, id_estudiante: int) -> list[dict[str, Any]]: ...
