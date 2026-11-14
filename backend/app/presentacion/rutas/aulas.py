from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.aulas_horarios_dto import (
    AulaCreateDto,
    AulaDisponible,
    AulaRespuesta,
    AulaUpdateDto,
)
from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.presentacion.dependencias.administrativos import gestor_aulas
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/aulas", tags=["Aulas"])
permiso = [Depends(requiere_permiso("aulas"))]


@router.get("", response_model=ListaRespuesta[AulaRespuesta], dependencies=permiso)
def listar_aulas(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    sede: int | None = Query(None, gt=0),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre de la sede"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_aulas),
):
    return gestor.listar(estado, buscar, pagina, tamano, {"sede": sede})


# Solo activas, para selectores (grupos)
@router.get("/disponibles", response_model=list[AulaDisponible], dependencies=permiso)
def aulas_disponibles(sede: int | None = Query(None, gt=0), gestor=Depends(gestor_aulas)):
    return gestor.disponibles(sede)


@router.get("/{identificador}", response_model=AulaRespuesta, dependencies=permiso)
def detalle_aula(identificador: int, gestor=Depends(gestor_aulas)):
    return gestor.obtener(identificador)


@router.post("", response_model=AulaRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso)
def crear_aula(solicitud: AulaCreateDto, gestor=Depends(gestor_aulas)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=AulaRespuesta, dependencies=permiso)
def actualizar_aula(identificador: int, solicitud: AulaUpdateDto, gestor=Depends(gestor_aulas)):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=AulaRespuesta, dependencies=permiso)
def cambiar_estado_aula(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_aulas)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
