from fastapi import APIRouter, Depends, Query, Response, status

from app.aplicacion.dtos.comun_dto import ListaRespuesta
from app.aplicacion.dtos.convocatorias_dto import (
    GrupoCompetenciaCreateDto,
    GrupoCompetenciaRespuesta,
    GrupoCompetenciaUpdateDto,
    IntegranteCompetencia,
)
from app.presentacion.dependencias.administrativos import gestor_grupos_competencia
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import alcance_sede, filtro_sede

router = APIRouter(prefix="/grupos-competencia", tags=["Grupos de competencia"])
permiso = [Depends(requiere_permiso("convocatorias")), Depends(alcance_sede("grupos-competencia"))]


@router.get("", response_model=ListaRespuesta[GrupoCompetenciaRespuesta], dependencies=permiso)
def listar_grupos_competencia(
    convocatoria: int | None = Query(None, gt=0),
    sede: int | None = Depends(filtro_sede),
    buscar: str | None = Query(None, max_length=60, description="Busca por grupo o convocatoria"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_grupos_competencia),
):
    return gestor.listar(buscar, pagina, tamano, {"convocatoria": convocatoria, "sede": sede})


# Estudiantes que pueden integrar el grupo: aceptados en la convocatoria y de la sede del grupo
@router.get("/candidatos", response_model=list[IntegranteCompetencia], dependencies=permiso)
def candidatos(
    convocatoria: int = Query(gt=0),
    grupo: int = Query(gt=0),
    gestor=Depends(gestor_grupos_competencia),
):
    return gestor.candidatos(convocatoria, grupo)


@router.get("/{identificador}", response_model=GrupoCompetenciaRespuesta, dependencies=permiso)
def detalle_grupo_competencia(identificador: int, gestor=Depends(gestor_grupos_competencia)):
    return gestor.obtener(identificador)


@router.post("", response_model=GrupoCompetenciaRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso)
def crear_grupo_competencia(solicitud: GrupoCompetenciaCreateDto, gestor=Depends(gestor_grupos_competencia)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=GrupoCompetenciaRespuesta, dependencies=permiso)
def actualizar_grupo_competencia(
    identificador: int, solicitud: GrupoCompetenciaUpdateDto, gestor=Depends(gestor_grupos_competencia)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.delete("/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso)
def eliminar_grupo_competencia(identificador: int, gestor=Depends(gestor_grupos_competencia)):
    gestor.eliminar(identificador)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
