"""Envío de correo por SMTP (Gmail con contraseña de aplicación).

Nunca lanza errores hacia el caso de uso: si el correo no está configurado o el servidor
falla, devuelve False y deja un registro sin datos sensibles (ni clave, ni enlaces).
"""

import logging
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr

from app.config.settings import Configuracion

registro = logging.getLogger("danceflow.correo")


class CorreoSmtp:
    def __init__(self, configuracion: Configuracion):
        self.configuracion = configuracion

    @property
    def configurado(self) -> bool:
        return self.configuracion.correo_configurado

    def enviar(self, destino: str, asunto: str, texto: str, html: str | None = None) -> bool:
        if not self.configurado:
            registro.warning("Correo no configurado: no se envió el mensaje '%s'.", asunto)
            return False
        c = self.configuracion
        mensaje = EmailMessage()
        mensaje["From"] = formataddr(("F&A Dance Company", c.smtp_remitente or c.smtp_usuario))
        mensaje["To"] = destino
        mensaje["Subject"] = asunto
        mensaje.set_content(texto)
        if html:
            mensaje.add_alternative(html, subtype="html")
        try:
            with smtplib.SMTP(c.smtp_host, c.smtp_puerto, timeout=10) as servidor:
                servidor.starttls(context=ssl.create_default_context())
                servidor.login(c.smtp_usuario, c.smtp_clave.get_secret_value())
                servidor.send_message(mensaje)
            return True
        except (smtplib.SMTPException, OSError) as error:
            # Solo el tipo de error: el mensaje del servidor puede traer datos de la cuenta
            registro.error("No se pudo enviar el correo '%s': %s", asunto, type(error).__name__)
            return False
