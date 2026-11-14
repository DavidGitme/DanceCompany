from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.personas_rol_dto import (
    EstudianteCreateDto,
    EstudianteOpcion,
    EstudianteRespuesta,
    EstudianteUpdateDto,
)
from app.presentacion.dependencias.academicos import gestor_estudiantes
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/estudiantes", tags=["Estudiantes"])
permiso = [Depends(requiere_permiso("estudiantes"))]


@router.get("", response_model=ListaRespuesta[EstudianteRespuesta], dependencies=permiso)
def listar_estudiantes(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    sede: int | None = Query(None, gt=0, description="Solo estudiantes de esta sede"),
    grupo: int | None = Query(None, gt=0, description="Solo estudiantes matriculados en este grupo"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre o documento"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_estudiantes),
):
    return gestor.listar(estado, buscar, pagina, tamano, sede, grupo)


# Solo activos, para selectores (matrículas, talleres)
@router.get("/disponibles", response_model=list[EstudianteOpcion], dependencies=permiso)
def estudiantes_disponibles(gestor=Depends(gestor_estudiantes)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=EstudianteRespuesta, dependencies=permiso)
def detalle_estudiante(identificador: int, gestor=Depends(gestor_estudiantes)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=EstudianteRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_estudiante(solicitud: EstudianteCreateDto, gestor=Depends(gestor_estudiantes)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=EstudianteRespuesta, dependencies=permiso)
def actualizar_estudiante(
    identificador: int, solicitud: EstudianteUpdateDto, gestor=Depends(gestor_estudiantes)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=EstudianteRespuesta, dependencies=permiso)
def cambiar_estado_estudiante(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_estudiantes)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
