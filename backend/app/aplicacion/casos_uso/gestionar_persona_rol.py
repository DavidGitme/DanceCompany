from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.repositorios.repositorio_personas_rol import RepositorioPersonaRol

CAMPOS_PERSONA = ("nombre", "idTipoDocumento", "documento", "telefono", "email", "fecha_nacimiento")


class GestionarPersonaRol(GestionarCatalogo):
    """Reglas de los datos personales, compartidas por estudiantes e instructores."""

    repositorio: RepositorioPersonaRol

    def validar_persona(self, datos, identificador=None):
        # Al editar se excluye la propia persona para no chocar consigo misma
        id_persona = self.obtener(identificador)["idPersona"] if identificador else None
        if not self.repositorio.tipo_documento_existe(datos["idTipoDocumento"]):
            raise DatoInvalido("El tipo de documento no existe.")
        if datos["documento"] and self.repositorio.documento_existe(datos["documento"], id_persona):
            raise Conflicto("Ya existe una persona con ese documento.")
        if datos["email"] and self.repositorio.email_existe(datos["email"], id_persona):
            raise Conflicto("Ya existe una persona con ese correo.")
