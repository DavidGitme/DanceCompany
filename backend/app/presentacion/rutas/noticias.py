from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.financiero_dto import ActualizacionMasivaRespuesta
from app.aplicacion.dtos.noticias_dto import (
    NoticiaCreateDto,
    NoticiaPublica,
    NoticiaRespuesta,
    NoticiaUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_noticias
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/noticias", tags=["Noticias"])
permiso = [Depends(requiere_permiso("noticias"))]


@router.get("", response_model=ListaRespuesta[NoticiaRespuesta], dependencies=permiso)
def listar_noticias(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado (Disponible, Expirada)"),
    tipo: int | None = Query(None, gt=0, description="idTipoNoticia"),
    buscar: str | None = Query(None, max_length=60, description="Busca por título"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_noticias),
):
    return gestor.listar(estado, buscar, pagina, tamano, {"tipo": tipo})


# Pública (sin sesión): lo que muestra la landing
@router.get("/publicas", response_model=list[NoticiaPublica])
def noticias_publicas(
    tipo: int | None = Query(None, gt=0),
    limite: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_noticias),
):
    return gestor.publicas(tipo, limite)


# Pasa a Expirada las disponibles cuya fecha de expiración ya pasó
@router.post("/actualizar-expiradas", response_model=ActualizacionMasivaRespuesta, dependencies=permiso)
def actualizar_noticias_expiradas(gestor=Depends(gestor_noticias)):
    return gestor.actualizar_expiradas()


@router.get("/{identificador}", response_model=NoticiaRespuesta, dependencies=permiso)
def detalle_noticia(identificador: int, gestor=Depends(gestor_noticias)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=NoticiaRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_noticia(solicitud: NoticiaCreateDto, gestor=Depends(gestor_noticias)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=NoticiaRespuesta, dependencies=permiso)
def actualizar_noticia(
    identificador: int, solicitud: NoticiaUpdateDto, gestor=Depends(gestor_noticias)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=NoticiaRespuesta, dependencies=permiso)
def cambiar_estado_noticia(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_noticias)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
