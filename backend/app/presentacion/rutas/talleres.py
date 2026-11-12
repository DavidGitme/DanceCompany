from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.catalogos_dto import (
    TallerCreateDto,
    TallerOpcion,
    TallerRespuesta,
    TallerUpdateDto,
)
from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.presentacion.dependencias.academicos import gestor_talleres
from app.presentacion.dependencias.auth import get_usuario_actual, requiere_permiso

router = APIRouter(prefix="/talleres", tags=["Talleres"])
permiso = [Depends(requiere_permiso("talleres"))]


@router.get("", response_model=ListaRespuesta[TallerRespuesta], dependencies=permiso)
def listar_talleres(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    buscar: str | None = Query(None, max_length=60, description="Busca por descripción"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_talleres),
):
    return gestor.listar(estado, buscar, pagina, tamano)


# Solo activos, para la Oferta académica.
@router.get(
    "/disponibles",
    response_model=list[TallerOpcion],
    dependencies=[Depends(get_usuario_actual)],
)
def talleres_disponibles(gestor=Depends(gestor_talleres)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=TallerRespuesta, dependencies=permiso)
def detalle_taller(identificador: int, gestor=Depends(gestor_talleres)):
    return gestor.obtener(identificador)


@router.post(
    "",
    response_model=TallerRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=permiso,
)
def crear_taller(solicitud: TallerCreateDto, gestor=Depends(gestor_talleres)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=TallerRespuesta, dependencies=permiso)
def actualizar_taller(
    identificador: int, solicitud: TallerUpdateDto, gestor=Depends(gestor_talleres)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=TallerRespuesta, dependencies=permiso)
def cambiar_estado_taller(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_talleres)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
