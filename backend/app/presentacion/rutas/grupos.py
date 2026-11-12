from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.grupos_dto import (
    AulaOpcion,
    GrupoCreateDto,
    GrupoOpcion,
    GrupoRespuesta,
    GrupoUpdateDto,
    TipoGrupoRespuesta,
)
from app.presentacion.dependencias.academicos import gestor_grupos
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/grupos", tags=["Grupos"])
permiso = [Depends(requiere_permiso("grupos"))]


@router.get("", response_model=ListaRespuesta[GrupoRespuesta], dependencies=permiso)
def listar_grupos(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    sede: int | None = Query(None, gt=0),
    nivel: int | None = Query(None, gt=0),
    estilo: int | None = Query(None, gt=0),
    instructor: int | None = Query(None, gt=0),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre del grupo"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_grupos),
):
    filtros = {"sede": sede, "nivel": nivel, "estilo": estilo, "instructor": instructor}
    return gestor.listar(estado, buscar, pagina, tamano, filtros)


@router.get("/disponibles", response_model=list[GrupoOpcion], dependencies=permiso)
def grupos_disponibles(gestor=Depends(gestor_grupos)):
    return gestor.disponibles()


# Catálogos de apoyo para el formulario "Crear grupo"
@router.get("/tipos", response_model=list[TipoGrupoRespuesta], dependencies=permiso)
def tipos_de_grupo(gestor=Depends(gestor_grupos)):
    return gestor.tipos()


@router.get("/aulas", response_model=list[AulaOpcion], dependencies=permiso)
def aulas_de_sede(sede: int = Query(..., gt=0), gestor=Depends(gestor_grupos)):
    return gestor.aulas(sede)


@router.get("/{identificador}", response_model=GrupoRespuesta, dependencies=permiso)
def detalle_grupo(identificador: int, gestor=Depends(gestor_grupos)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=GrupoRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_grupo(solicitud: GrupoCreateDto, gestor=Depends(gestor_grupos)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=GrupoRespuesta, dependencies=permiso)
def actualizar_grupo(identificador: int, solicitud: GrupoUpdateDto, gestor=Depends(gestor_grupos)):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=GrupoRespuesta, dependencies=permiso)
def cambiar_estado_grupo(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_grupos)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
