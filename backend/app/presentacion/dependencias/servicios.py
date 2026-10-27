from functools import lru_cache

from fastapi import Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.seguridad.gestionar_seguridad import GestionarSeguridad
from app.config.settings import obtener_configuracion
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.seguridad_memoria import RepositorioSeguridadMemoria
from app.infraestructura.repositorios.seguridad_sql import RepositorioSeguridadSql
from app.infraestructura.seguridad.hash_claves import HasherArgon2


@lru_cache
def repositorio_memoria():
    configuracion = obtener_configuracion()
    if not configuracion.clave_mock_admin:
        raise RuntimeError("CLAVE_MOCK_ADMIN es obligatoria cuando MODO_MOCK=true.")
    hash_clave = HasherArgon2().crear_hash(
        configuracion.clave_mock_admin.get_secret_value()
    )
    return RepositorioSeguridadMemoria(hash_clave)


def obtener_repositorio(sesion: Session = Depends(obtener_sesion)):
    if obtener_configuracion().modo_mock:
        return repositorio_memoria()
    return RepositorioSeguridadSql(sesion)


def obtener_gestor(repositorio=Depends(obtener_repositorio)):
    return GestionarSeguridad(repositorio)
