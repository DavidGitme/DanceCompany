from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.seguridad_dto import (
    EstadoCrearSolicitud,
    EstadoRespuesta,
    ListaRespuesta,
    PermisoCrearSolicitud,
    PermisoRespuesta,
    PersonaCrearSolicitud,
    PersonaRespuesta,
    RolCrearSolicitud,
    RolRespuesta,
    RolesPermisosRespuesta,
    RolesPermisosSolicitud,
    UsuarioActualizarSolicitud,
    UsuarioCrearSolicitud,
    UsuarioRespuesta,
)
from app.infraestructura.seguridad.hash_claves import HasherArgon2
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.servicios import obtener_gestor, obtener_repositorio

router = APIRouter(
    dependencies=[Depends(requiere_permiso("seguridad"))],
    tags=["Seguridad"],
)


def _listar(recurso: str, pagina: int, tamano: int, gestor):
    return gestor.listar(recurso, pagina, tamano)


def _sin_hash(registro: dict):
    return {clave: valor for clave, valor in registro.items() if clave != "password_hash"}


@router.get("/personas", response_model=ListaRespuesta[PersonaRespuesta])
def listar_personas(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100), gestor=Depends(obtener_gestor)):
    return _listar("personas", pagina, tamano, gestor)


@router.get("/personas/{identificador}", response_model=PersonaRespuesta)
def detalle_persona(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.obtener("personas", identificador)


@router.post("/personas", response_model=PersonaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_persona(solicitud: PersonaCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.crear("personas", solicitud.model_dump(mode="json"))


@router.put("/personas/{identificador}", response_model=PersonaRespuesta)
def actualizar_persona(identificador: int, solicitud: PersonaCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.actualizar("personas", identificador, solicitud.model_dump(mode="json"))


@router.delete("/personas/{identificador}", response_model=PersonaRespuesta)
def inactivar_persona(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.inactivar("personas", identificador)


@router.get("/usuarios", response_model=ListaRespuesta[UsuarioRespuesta])
def listar_usuarios(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100), gestor=Depends(obtener_gestor)):
    respuesta = _listar("usuarios", pagina, tamano, gestor)
    respuesta["datos"] = [_sin_hash(registro) for registro in respuesta["datos"]]
    return respuesta


@router.get("/usuarios/{identificador}", response_model=UsuarioRespuesta)
def detalle_usuario(identificador: str, gestor=Depends(obtener_gestor)):
    return _sin_hash(gestor.obtener("usuarios", identificador))


@router.post("/usuarios", response_model=UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def crear_usuario(solicitud: UsuarioCrearSolicitud, gestor=Depends(obtener_gestor)):
    datos = solicitud.model_dump()
    datos["password_hash"] = HasherArgon2().crear_hash(datos.pop("clave"))
    return _sin_hash(gestor.crear("usuarios", datos))


@router.put("/usuarios/{identificador}", response_model=UsuarioRespuesta)
def actualizar_usuario(identificador: str, solicitud: UsuarioActualizarSolicitud, gestor=Depends(obtener_gestor)):
    return _sin_hash(gestor.actualizar("usuarios", identificador, solicitud.model_dump()))


@router.delete("/usuarios/{identificador}", response_model=UsuarioRespuesta)
def inactivar_usuario(identificador: str, gestor=Depends(obtener_gestor)):
    return _sin_hash(gestor.inactivar("usuarios", identificador))


@router.get("/roles", response_model=ListaRespuesta[RolRespuesta])
def listar_roles(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100), gestor=Depends(obtener_gestor)):
    return _listar("roles", pagina, tamano, gestor)


@router.get("/roles/{identificador}", response_model=RolRespuesta)
def detalle_rol(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.obtener("roles", identificador)


@router.post("/roles", response_model=RolRespuesta, status_code=status.HTTP_201_CREATED)
def crear_rol(solicitud: RolCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.crear("roles", solicitud.model_dump())


@router.put("/roles/{identificador}", response_model=RolRespuesta)
def actualizar_rol(identificador: int, solicitud: RolCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.actualizar("roles", identificador, solicitud.model_dump())


@router.delete("/roles/{identificador}", response_model=RolRespuesta)
def inactivar_rol(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.inactivar("roles", identificador)


@router.get("/roles/{id_rol}/permisos", response_model=RolesPermisosRespuesta)
def obtener_roles_permisos(id_rol: int, gestor=Depends(obtener_gestor)):
    rol = gestor.obtener("roles", id_rol)
    return {"idRol": id_rol, "permisos": rol.get("permisos", [])}


@router.put("/roles/{id_rol}/permisos", response_model=RolesPermisosRespuesta)
def asignar_roles_permisos(id_rol: int, solicitud: RolesPermisosSolicitud, repositorio=Depends(obtener_repositorio)):
    return {"idRol": id_rol, "permisos": repositorio.asignar_permisos_rol(id_rol, solicitud.permisos)}


@router.get("/permisos", response_model=ListaRespuesta[PermisoRespuesta])
def listar_permisos(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100), gestor=Depends(obtener_gestor)):
    return _listar("permisos", pagina, tamano, gestor)


@router.get("/permisos/{identificador}", response_model=PermisoRespuesta)
def detalle_permiso(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.obtener("permisos", identificador)


@router.post("/permisos", response_model=PermisoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_permiso(solicitud: PermisoCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.crear("permisos", solicitud.model_dump())


@router.put("/permisos/{identificador}", response_model=PermisoRespuesta)
def actualizar_permiso(identificador: int, solicitud: PermisoCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.actualizar("permisos", identificador, solicitud.model_dump())


@router.get("/estados", response_model=ListaRespuesta[EstadoRespuesta])
def listar_estados(pagina: int = Query(1, ge=1), tamano: int = Query(20, ge=1, le=100), gestor=Depends(obtener_gestor)):
    return _listar("estados", pagina, tamano, gestor)


@router.get("/estados/{identificador}", response_model=EstadoRespuesta)
def detalle_estado(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.obtener("estados", identificador)


@router.post("/estados", response_model=EstadoRespuesta, status_code=status.HTTP_201_CREATED)
def crear_estado(solicitud: EstadoCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.crear("estados", solicitud.model_dump())


@router.put("/estados/{identificador}", response_model=EstadoRespuesta)
def actualizar_estado(identificador: int, solicitud: EstadoCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.actualizar("estados", identificador, solicitud.model_dump())


@router.delete("/estados/{identificador}", response_model=EstadoRespuesta)
def inactivar_estado(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.inactivar("estados", identificador)
