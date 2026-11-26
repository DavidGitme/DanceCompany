from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.portal_instructor.actualizar_cuenta_instructor import (
    ActualizarCuentaInstructor,
)
from app.aplicacion.casos_uso.portal_instructor.consultar_portal_instructor import (
    ConsultarPortalInstructor,
)
from app.aplicacion.dtos.portal_instructor_dto import (
    CambioClaveSolicitud,
    ContactoInstructorSolicitud,
    EstudianteInstructorRespuesta,
    GrupoInstructorRespuesta,
    PerfilInstructorRespuesta,
)
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.portal_instructor_sql import RepositorioPortalInstructorSql
from app.infraestructura.seguridad.hash_claves import HasherArgon2
from app.presentacion.dependencias.auth import requiere_rol

router = APIRouter(prefix="/portal-instructor", tags=["Portal del instructor"])


def consulta(sesion: Session = Depends(obtener_sesion)):
    return ConsultarPortalInstructor(RepositorioPortalInstructorSql(sesion))


def cuenta(sesion: Session = Depends(obtener_sesion)):
    return ActualizarCuentaInstructor(RepositorioPortalInstructorSql(sesion), HasherArgon2())


# El instructor se identifica por el documento que viene en su token
@router.get("/perfil", response_model=PerfilInstructorRespuesta)
def mi_perfil(usuario: dict = Depends(requiere_rol("instructor")), caso=Depends(consulta)):
    return caso.perfil(usuario["sub"])


@router.get("/grupos", response_model=list[GrupoInstructorRespuesta])
def mis_grupos(usuario: dict = Depends(requiere_rol("instructor")), caso=Depends(consulta)):
    return caso.grupos(usuario["sub"])


@router.get("/estudiantes", response_model=list[EstudianteInstructorRespuesta])
def mis_estudiantes(usuario: dict = Depends(requiere_rol("instructor")), caso=Depends(consulta)):
    return caso.estudiantes(usuario["sub"])


# Solo cambia el contacto de su propia cuenta (correo y teléfono)
@router.put("/perfil", response_model=PerfilInstructorRespuesta)
def actualizar_mi_perfil(
    solicitud: ContactoInstructorSolicitud,
    usuario: dict = Depends(requiere_rol("instructor")),
    caso=Depends(cuenta),
):
    return caso.actualizar_contacto(usuario["sub"], solicitud.correo, solicitud.telefono)


@router.put("/clave", status_code=status.HTTP_204_NO_CONTENT)
def cambiar_mi_clave(
    solicitud: CambioClaveSolicitud,
    usuario: dict = Depends(requiere_rol("instructor")),
    caso=Depends(cuenta),
):
    caso.cambiar_clave(usuario["sub"], solicitud.actual, solicitud.nueva)
