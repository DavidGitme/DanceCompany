from functools import lru_cache

from pydantic import SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracion(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    secret_key: SecretStr
    database_url: str
    cors_origins: str = "http://localhost:5173"
    access_token_minutos: int = 20
    refresh_token_dias: int = 7
    cookie_segura: bool = True
    modo_mock: bool = False
    clave_mock_admin: SecretStr | None = None
    # Correo (Gmail con contraseña de aplicación). Sin SMTP_USUARIO/SMTP_CLAVE no se envía nada
    smtp_host: str = "smtp.gmail.com"
    smtp_puerto: int = 587
    smtp_usuario: str | None = None
    smtp_clave: SecretStr | None = None
    smtp_remitente: str | None = None
    # Dirección pública del frontend, para los enlaces de los correos
    frontend_url: str = "http://localhost:5173"

    @property
    def correo_configurado(self) -> bool:
        return bool(self.smtp_usuario and self.smtp_clave)

    @property
    def origenes_permitidos(self) -> list[str]:
        return [origen.strip() for origen in self.cors_origins.split(",") if origen.strip()]


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
