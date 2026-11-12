from abc import abstractmethod

from app.dominio.repositorios.repositorio_personas_rol import RepositorioPersonaRol


class RepositorioInstructores(RepositorioPersonaRol):
    @abstractmethod
    def sedes_con_grupos_activos(self, id_instructor: int) -> set[int]: ...
