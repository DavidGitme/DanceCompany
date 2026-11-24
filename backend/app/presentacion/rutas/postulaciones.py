from fastapi import APIRouter, Depends, Query, Response, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.convocatorias_dto import (
    PostulacionCreateDto,
    PostulacionRespuesta,
    PostulacionUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_postulaciones
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import alcance_sede, filtro_sede

# Tabla convocatoria_estudiante
router = APIRouter(prefix="/postulaciones", tags=["Postulaciones (convocatoria_estudiante)"])
permiso = [Depends(requiere_permiso("convocatorias")), Depends(alcance_sede("postulaciones"))]


@router.get("", response_model=ListaRespuesta[PostulacionRespuesta], dependencies=permiso)
def listar_postulaciones(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado (Postulado, Aceptado...)"),
    convocatoria: int | None = Query(None, gt=0),
    estudiante: int | None = Query(None, gt=0),
    sede: int | None = Depends(filtro_sede),
    buscar: str | None = Query(None, max_length=60, description="Busca por estudiante o documento"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_postulaciones),
):
    filtros = {"convocatoria": convocatoria, "estudiante": estudiante, "sede": sede}
    return gestor.listar(estado, buscar, pagina, tamano, filtros)


@router.get("/{identificador}", response_model=PostulacionRespuesta, dependencies=permiso)
def detalle_postulacion(identificador: int, gestor=Depends(gestor_postulaciones)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=PostulacionRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def postular_estudiante(solicitud: PostulacionCreateDto, gestor=Depends(gestor_postulaciones)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=PostulacionRespuesta, dependencies=permiso)
def actualizar_postulacion(
    identificador: int, solicitud: PostulacionUpdateDto, gestor=Depends(gestor_postulaciones)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# Aceptar o rechazar: { "idEstado": <Aceptado | Rechazado> }
@router.patch("/{identificador}/estado", response_model=PostulacionRespuesta, dependencies=permiso)
def decidir_postulacion(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_postulaciones)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


# Retira una postulación que aún no se ha decidido
@router.delete(
    "/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso
)
def retirar_postulacion(identificador: int, gestor=Depends(gestor_postulaciones)):
    gestor.eliminar(identificador)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
