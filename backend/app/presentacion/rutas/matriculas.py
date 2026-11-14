from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.matriculas_dto import (
    MatriculaCreateDto,
    MatriculaOpcion,
    MatriculaRespuesta,
    MatriculaUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_matriculas
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/matriculas", tags=["Matrículas"])
permiso = [Depends(requiere_permiso("matriculas"))]


@router.get("", response_model=ListaRespuesta[MatriculaRespuesta], dependencies=permiso)
def listar_matriculas(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    estudiante: int | None = Query(None, gt=0),
    grupo: int | None = Query(None, gt=0),
    sede: int | None = Query(None, gt=0),
    buscar: str | None = Query(
        None, max_length=60, description="Busca por estudiante, documento o grupo"
    ),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_matriculas),
):
    filtros = {"estudiante": estudiante, "grupo": grupo, "sede": sede}
    return gestor.listar(estado, buscar, pagina, tamano, filtros)


# Solo activas, para selectores (mensualidades, pagos)
@router.get("/disponibles", response_model=list[MatriculaOpcion], dependencies=permiso)
def matriculas_disponibles(gestor=Depends(gestor_matriculas)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=MatriculaRespuesta, dependencies=permiso)
def detalle_matricula(identificador: int, gestor=Depends(gestor_matriculas)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=MatriculaRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_matricula(solicitud: MatriculaCreateDto, gestor=Depends(gestor_matriculas)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=MatriculaRespuesta, dependencies=permiso)
def actualizar_matricula(
    identificador: int, solicitud: MatriculaUpdateDto, gestor=Depends(gestor_matriculas)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# Sin borrado físico: Inactivo conserva el historial (cambio de nivel o de grupo)
@router.patch("/{identificador}/estado", response_model=MatriculaRespuesta, dependencies=permiso)
def cambiar_estado_matricula(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_matriculas)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
