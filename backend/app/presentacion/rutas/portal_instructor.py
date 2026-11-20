from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.portal_instructor.consultar_portal_instructor import (
    ConsultarPortalInstructor,
)
from app.aplicacion.dtos.portal_instructor_dto import (
    EstudianteInstructorRespuesta,
    GrupoInstructorRespuesta,
    PerfilInstructorRespuesta,
)
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.portal_instructor_sql import RepositorioPortalInstructorSql
from app.presentacion.dependencias.auth import requiere_rol

router = APIRouter(prefix="/portal-instructor", tags=["Portal del instructor"])


def consulta(sesion: Session = Depends(obtener_sesion)):
    return ConsultarPortalInstructor(RepositorioPortalInstructorSql(sesion))


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
