from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.seguridad_dto import (
    EstadoCrearSolicitud,
    EstadoRespuesta,
    ListaRespuesta,
    PermisoCrearSolicitud,
    PermisoRespuesta,
    PersonaCrearSolicitud,
    PersonaRespuesta,
    PrivilegiosRespuesta,
    PrivilegiosSolicitud,
    RolCrearSolicitud,
    RolRespuesta,
    RolesPermisosRespuesta,
    RolesPermisosSolicitud,
    UsuarioActualizarSolicitud,
    UsuarioCrearSolicitud,
    UsuarioRespuesta,
)
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.persona_sql import condicion_persona_en_sede
from app.dominio.reglas import ROL_ADMINISTRADOR, ROL_INSTRUCTOR, error_clave, normalizar_documento, normalizar_telefono, telefono_valido
from app.infraestructura.seguridad.hash_claves import HasherArgon2
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import proteger_cuentas_admin, sede_de_cuenta
from app.presentacion.dependencias.servicios import obtener_gestor, obtener_repositorio

# El permiso "usuarios" existe en la tabla permisos (el administrador entra siempre)
router = APIRouter(
    dependencies=[Depends(requiere_permiso("usuarios")), Depends(proteger_cuentas_admin)],
    tags=["Seguridad"],
)


def _listar(recurso: str, pagina: int, tamano: int, gestor, sede: int | None = None, buscar: str | None = None):
    return gestor.listar(recurso, pagina, tamano, sede, buscar)


def _persona_normalizada(solicitud: PersonaCrearSolicitud) -> dict:
    # Mismo formato que la inscripción: "1.000.234" y "1000234" son el mismo documento
    datos = solicitud.model_dump(mode="json")
    datos["documento"] = normalizar_documento(datos["documento"])
    if datos.get("telefono"):
        datos["telefono"] = normalizar_telefono(datos["telefono"])
        if not telefono_valido(datos["telefono"]):
            raise DatoInvalido("El teléfono debe tener exactamente 10 dígitos.")
    if datos.get("email"):
        datos["email"] = datos["email"].strip().lower()
    return datos


def _sin_hash(registro: dict):
    return {clave: valor for clave, valor in registro.items() if clave != "password_hash"}


@router.get("/personas", response_model=ListaRespuesta[PersonaRespuesta])
def listar_personas(
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre o documento"),
    sede: int | None = Depends(sede_de_cuenta),
    gestor=Depends(obtener_gestor),
):
    # Un administrador de sede solo ve las personas de su sede (o sin vínculos)
    return _listar("personas", pagina, tamano, gestor, sede, buscar)


