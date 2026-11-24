from datetime import date

from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import (
    error_documento,
    normalizar_documento,
    normalizar_telefono,
    telefono_valido,
)
from app.dominio.repositorios.repositorio_personas_rol import RepositorioPersonaRol

CAMPOS_PERSONA = ("nombre", "idTipoDocumento", "documento", "telefono", "email", "fecha_nacimiento")


class GestionarPersonaRol(GestionarCatalogo):
    """Reglas de los datos personales, compartidas por estudiantes e instructores."""

    repositorio: RepositorioPersonaRol

    def validar_persona(self, datos, identificador=None) -> str:
        """Normaliza documento, teléfono y correo (cambia `datos`) y devuelve el tipo de documento."""
        # Al editar se excluye la propia persona para no chocar consigo misma
        id_persona = self.obtener(identificador)["idPersona"] if identificador else None
        tipo = self.repositorio.nombre_tipo_documento(datos["idTipoDocumento"])
        if not tipo:
            raise DatoInvalido("El tipo de documento no existe.")

        datos["documento"] = normalizar_documento(datos["documento"])
        if len(datos["documento"]) < 5:
            raise DatoInvalido("El documento debe tener al menos 5 caracteres.")
        error = error_documento(tipo, datos["documento"])
        if error:
            raise DatoInvalido(error)
        if datos.get("telefono"):
            datos["telefono"] = normalizar_telefono(datos["telefono"])
            if not telefono_valido(datos["telefono"]):
                raise DatoInvalido("El teléfono debe tener entre 7 y 15 dígitos.")
        if datos.get("email"):
            datos["email"] = datos["email"].strip().lower()
        if datos.get("fecha_nacimiento") and datos["fecha_nacimiento"] > date.today():
            raise DatoInvalido("La fecha de nacimiento no puede ser futura.")

        if self.repositorio.documento_existe(datos["documento"], id_persona):
            raise Conflicto("Ya existe una persona con ese documento.")
        if datos.get("email") and self.repositorio.email_existe(datos["email"], id_persona):
            raise Conflicto("Ya existe una persona con ese correo.")
        return tipo
