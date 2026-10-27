from datetime import datetime, timedelta, timezone
from typing import Any

import jwt

from app.aplicacion.servicios.seguridad import EmisorTokens
from app.config.settings import Configuracion
from app.dominio.excepciones.errores import NoAutenticado


class EmisorJwt(EmisorTokens):
    def __init__(self, configuracion: Configuracion):
        self.configuracion = configuracion

    def _emitir(self, documento: str, tipo: str, minutos: int, **claims: Any):
        ahora = datetime.now(timezone.utc)
        expira = ahora + timedelta(minutes=minutos)
        contenido = {
            "sub": documento,
            "tipo": tipo,
            "iat": ahora,
            "exp": expira,
            **claims,
        }
        token = jwt.encode(
            contenido,
            self.configuracion.secret_key.get_secret_value(),
            algorithm="HS256",
        )
        return token, int((expira - ahora).total_seconds())

    def emitir_acceso(self, documento: str, roles: list[str], permisos: list[str]):
        return self._emitir(
            documento,
            "acceso",
            self.configuracion.access_token_minutos,
            roles=roles,
            permisos=permisos,
        )

    def emitir_refresh(self, documento: str):
        return self._emitir(
            documento,
            "refresh",
            self.configuracion.refresh_token_dias * 24 * 60,
        )

    def decodificar(self, token: str, tipo: str) -> dict[str, Any]:
        try:
            contenido = jwt.decode(
                token,
                self.configuracion.secret_key.get_secret_value(),
                algorithms=["HS256"],
            )
        except jwt.PyJWTError as error:
            raise NoAutenticado() from error
        if contenido.get("tipo") != tipo:
            raise NoAutenticado()
        return contenido