@router.get("/personas/{identificador}", response_model=PersonaRespuesta)
def detalle_persona(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.obtener("personas", identificador)


@router.post("/personas", response_model=PersonaRespuesta, status_code=status.HTTP_201_CREATED)
def crear_persona(solicitud: PersonaCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.crear("personas", _persona_normalizada(solicitud))


@router.put("/personas/{identificador}", response_model=PersonaRespuesta)
def actualizar_persona(identificador: int, solicitud: PersonaCrearSolicitud, gestor=Depends(obtener_gestor)):
    return gestor.actualizar("personas", identificador, _persona_normalizada(solicitud))


@router.delete("/personas/{identificador}", response_model=PersonaRespuesta)
def inactivar_persona(identificador: int, gestor=Depends(obtener_gestor)):
    return gestor.inactivar("personas", identificador)


@router.get("/usuarios", response_model=ListaRespuesta[UsuarioRespuesta])
def listar_usuarios(
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    buscar: str | None = Query(None, max_length=60, description="Nombre, documento, correo, tipo, rol, estado o sede"),
    estado: int | None = Query(None, gt=0),
    rol: int | None = Query(None, gt=0),
    sede: int | None = Depends(sede_de_cuenta),
    gestor=Depends(obtener_gestor),
    repositorio=Depends(obtener_repositorio),
):
    if hasattr(repositorio, "listar_usuarios"):
        datos, total = repositorio.listar_usuarios(pagina, tamano, sede, buscar, estado, rol)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}
    respuesta = _listar("usuarios", pagina, tamano, gestor, sede)
    respuesta["datos"] = [_sin_hash(registro) for registro in respuesta["datos"]]
    return respuesta


# Personas que pueden recibir una cuenta desde aquí: activas, sin cuenta y que no son
# instructores (los instructores reciben la invitación desde Instructores)
@router.get("/usuarios/candidatos")
def candidatos_usuario(
    buscar: str | None = Query(None, max_length=60),
    sede: int | None = Depends(sede_de_cuenta),
    sesion: Session = Depends(obtener_sesion),
):
    condiciones = [
        "p.idEstado = 1",
        "NOT EXISTS (SELECT 1 FROM usuarios u WHERE u.documento = p.documento)",
        "NOT EXISTS (SELECT 1 FROM instructor i WHERE i.idPersona = p.idPersona)",
    ]
    parametros: dict = {}
    if sede is not None:
        condiciones.append(condicion_persona_en_sede("p.idPersona"))
        parametros["sede"] = sede
    if buscar:
        condiciones.append("(lower(p.nombre) LIKE lower(:buscar) OR p.documento LIKE :buscar)")
        parametros["buscar"] = f"%{buscar.strip()}%"
    filas = sesion.execute(
        text(
            'SELECT p.idPersona AS "idPersona", p.nombre, p.documento, td.nombre AS "tipoDocumento" '
            "FROM persona p LEFT JOIN tipo_documento td ON td.idTipoDocumento = p.idTipoDocumento "
            f"WHERE {' AND '.join(condiciones)} ORDER BY p.nombre LIMIT 200"
        ),
        parametros,
    ).mappings()
    return [dict(f) for f in filas]


@router.get("/usuarios/{identificador}", response_model=UsuarioRespuesta)
def detalle_usuario(identificador: str, gestor=Depends(obtener_gestor)):
    return _sin_hash(gestor.obtener("usuarios", identificador))


@router.post("/usuarios", response_model=UsuarioRespuesta, status_code=status.HTTP_201_CREATED)
def crear_usuario(
    solicitud: UsuarioCrearSolicitud,
    gestor=Depends(obtener_gestor),
    repositorio=Depends(obtener_repositorio),
    sede: int | None = Depends(sede_de_cuenta),
    sesion: Session = Depends(obtener_sesion),
):
    datos = solicitud.model_dump()
    # Empleados: primero se registran en Instructores (contratación) y desde allí se les
    # envía la invitación; aquí no se crean cuentas de instructor con una clave escrita a mano
    if _es_instructor(sesion, datos["documento"]) or _incluye_rol(sesion, datos.get("roles"), ROL_INSTRUCTOR):
        raise Conflicto(
            "Las cuentas de instructores se crean desde Instructores con «Invitar»: "
            "el instructor recibe un correo para crear su contraseña."
        )
    if error := error_clave(datos["clave"]):
        raise DatoInvalido(error)
    datos["password_hash"] = HasherArgon2().crear_hash(datos.pop("clave"))
    creado = _sin_hash(gestor.crear("usuarios", datos))
    _fijar_sede(repositorio, creado["documento"], sede)
    return creado


@router.put("/usuarios/{identificador}", response_model=UsuarioRespuesta)
def actualizar_usuario(
    identificador: str,
    solicitud: UsuarioActualizarSolicitud,
    gestor=Depends(obtener_gestor),
    repositorio=Depends(obtener_repositorio),
    sede: int | None = Depends(sede_de_cuenta),
):
    actualizado = _sin_hash(gestor.actualizar("usuarios", identificador, solicitud.model_dump()))
    _fijar_sede(repositorio, actualizado["documento"], sede)
    return actualizado


def _es_instructor(sesion: Session, documento: str) -> bool:
    return sesion.execute(
        text("SELECT 1 FROM instructor i JOIN persona p ON p.idPersona = i.idPersona WHERE p.documento = :d"),
        {"d": (documento or "").strip()},
    ).first() is not None


def _incluye_rol(sesion: Session, roles, nombre: str) -> bool:
    if not roles:
        return False
    return sesion.execute(
        text("SELECT 1 FROM roles WHERE idRol = ANY(:ids) AND lower(trim(nombre)) = :n"),
        {"ids": [r for r in roles if isinstance(r, int)], "n": nombre},
    ).first() is not None


def _fijar_sede(repositorio, documento: str, sede: int | None):
    # La cuenta de instructor que crea o edita un admin de sede queda en esa sede: si su
    # rol recibe privilegios en módulos del panel, solo verá los registros de esa sede
    if sede is not None and hasattr(repositorio, "fijar_sede_si_vacia"):
        repositorio.fijar_sede_si_vacia(documento, sede)


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


# Los roles del sistema dependen de su nombre (reglas de acceso y portales): no se renombran
ROLES_DEL_SISTEMA = (ROL_ADMINISTRADOR, ROL_INSTRUCTOR, "estudiante", "acudiente")


def _proteger_rol_del_sistema(gestor, identificador: int, nombre_nuevo: str | None = None):
    actual = gestor.obtener("roles", identificador)["nombre"].strip().lower()
    if actual == ROL_ADMINISTRADOR and nombre_nuevo is None:
        raise DatoInvalido("El rol Administrador no se puede inactivar.")
    if actual in ROLES_DEL_SISTEMA and nombre_nuevo is not None and nombre_nuevo.strip().lower() != actual:
        raise DatoInvalido("Los roles del sistema (Administrador, Instructor, Estudiante y Acudiente) no se renombran.")


@router.put("/roles/{identificador}", response_model=RolRespuesta)
def actualizar_rol(identificador: int, solicitud: RolCrearSolicitud, gestor=Depends(obtener_gestor)):
    _proteger_rol_del_sistema(gestor, identificador, solicitud.nombre)
    datos = solicitud.model_dump()
    # Renombrar o cambiar el estado no toca los privilegios: reemplazarlos aquí los dejaba
    # en "todo permitido" (valores por defecto de roles_permisos). Se ajustan en /privilegios.
    datos.pop("permisos", None)
    if datos["idEstado"] != 1 and gestor.obtener("roles", identificador)["nombre"].strip().lower() == ROL_ADMINISTRADOR:
        raise DatoInvalido("El rol Administrador no se puede inactivar.")
    return gestor.actualizar("roles", identificador, datos)


@router.delete("/roles/{identificador}", response_model=RolRespuesta)
def inactivar_rol(identificador: int, gestor=Depends(obtener_gestor)):
    _proteger_rol_del_sistema(gestor, identificador)
    return gestor.inactivar("roles", identificador)


@router.get("/roles/{id_rol}/permisos", response_model=RolesPermisosRespuesta)
def obtener_roles_permisos(id_rol: int, gestor=Depends(obtener_gestor)):
    rol = gestor.obtener("roles", id_rol)
    return {"idRol": id_rol, "permisos": rol.get("permisos", [])}


@router.put("/roles/{id_rol}/permisos", response_model=RolesPermisosRespuesta)
def asignar_roles_permisos(id_rol: int, solicitud: RolesPermisosSolicitud, repositorio=Depends(obtener_repositorio)):
    return {"idRol": id_rol, "permisos": repositorio.asignar_permisos_rol(id_rol, solicitud.permisos)}


def _matriz(id_rol: int, gestor, repositorio) -> dict:
    rol = gestor.obtener("roles", id_rol)
    es_admin = rol["nombre"].strip().lower() == ROL_ADMINISTRADOR
    privilegios = repositorio.privilegios_de_rol(id_rol)
    if es_admin:
        # El administrador tiene todo siempre; la matriz se muestra completa y bloqueada
        privilegios = [{**p, "ver": True, "crear": True, "editar": True, "eliminar": True} for p in privilegios]
    return {"idRol": id_rol, "rol": rol["nombre"], "editable": not es_admin, "privilegios": privilegios}


# Matriz rol -> módulo -> ver / crear / editar / eliminar
@router.get("/roles/{id_rol}/privilegios", response_model=PrivilegiosRespuesta)
def privilegios_rol(id_rol: int, gestor=Depends(obtener_gestor), repositorio=Depends(obtener_repositorio)):
    return _matriz(id_rol, gestor, repositorio)


@router.put("/roles/{id_rol}/privilegios", response_model=PrivilegiosRespuesta)
def guardar_privilegios_rol(
    id_rol: int,
    solicitud: PrivilegiosSolicitud,
    gestor=Depends(obtener_gestor),
    repositorio=Depends(obtener_repositorio),
):
    rol = gestor.obtener("roles", id_rol)
    if rol["nombre"].strip().lower() == ROL_ADMINISTRADOR:
        raise DatoInvalido("El rol Administrador siempre tiene todos los privilegios.")
    validos = repositorio.ids_permisos()
    vistos = set()
    filas = []
    for fila in solicitud.privilegios:
        if fila.idPermiso not in validos:
            raise DatoInvalido(f"El módulo {fila.idPermiso} no existe.")
        if fila.idPermiso in vistos:
            raise DatoInvalido("Cada módulo debe aparecer una sola vez.")
        vistos.add(fila.idPermiso)
        datos = fila.model_dump()
        if (datos["crear"] or datos["editar"] or datos["eliminar"]) and not datos["ver"]:
            raise DatoInvalido("Para crear, editar o eliminar en un módulo, el rol también debe poder verlo.")
        filas.append(datos)
    repositorio.guardar_privilegios_rol(id_rol, filas)
    return _matriz(id_rol, gestor, repositorio)


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
