"""El instructor actualiza su contacto y su contraseña desde "Mi perfil".

- Solo cambia su propia cuenta: el documento sale del token, nunca del cuerpo de la petición.
- Nombre y documento no se editan aquí; los gestiona la sede.
- Para cambiar la contraseña debe escribir la actual, y la nueva sigue la misma regla que el resto del sistema.
"""

from app.aplicacion.servicios.seguridad import HasherClaves
from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.reglas import error_clave
from app.dominio.repositorios.repositorio_portal_instructor import RepositorioPortalInstructor

from .consultar_portal_instructor import ConsultarPortalInstructor


class ActualizarCuentaInstructor:
    def __init__(self, repositorio: RepositorioPortalInstructor, hasher: HasherClaves):
        self.repositorio = repositorio
        self.hasher = hasher

    def actualizar_contacto(self, documento: str, correo: str, telefono: str) -> dict:
        # Confirma que es un instructor activo antes de escribir
        consulta = ConsultarPortalInstructor(self.repositorio)
        consulta.perfil(documento)
        try:
            self.repositorio.actualizar_contacto(documento, correo.strip().lower(), telefono.strip() or None)
            self.repositorio.confirmar()
        except Exception:
            self.repositorio.deshacer()
            raise
        return consulta.perfil(documento)

    def cambiar_clave(self, documento: str, actual: str, nueva: str) -> None:
        hash_guardado = self.repositorio.hash_clave(documento)
        if not hash_guardado or not self.hasher.verificar(actual, hash_guardado):
            raise DatoInvalido("La contraseña actual no es correcta.")
        error = error_clave(nueva)
        if error:
            raise DatoInvalido(error)
        if actual == nueva:
            raise DatoInvalido("La nueva contraseña debe ser diferente a la actual.")
        try:
            self.repositorio.guardar_clave(documento, self.hasher.crear_hash(nueva))
            self.repositorio.confirmar()
        except Exception:
            self.repositorio.deshacer()
            raise
