from abc import abstractmethod
from typing import Any

from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class RepositorioMatriculas(RepositorioCatalogo):
    @abstractmethod
    def obtener_estudiante(self, id_estudiante: int) -> dict[str, Any] | None:
        """idEstudiante, idSede, idEstado y fecha_nacimiento."""

    @abstractmethod
    def obtener_grupo(self, id_grupo: int) -> dict[str, Any] | None:
        """idGrupo, idSede, idEstado, capacidad, edadMin, edadMax y matriculasActivas
        (activas + pendientes: una matrícula en proceso ya ocupa su cupo)."""

    @abstractmethod
    def matricula_activa_en_grupo(
        self, id_estudiante: int, id_grupo: int, excluir_id: int | None = None
    ) -> bool:
        """True si el estudiante ya tiene una matrícula activa o pendiente en el grupo."""

    @abstractmethod
    def tiene_movimientos(self, id_matricula: int) -> bool:
        """True si ya tiene mensualidades o pagos."""

    # ---------- Proceso de aprobación (bd/08_matricula_aprobacion.sql) ----------
    @abstractmethod
    def aprobacion_disponible(self) -> bool:
        """True si la base ya tiene la migración 08 (requisitos y estado Pendiente)."""

    @abstractmethod
    def id_estado_pendiente(self) -> int | None:
        """idEstado de 'Pendiente' (categoría matricula); None sin la migración."""

    @abstractmethod
    def estados(self) -> list[dict[str, Any]]:
        """Estados que puede tener una matrícula: idEstado y nombre."""

    @abstractmethod
    def requisitos(self, id_matricula: int | None = None) -> list[dict[str, Any]]:
        """Requisitos activos, en orden. Con matrícula, indica cuáles cumplió y quién los marcó."""

    @abstractmethod
    def obtener_requisito(self, id_requisito: int) -> dict[str, Any] | None:
        """idRequisito, nombre, responsable e idEstado."""

    @abstractmethod
    def marcar_requisito(
        self, id_matricula: int, id_requisito: int, cumplido: bool,
        documento: str | None, observacion: str | None,
    ) -> None: ...

    @abstractmethod
    def aprobar(self, id_matricula: int, documento: str | None) -> dict[str, Any]:
        """Deja la matrícula Activa con la fecha y el usuario que la aprobó."""

    @abstractmethod
    def id_instructor_por_documento(self, documento: str) -> int | None:
        """Instructor activo de la cuenta que inició sesión."""

    @abstractmethod
    def pendientes_de_instructor(self, id_instructor: int) -> list[dict[str, Any]]:
        """Matrículas pendientes de los grupos activos del instructor."""

    @abstractmethod
    def estudiantes_para_matricular(self, sede: int | None = None) -> list[dict[str, Any]]:
        """Estudiantes activos con su sede y fecha de nacimiento."""

    @abstractmethod
    def grupos_para_matricular(self, sede: int | None = None) -> list[dict[str, Any]]:
        """Grupos activos con rango de edad del nivel, capacidad y cupos ocupados."""
