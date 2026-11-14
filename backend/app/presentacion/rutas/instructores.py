from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.personas_rol_dto import (
    InstructorCreateDto,
    InstructorOpcion,
    InstructorRespuesta,
    InstructorUpdateDto,
)
from app.presentacion.dependencias.academicos import gestor_instructores
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/instructores", tags=["Instructores"])
permiso = [Depends(requiere_permiso("instructores"))]


@router.get("", response_model=ListaRespuesta[InstructorRespuesta], dependencies=permiso)
def listar_instructores(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    sede: int | None = Query(None, gt=0, description="Solo instructores de esta sede"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre o documento"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_instructores),
):
    return gestor.listar(estado, buscar, pagina, tamano, sede)


# Solo activos, para el selector de instructor al crear un grupo
@router.get("/disponibles", response_model=list[InstructorOpcion], dependencies=permiso)
def instructores_disponibles(gestor=Depends(gestor_instructores)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=InstructorRespuesta, dependencies=permiso)
def detalle_instructor(identificador: int, gestor=Depends(gestor_instructores)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=InstructorRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_instructor(solicitud: InstructorCreateDto, gestor=Depends(gestor_instructores)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=InstructorRespuesta, dependencies=permiso)
def actualizar_instructor(
    identificador: int, solicitud: InstructorUpdateDto, gestor=Depends(gestor_instructores)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=InstructorRespuesta, dependencies=permiso)
def cambiar_estado_instructor(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_instructores)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
