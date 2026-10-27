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

    @property
    def origenes_permitidos(self) -> list[str]:
        return [origen.strip() for origen in self.cors_origins.split(",") if origen.strip()]


@lru_cache
def obtener_configuracion() -> Configuracion:
    return Configuracion()
