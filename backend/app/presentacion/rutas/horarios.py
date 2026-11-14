from fastapi import APIRouter, Depends, Query, Response, status

from app.aplicacion.dtos.aulas_horarios_dto import (
    HorarioCreateDto,
    HorarioRespuesta,
    HorarioUpdateDto,
)
from app.aplicacion.dtos.comun_dto import ListaRespuesta
from app.presentacion.dependencias.administrativos import gestor_horarios
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/horarios", tags=["Horarios"])
permiso = [Depends(requiere_permiso("horarios"))]


@router.get("", response_model=ListaRespuesta[HorarioRespuesta], dependencies=permiso)
def listar_horarios(
    grupo: int | None = Query(None, gt=0),
    sede: int | None = Query(None, gt=0),
    instructor: int | None = Query(None, gt=0),
    aula: int | None = Query(None, gt=0),
    dia: str | None = Query(None, max_length=20, description="Lunes ... Domingo"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre del grupo"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(50, ge=1, le=200),
    gestor=Depends(gestor_horarios),
):
    filtros = {"grupo": grupo, "sede": sede, "instructor": instructor, "aula": aula, "dia": dia}
    return gestor.listar(buscar, pagina, tamano, filtros)


@router.get("/{identificador}", response_model=HorarioRespuesta, dependencies=permiso)
def detalle_horario(identificador: int, gestor=Depends(gestor_horarios)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=HorarioRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_horario(solicitud: HorarioCreateDto, gestor=Depends(gestor_horarios)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=HorarioRespuesta, dependencies=permiso)
def actualizar_horario(
    identificador: int, solicitud: HorarioUpdateDto, gestor=Depends(gestor_horarios)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# El horario no tiene estado: se elimina el bloque semanal
@router.delete(
    "/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso
)
def eliminar_horario(identificador: int, gestor=Depends(gestor_horarios)):
    gestor.eliminar(identificador)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
