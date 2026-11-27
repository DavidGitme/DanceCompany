"""Crear o recuperar la contraseña con un enlace de un solo uso enviado al correo.

- La respuesta es la misma exista o no la cuenta: no revela quién está registrado.
- En la base solo queda el hash SHA-256 del enlace; el enlace no se registra en logs.
- El enlace vence (30 minutos para recuperar, 48 horas para la invitación) y sirve una vez.
"""

import hashlib
import secrets
from datetime import datetime, timedelta

from app.aplicacion.servicios.seguridad import HasherClaves
from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO, error_clave, normalizar_documento
from app.dominio.repositorios.repositorio_recuperacion import RepositorioRecuperacion

MENSAJE_SOLICITUD = (
    "Si el documento tiene una cuenta activa con correo registrado, enviamos un enlace "
    "para crear una nueva contraseña. Revisa tu bandeja de entrada y la carpeta de spam."
)
MINUTOS_RECUPERAR = 30
MINUTOS_INVITACION = 48 * 60


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class RecuperarClave:
    def __init__(self, repositorio: RepositorioRecuperacion, hasher: HasherClaves, correo, frontend_url: str):
        self.repositorio = repositorio
        self.hasher = hasher
        self.correo = correo
        self.frontend_url = frontend_url.rstrip("/")

    def _enlace(self, documento: str, minutos: int) -> str:
        token = secrets.token_urlsafe(32)
        self.repositorio.guardar_token(documento, hash_token(token), datetime.now() + timedelta(minutes=minutos))
        return f"{self.frontend_url}/restablecer?token={token}"

    # ---------- "¿Olvidaste tu contraseña?" ----------
    def solicitar(self, documento: str) -> str:
        cuenta = self.repositorio.cuenta(normalizar_documento(documento))
        if not cuenta or cuenta["idEstado"] != ESTADO_ACTIVO or not cuenta.get("email"):
            return MENSAJE_SOLICITUD
        try:
            enlace = self._enlace(cuenta["documento"], MINUTOS_RECUPERAR)
            self.repositorio.confirmar()
        except Exception:
            self.repositorio.deshacer()
            raise
        self.correo.enviar(
            cuenta["email"],
            "Recupera tu contraseña · F&A Dance Company",
            f"Hola {cuenta['nombre']}:\n\n"
            "Recibimos una solicitud para cambiar la contraseña de tu cuenta.\n"
            f"Abre este enlace en los próximos {MINUTOS_RECUPERAR} minutos para crear una nueva:\n\n{enlace}\n\n"
            "Si no fuiste tú, ignora este correo: tu contraseña sigue igual.\n",
        )
        return MENSAJE_SOLICITUD

    # ---------- Invitación al inscribir (el estudiante crea su contraseña) ----------
    def invitar(self, documento: str, nombre: str, email: str, motivo: str = "Tu sede te inscribió en F&A Dance Company.") -> bool:
        """Lo llama la inscripción (o la contratación de un instructor) después de guardar.
        Devuelve si el correo salió."""
        try:
            enlace = self._enlace(documento, MINUTOS_INVITACION)
            self.repositorio.confirmar()
        except Exception:
            self.repositorio.deshacer()
            return False
        return self.correo.enviar(
            email,
            "Bienvenido a F&A Dance Company · crea tu contraseña",
            f"Hola {nombre}:\n\n"
            f"{motivo}\n"
            f"Para entrar al portal usa tu número de documento ({documento}) como usuario.\n"
            "Crea tu contraseña con este enlace (vence en 48 horas):\n\n"
            f"{enlace}\n\n"
            "Si el enlace vence, usa \"¿Olvidaste tu contraseña?\" en la página de inicio de sesión.\n",
        )

    def bienvenida(self, documento: str, nombre: str, email: str) -> bool:
        """Cuando la sede ya le asignó una contraseña: el correo no la incluye."""
        return self.correo.enviar(
            email,
            "Bienvenido a F&A Dance Company",
            f"Hola {nombre}:\n\n"
            f"{motivo}\n"
            f"Para entrar al portal usa tu número de documento ({documento}) como usuario y la "
            "contraseña que te entregaron en la sede.\n"
            f"Puedes cambiarla cuando quieras desde {self.frontend_url} con \"¿Olvidaste tu contraseña?\".\n",
        )

    # ---------- Nueva contraseña ----------
    def restablecer(self, token: str, clave: str) -> None:
        error = error_clave(clave)
        if error:
            raise DatoInvalido(error)
        try:
            documento = self.repositorio.consumir_token(hash_token(token))
            if not documento:
                raise DatoInvalido("El enlace no es válido o ya venció. Solicita uno nuevo.")
            self.repositorio.cambiar_clave(documento, self.hasher.crear_hash(clave))
            self.repositorio.confirmar()
        except Exception:
            self.repositorio.deshacer()
            raise
