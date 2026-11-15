from abc import abstractmethod

from app.dominio.repositorios.repositorio_personas_rol import RepositorioPersonaRol


class RepositorioInstructores(RepositorioPersonaRol):
    @abstractmethod
    def sedes_con_grupos_activos(self, id_instructor: int) -> set[int]: ...

    @abstractmethod
    def tiene_cuenta(self, documento: str) -> bool: ...

    @abstractmethod
    def id_rol_por_nombre(self, nombre: str) -> int | None: ...

    @abstractmethod
    def crear_cuenta(self, documento: str, password_hash: str, id_rol: int) -> None: ...
