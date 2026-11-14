from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.aplicacion.dtos.comun_dto import ListaRespuesta
from app.aplicacion.dtos.convocatorias_dto import (
    ConvocatoriaCreateDto,
    ConvocatoriaOpcion,
    ConvocatoriaRespuesta,
    ConvocatoriaUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_convocatorias
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/convocatorias", tags=["Convocatorias"])
permiso = [Depends(requiere_permiso("convocatorias"))]


@router.get("", response_model=ListaRespuesta[ConvocatoriaRespuesta], dependencies=permiso)
def listar_convocatorias(
    tipo: int | None = Query(None, gt=0, description="idTipoConvocatoria"),
    vigencia: Literal["proxima", "abierta", "cerrada"] | None = Query(None),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_convocatorias),
):
    return gestor.listar(buscar, pagina, tamano, {"tipo": tipo, "vigencia": vigencia})


# Solo abiertas hoy, para postular estudiantes
@router.get("/disponibles", response_model=list[ConvocatoriaOpcion], dependencies=permiso)
def convocatorias_abiertas(gestor=Depends(gestor_convocatorias)):
    return gestor.disponibles()


@router.get("/{identificador}", response_model=ConvocatoriaRespuesta, dependencies=permiso)
def detalle_convocatoria(identificador: int, gestor=Depends(gestor_convocatorias)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=ConvocatoriaRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_convocatoria(solicitud: ConvocatoriaCreateDto, gestor=Depends(gestor_convocatorias)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=ConvocatoriaRespuesta, dependencies=permiso)
def actualizar_convocatoria(
    identificador: int, solicitud: ConvocatoriaUpdateDto, gestor=Depends(gestor_convocatorias)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# Sin estado en la tabla: solo se elimina si no tiene postulados ni grupo de competencia
@router.delete(
    "/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso
)
def eliminar_convocatoria(identificador: int, gestor=Depends(gestor_convocatorias)):
    gestor.eliminar(identificador)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
