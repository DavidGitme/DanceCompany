from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.catalogos_dto import (
    SedeCreateDto,
    SedeOpcion,
    SedeRespuesta,
    SedeUpdateDto,
)
from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.presentacion.dependencias.academicos import gestor_sedes
from app.presentacion.dependencias.auth import get_usuario_actual, requiere_permiso

router = APIRouter(prefix="/sedes", tags=["Sedes"])
permiso = [Depends(requiere_permiso("sedes"))]


@router.get("", response_model=ListaRespuesta[SedeRespuesta], dependencies=permiso)
def listar_sedes(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre o dirección"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_sedes),
):
    return gestor.listar(estado, buscar, pagina, tamano)


# Solo activas, para los selectores de estudiantes, instructores y grupos.
@router.get(
    "/disponibles",
    response_model=list[SedeOpcion],
    dependencies=[Depends(get_usuario_actual)],
)
def sedes_disponibles(gestor=Depends(gestor_sedes)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=SedeRespuesta, dependencies=permiso)
def detalle_sede(identificador: int, gestor=Depends(gestor_sedes)):
    return gestor.obtener(identificador)


@router.post(
    "",
    response_model=SedeRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=permiso,
)
def crear_sede(solicitud: SedeCreateDto, gestor=Depends(gestor_sedes)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=SedeRespuesta, dependencies=permiso)
def actualizar_sede(
    identificador: int, solicitud: SedeUpdateDto, gestor=Depends(gestor_sedes)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=SedeRespuesta, dependencies=permiso)
def cambiar_estado_sede(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_sedes)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
