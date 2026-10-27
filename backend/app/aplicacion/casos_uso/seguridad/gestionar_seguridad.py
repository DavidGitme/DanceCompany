from typing import Any

from app.dominio.excepciones.errores import NoEncontrado
from app.dominio.repositorios.repositorio_seguridad import RepositorioSeguridad


class GestionarSeguridad:
    def __init__(self, repositorio: RepositorioSeguridad):
        self.repositorio = repositorio

    def listar(self, recurso: str, pagina: int, tamano: int) -> dict[str, Any]:
        datos, total = self.repositorio.listar(recurso, pagina, tamano)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, recurso: str, identificador: int | str) -> dict[str, Any]:
        registro = self.repositorio.obtener(recurso, identificador)
        if not registro:
            raise NoEncontrado(recurso)
        return registro

    def crear(self, recurso: str, datos: dict[str, Any]) -> dict[str, Any]:
        return self.repositorio.crear(recurso, datos)

    def actualizar(
        self, recurso: str, identificador: int | str, datos: dict[str, Any]
    ) -> dict[str, Any]:
        registro = self.repositorio.actualizar(recurso, identificador, datos)
        if not registro:
            raise NoEncontrado(recurso)
        return registro

    def inactivar(self, recurso: str, identificador: int | str) -> dict[str, Any]:
        registro = self.repositorio.inactivar(recurso, identificador)
        if not registro:
            raise NoEncontrado(recurso)
        return registro
