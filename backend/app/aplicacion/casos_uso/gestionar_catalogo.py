from typing import Any

from app.dominio.excepciones.errores import DatoInvalido, NoEncontrado
from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_base import RepositorioCatalogo


class GestionarCatalogo:
    """Flujo común de los módulos: listar, ver, crear, editar y cambiar estado.

    Cada módulo hereda de aquí, define sus `campos` editables y escribe sus
    reglas en `validar`.
    """

    recurso = "registro"
    mensaje_no_encontrado = "Registro no encontrado"
    campos: tuple[str, ...] = ()

    def __init__(self, repositorio: RepositorioCatalogo):
        self.repositorio = repositorio

    def listar(self, estado: int | None, buscar: str | None, pagina: int, tamano: int):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def disponibles(self) -> list[dict[str, Any]]:
        return self.repositorio.disponibles()

    def obtener(self, identificador: int) -> dict[str, Any]:
        registro = self.repositorio.obtener(identificador)
        if not registro:
            raise NoEncontrado(self.recurso, self.mensaje_no_encontrado)
        return registro

    def crear(self, datos: dict[str, Any]) -> dict[str, Any]:
        datos = {**datos, "idEstado": ESTADO_ACTIVO}
        self.validar(datos)
        return self.repositorio.crear(datos)

    def actualizar(self, identificador: int, cambios: dict[str, Any]) -> dict[str, Any]:
        actual = self.valores_actuales(self.obtener(identificador))
        # Lo que no llega en la petición conserva el valor guardado
        datos = {campo: cambios.get(campo, actual[campo]) for campo in self.campos}
        self.validar(datos, identificador)
        return self.repositorio.actualizar(identificador, datos)

    def cambiar_estado(self, identificador: int, id_estado: int) -> dict[str, Any]:
        self.obtener(identificador)
        if not self.repositorio.estado_existe(id_estado):
            raise DatoInvalido("El estado indicado no existe.")
        return self.repositorio.cambiar_estado(identificador, id_estado)

    def valores_actuales(self, registro: dict[str, Any]) -> dict[str, Any]:
        """Convierte el detalle guardado al formato de entrada (se sobreescribe si difieren)."""
        return registro

    def validar(self, datos: dict[str, Any], identificador: int | None = None) -> None:
        """Reglas propias del módulo. `identificador` es None al crear."""
