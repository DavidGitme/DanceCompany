from typing import Any

from app.dominio.excepciones.errores import DatoInvalido, NoEncontrado
from app.dominio.repositorios.repositorio_seguridad import RepositorioSeguridad


# Estos catálogos no tienen columna idEstado: no se pueden inactivar
SIN_ESTADO = {"permisos", "estados"}


class GestionarSeguridad:
    def __init__(self, repositorio: RepositorioSeguridad):
        self.repositorio = repositorio

    def listar(
        self, recurso: str, pagina: int, tamano: int, sede: int | None = None, buscar: str | None = None
    ) -> dict[str, Any]:
        datos, total = self.repositorio.listar(recurso, pagina, tamano, sede, buscar)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, recurso: str, identificador: int | str) -> dict[str, Any]:
        registro = self.repositorio.obtener(recurso, identificador)
        if not registro:
            raise NoEncontrado(recurso)
        return registro

    def crear(self, recurso: str, datos: dict[str, Any]) -> dict[str, Any]:
        # La cuenta de usuario se crea para una persona que ya existe (llave: documento)
        if recurso == "usuarios" and not self.repositorio.persona_existe(datos["documento"]):
            raise DatoInvalido("No existe una persona con ese documento. Créala primero en Personas.")
        return self.repositorio.crear(recurso, datos)

    def actualizar(
        self, recurso: str, identificador: int | str, datos: dict[str, Any]
    ) -> dict[str, Any]:
        registro = self.repositorio.actualizar(recurso, identificador, datos)
        if not registro:
            raise NoEncontrado(recurso)
        return registro

    def inactivar(self, recurso: str, identificador: int | str) -> dict[str, Any]:
        if recurso in SIN_ESTADO:
            raise DatoInvalido(f"Los {recurso} no se inactivan.")
        registro = self.repositorio.inactivar(recurso, identificador)
        if not registro:
            raise NoEncontrado(recurso)
        return registro
