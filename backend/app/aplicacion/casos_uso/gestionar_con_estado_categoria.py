from typing import Any

from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import DatoInvalido


class GestionarConEstadoPorCategoria(GestionarCatalogo):
    """Como `GestionarCatalogo`, pero el estado sale de una categoría propia de `estados`.

    Mensualidades (Pendiente, Pagada...), postulaciones (Postulado, Aceptado...) y
    noticias (Disponible, Expirada) no usan Activo/Inactivo.
    """

    estado_inicial = ""
    mensaje_estado_invalido = "El estado indicado no es válido para este registro."

    def crear(self, datos: dict[str, Any]) -> dict[str, Any]:
        datos = {**self.completar(dict(datos)), "idEstado": self.repositorio.id_estado(self.estado_inicial)}
        self.validar(datos)
        return self.repositorio.crear(datos)

    def cambiar_estado(self, identificador: int, id_estado: int) -> dict[str, Any]:
        registro = self.obtener(identificador)
        if not self.repositorio.estado_existe(id_estado):
            raise DatoInvalido(self.mensaje_estado_invalido)
        self.validar_cambio_estado(registro, self.repositorio.nombre_estado(id_estado))
        return self.repositorio.cambiar_estado(identificador, id_estado)

    def completar(self, datos: dict[str, Any]) -> dict[str, Any]:
        """Valores por defecto al crear."""
        return datos

    def validar_cambio_estado(self, registro: dict[str, Any], nuevo_estado: str) -> None:
        """Reglas para pasar al estado `nuevo_estado` (nombre)."""
