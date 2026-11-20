from fastapi import APIRouter, Depends, status

from app.aplicacion.dtos.auth_dto import TokenRespuesta
from app.aplicacion.dtos.convocatorias_dto import PostulacionRespuesta
from app.aplicacion.dtos.portal_estudiante_dto import (
    ClasesEstudiante,
    ConvocatoriasEstudiante,
    FinanzasEstudiante,
    InicioSesionEstudianteSolicitud,
    PerfilEstudiante,
    TalleresEstudiante,
)
from app.presentacion.dependencias.portal_estudiante import (
    estudiante_actual,
    inicio_sesion_estudiante,
    portal_estudiante,
)
from app.presentacion.middlewares.limite_intentos import limitar_inicio_sesion

router = APIRouter(prefix="/portal-estudiante", tags=["Portal del estudiante"])


# Mismo límite de intentos que el login general
@router.post("/login", response_model=TokenRespuesta, dependencies=[Depends(limitar_inicio_sesion)])
def iniciar_sesion_estudiante(
    solicitud: InicioSesionEstudianteSolicitud, caso=Depends(inicio_sesion_estudiante)
):
    return caso.ejecutar(solicitud.correo, solicitud.clave)


@router.get("/perfil", response_model=PerfilEstudiante)
def mi_perfil(id_estudiante: int = Depends(estudiante_actual), portal=Depends(portal_estudiante)):
    return portal.perfil(id_estudiante)


@router.get("/clases", response_model=ClasesEstudiante)
def mis_clases(id_estudiante: int = Depends(estudiante_actual), portal=Depends(portal_estudiante)):
    return portal.clases(id_estudiante)


@router.get("/finanzas", response_model=FinanzasEstudiante)
def mis_finanzas(id_estudiante: int = Depends(estudiante_actual), portal=Depends(portal_estudiante)):
    return portal.finanzas(id_estudiante)


@router.get("/talleres", response_model=TalleresEstudiante)
def mis_talleres(id_estudiante: int = Depends(estudiante_actual), portal=Depends(portal_estudiante)):
    return portal.talleres_del_estudiante(id_estudiante)


@router.get("/convocatorias", response_model=ConvocatoriasEstudiante)
def mis_convocatorias(id_estudiante: int = Depends(estudiante_actual), portal=Depends(portal_estudiante)):
    return portal.convocatorias_del_estudiante(id_estudiante)


@router.post(
    "/convocatorias/{id_convocatoria}/postulacion",
    response_model=PostulacionRespuesta,
    status_code=status.HTTP_201_CREATED,
)
def postularme(
    id_convocatoria: int,
    id_estudiante: int = Depends(estudiante_actual),
    portal=Depends(portal_estudiante),
):
    return portal.postularse(id_estudiante, id_convocatoria)
