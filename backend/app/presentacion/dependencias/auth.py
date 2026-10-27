from collections.abc import Callable

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.dominio.excepciones.errores import NoAutenticado, NoAutorizado
from app.infraestructura.seguridad.jwt_tokens import EmisorJwt
from app.config.settings import obtener_configuracion

bearer = HTTPBearer(auto_error=False)


def get_usuario_actual(
    credenciales: HTTPAuthorizationCredentials | None = Depends(bearer),
):
    if not credenciales:
        raise NoAutenticado()
    return EmisorJwt(obtener_configuracion()).decodificar(
        credenciales.credentials, "acceso"
    )


def requiere_permiso(modulo: str) -> Callable:
    def validar(usuario: dict = Depends(get_usuario_actual)):
        if "administrador" not in usuario.get("roles", []) and modulo not in usuario.get(
            "permisos", []
        ):
            raise NoAutorizado()
        return usuario

    return validar
