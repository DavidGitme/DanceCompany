from collections.abc import Callable

from fastapi import Depends, Request
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.dominio.excepciones.errores import NoAutenticado, NoAutorizado
from app.infraestructura.seguridad.jwt_tokens import EmisorJwt
from app.presentacion.dependencias.servicios import obtener_repositorio_auth
from app.config.settings import obtener_configuracion
from app.dominio.reglas import ACCION_POR_METODO, ROL_ADMINISTRADOR

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
    """Exige el privilegio del módulo que corresponde al método HTTP (nivel 3).

    GET -> ver, POST -> crear, PUT/PATCH -> editar, DELETE -> eliminar.
    Se consulta en la base en cada petición: un cambio en Roles y permisos aplica
    de inmediato, sin esperar a que venza el token. El administrador tiene todo.
    """

    def validar(
        request: Request,
        usuario: dict = Depends(get_usuario_actual),
        repositorio=Depends(obtener_repositorio_auth),
    ):
        if ROL_ADMINISTRADOR in usuario.get("roles", []):
            return usuario
        accion = ACCION_POR_METODO.get(request.method, "ver")
        if not repositorio.tiene_privilegio(usuario["sub"], modulo, accion):
            raise NoAutorizado(f"Tu rol no tiene permiso para {accion} en este módulo.")
        return usuario

    return validar


def requiere_rol(rol: str) -> Callable:
    def validar(usuario: dict = Depends(get_usuario_actual)):
        if rol not in usuario.get("roles", []):
            raise NoAutorizado()
        return usuario

    return validar
