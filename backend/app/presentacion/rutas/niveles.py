from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.catalogos_dto import (
    NivelCreateDto,
    NivelOpcion,
    NivelRespuesta,
    NivelUpdateDto,
)
from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.presentacion.dependencias.academicos import gestor_niveles
from app.presentacion.dependencias.auth import get_usuario_actual, requiere_permiso

router = APIRouter(prefix="/niveles", tags=["Niveles"])
permiso = [Depends(requiere_permiso("niveles"))]


@router.get("", response_model=ListaRespuesta[NivelRespuesta], dependencies=permiso)
def listar_niveles(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre, sin importar mayúsculas ni tildes"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_niveles),
):
    return gestor.listar(estado, buscar, pagina, tamano)


# Solo activos y en orden, para selectores y la Oferta académica.
@router.get(
    "/disponibles",
    response_model=list[NivelOpcion],
    dependencies=[Depends(get_usuario_actual)],
)
def niveles_disponibles(gestor=Depends(gestor_niveles)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=NivelRespuesta, dependencies=permiso)
def detalle_nivel(identificador: int, gestor=Depends(gestor_niveles)):
    return gestor.obtener(identificador)


@router.post(
    "",
    response_model=NivelRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=permiso,
)
def crear_nivel(solicitud: NivelCreateDto, gestor=Depends(gestor_niveles)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=NivelRespuesta, dependencies=permiso)
def actualizar_nivel(
    identificador: int, solicitud: NivelUpdateDto, gestor=Depends(gestor_niveles)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=NivelRespuesta, dependencies=permiso)
def cambiar_estado_nivel(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_niveles)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
