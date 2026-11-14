"""Rutas de los catálogos que solo tienen nombre: métodos de pago, tipos de convocatoria
y tipos de noticia. Comparten el mismo contrato, así que se arman con una sola función."""

from collections.abc import Callable

from fastapi import APIRouter, Depends, Query, Response, status
from pydantic import BaseModel

from app.aplicacion.dtos.comun_dto import ListaRespuesta
from app.aplicacion.dtos.convocatorias_dto import (
    TipoConvocatoriaCreateDto,
    TipoConvocatoriaOpcion,
    TipoConvocatoriaRespuesta,
    TipoConvocatoriaUpdateDto,
)
from app.aplicacion.dtos.financiero_dto import (
    MetodoPagoCreateDto,
    MetodoPagoOpcion,
    MetodoPagoRespuesta,
    MetodoPagoUpdateDto,
)
from app.aplicacion.dtos.noticias_dto import (
    TipoNoticiaCreateDto,
    TipoNoticiaOpcion,
    TipoNoticiaRespuesta,
    TipoNoticiaUpdateDto,
)
from app.presentacion.dependencias.administrativos import (
    gestor_metodos_pago,
    gestor_tipos_convocatoria,
    gestor_tipos_noticia,
)
from app.presentacion.dependencias.auth import get_usuario_actual, requiere_permiso


def crear_router(
    prefijo: str,
    etiqueta: str,
    modulo: str,
    dependencia: Callable,
    crear_dto: type[BaseModel],
    editar_dto: type[BaseModel],
    respuesta: type[BaseModel],
    opcion: type[BaseModel],
) -> APIRouter:
    router = APIRouter(prefix=prefijo, tags=[etiqueta])
    permiso = [Depends(requiere_permiso(modulo))]

    @router.get("", response_model=ListaRespuesta[respuesta], dependencies=permiso)
    def listar(
        buscar: str | None = Query(None, max_length=60, description="Busca por nombre"),
        pagina: int = Query(1, ge=1),
        tamano: int = Query(20, ge=1, le=100),
        gestor=Depends(dependencia),
    ):
        return gestor.listar(buscar, pagina, tamano)

    # Solo pide sesión: lo usan los formularios de otros módulos
    @router.get("/disponibles", response_model=list[opcion], dependencies=[Depends(get_usuario_actual)])
    def disponibles(gestor=Depends(dependencia)):
        return gestor.disponibles()

    @router.get("/{identificador}", response_model=respuesta, dependencies=permiso)
    def detalle(identificador: int, gestor=Depends(dependencia)):
        return gestor.obtener(identificador)

    @router.post("", response_model=respuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso)
    def crear(solicitud: crear_dto, gestor=Depends(dependencia)):  # type: ignore[valid-type]
        return gestor.crear(solicitud.model_dump())

    @router.put("/{identificador}", response_model=respuesta, dependencies=permiso)
    def actualizar(identificador: int, solicitud: editar_dto, gestor=Depends(dependencia)):  # type: ignore[valid-type]
        return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))

    # Sin estado: solo se elimina si ningún registro lo usa
    @router.delete(
        "/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso
    )
    def eliminar(identificador: int, gestor=Depends(dependencia)):
        gestor.eliminar(identificador)
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return router


metodos_pago = crear_router(
    "/metodos-pago", "Métodos de pago", "pagos", gestor_metodos_pago,
    MetodoPagoCreateDto, MetodoPagoUpdateDto, MetodoPagoRespuesta, MetodoPagoOpcion,
)
tipos_convocatoria = crear_router(
    "/tipos-convocatoria", "Tipos de convocatoria", "convocatorias", gestor_tipos_convocatoria,
    TipoConvocatoriaCreateDto, TipoConvocatoriaUpdateDto, TipoConvocatoriaRespuesta, TipoConvocatoriaOpcion,
)
tipos_noticia = crear_router(
    "/tipos-noticia", "Tipos de noticia", "noticias", gestor_tipos_noticia,
    TipoNoticiaCreateDto, TipoNoticiaUpdateDto, TipoNoticiaRespuesta, TipoNoticiaOpcion,
)

routers = (metodos_pago, tipos_convocatoria, tipos_noticia)
