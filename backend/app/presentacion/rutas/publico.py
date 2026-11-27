"""Rutas sin sesión que usa el sitio público. Solo leen lo necesario para elegir
o reciben una solicitud; los POST tienen límite de intentos por IP."""

from datetime import date

from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.sitio_publico_dto import (
    ConfirmarPreinscripcionSolicitud,
    DisponibilidadRespuesta,
    EstadoPreinscripcionPublico,
    EstiloPublico,
    MensajeRespuesta,
    PlanRespuesta,
    PreinscripcionCreadaRespuesta,
    PreinscripcionSolicitud,
    SedePublica,
    SolicitudCreadaRespuesta,
    SolicitudEspacioSolicitud,
    TipoDocumentoPublico,
)
from app.presentacion.dependencias.sitio_publico import (
    disponibilidad,
    preinscribir,
    repositorio_sitio,
    solicitar_espacio,
)
from app.presentacion.middlewares.limite_intentos import limitar_formulario_publico, limitar_inicio_sesion

router = APIRouter(prefix="/publico", tags=["Sitio público"])


@router.get("/planes", response_model=list[PlanRespuesta])
def planes(repositorio=Depends(repositorio_sitio)):
    return repositorio.planes()


@router.get("/sedes", response_model=list[SedePublica])
def sedes(repositorio=Depends(repositorio_sitio)):
    return repositorio.sedes_publicas()


@router.get("/estilos", response_model=list[EstiloPublico])
def estilos(repositorio=Depends(repositorio_sitio)):
    return repositorio.estilos_activos()


@router.get("/tipos-documento", response_model=list[TipoDocumentoPublico])
def tipos_documento(repositorio=Depends(repositorio_sitio)):
    return repositorio.tipos_documento()


# Aulas de la sede con sus franjas ocupadas en esa fecha (sin datos de personas)
@router.get("/disponibilidad", response_model=DisponibilidadRespuesta)
def disponibilidad_aulas(
    sede: int = Query(gt=0),
    fecha: date = Query(),
    caso=Depends(disponibilidad),
):
    return caso.del_dia(sede, fecha)


@router.post(
    "/solicitudes-espacio",
    response_model=SolicitudCreadaRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limitar_formulario_publico)],
)
def solicitar(solicitud: SolicitudEspacioSolicitud, caso=Depends(solicitar_espacio)):
    return caso.crear(solicitud.model_dump())


@router.get("/preinscripcion", response_model=EstadoPreinscripcionPublico)
def estado_preinscripcion(caso=Depends(preinscribir)):
    return caso.estado_publico()


@router.post(
    "/preinscripciones",
    response_model=PreinscripcionCreadaRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(limitar_formulario_publico)],
)
def crear_preinscripcion(solicitud: PreinscripcionSolicitud, caso=Depends(preinscribir)):
    return caso.crear(solicitud.model_dump())


@router.post(
    "/preinscripciones/confirmar",
    response_model=MensajeRespuesta,
    dependencies=[Depends(limitar_inicio_sesion)],
)
def confirmar_preinscripcion(solicitud: ConfirmarPreinscripcionSolicitud, caso=Depends(preinscribir)):
    return caso.confirmar(solicitud.token)
