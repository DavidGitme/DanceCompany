from typing import Any

from app.dominio.excepciones.errores import NoEncontrado
from app.dominio.repositorios.repositorio_registro import RepositorioRegistro


class GestionarRegistro:
    """Flujo de los módulos sin `idEstado`: listar, ver, crear, editar y eliminar.

    Igual que `GestionarCatalogo`: cada módulo define `campos` y sus reglas en
    `validar`; además `validar_eliminacion` decide si el borrado físico es seguro.
    """

    recurso = "registro"
    mensaje_no_encontrado = "Registro no encontrado"
    campos: tuple[str, ...] = ()

    def __init__(self, repositorio: RepositorioRegistro):
        self.repositorio = repositorio

    def listar(self, buscar: str | None, pagina: int, tamano: int, filtros: dict[str, Any] | None = None):
        datos, total = self.repositorio.listar(buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, identificador: int) -> dict[str, Any]:
        registro = self.repositorio.obtener(identificador)
        if not registro:
            raise NoEncontrado(self.recurso, self.mensaje_no_encontrado)
        return registro

    def crear(self, datos: dict[str, Any]) -> dict[str, Any]:
        datos = self.normalizar(self.completar(dict(datos)))
        self.validar(datos)
        return self.repositorio.crear(datos)

    def actualizar(self, identificador: int, cambios: dict[str, Any]) -> dict[str, Any]:
        actual = self.obtener(identificador)
        # Lo que no llega en la petición conserva el valor guardado
        datos = {campo: cambios.get(campo, actual[campo]) for campo in self.campos}
        datos = self.normalizar(datos)
        self.validar(datos, identificador)
        return self.repositorio.actualizar(identificador, datos)

    def eliminar(self, identificador: int) -> None:
        self.validar_eliminacion(self.obtener(identificador))
        self.repositorio.eliminar(identificador)

    def completar(self, datos: dict[str, Any]) -> dict[str, Any]:
        """Valores por defecto antes de validar al crear (se sobreescribe si hace falta)."""
        return datos

    def normalizar(self, datos: dict[str, Any]) -> dict[str, Any]:
        """Ajusta formatos (al crear y al editar) antes de validar y guardar."""
        return datos

    def validar(self, datos: dict[str, Any], identificador: int | None = None) -> None:
        """Reglas propias del módulo. `identificador` es None al crear."""

    def validar_eliminacion(self, registro: dict[str, Any]) -> None:
        """Lanza un error si el registro no se puede borrar."""
