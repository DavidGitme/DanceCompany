from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.catalogos_dto import (
    EstiloCreateDto,
    EstiloOpcion,
    EstiloRespuesta,
    EstiloUpdateDto,
)
from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.presentacion.dependencias.academicos import gestor_estilos
from app.presentacion.dependencias.auth import get_usuario_actual, requiere_permiso

router = APIRouter(prefix="/estilos", tags=["Estilos"])
permiso = [Depends(requiere_permiso("estilos"))]


@router.get("", response_model=ListaRespuesta[EstiloRespuesta], dependencies=permiso)
def listar_estilos(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre, sin importar mayúsculas ni tildes"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_estilos),
):
    return gestor.listar(estado, buscar, pagina, tamano)


# Solo activos. Lo usan el selector de "Crear grupo" y la Oferta académica (cualquier usuario con sesión).
@router.get(
    "/disponibles",
    response_model=list[EstiloOpcion],
    dependencies=[Depends(get_usuario_actual)],
)
def estilos_disponibles(gestor=Depends(gestor_estilos)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=EstiloRespuesta, dependencies=permiso)
def detalle_estilo(identificador: int, gestor=Depends(gestor_estilos)):
    return gestor.obtener(identificador)


@router.post(
    "",
    response_model=EstiloRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=permiso,
)
def crear_estilo(solicitud: EstiloCreateDto, gestor=Depends(gestor_estilos)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=EstiloRespuesta, dependencies=permiso)
def actualizar_estilo(
    identificador: int, solicitud: EstiloUpdateDto, gestor=Depends(gestor_estilos)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=EstiloRespuesta, dependencies=permiso)
def cambiar_estado_estilo(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_estilos)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
