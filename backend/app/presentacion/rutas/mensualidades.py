from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.financiero_dto import (
    ActualizacionMasivaRespuesta,
    MensualidadCreateDto,
    MensualidadOpcion,
    MensualidadRespuesta,
    MensualidadUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_mensualidades
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/mensualidades", tags=["Mensualidades"])
permiso = [Depends(requiere_permiso("pagos"))]


@router.get("", response_model=ListaRespuesta[MensualidadRespuesta], dependencies=permiso)
def listar_mensualidades(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado (Pendiente, Pagada...)"),
    matricula: int | None = Query(None, gt=0),
    estudiante: int | None = Query(None, gt=0),
    grupo: int | None = Query(None, gt=0),
    periodo: str | None = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="AAAA-MM"),
    buscar: str | None = Query(None, max_length=60, description="Busca por estudiante o documento"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_mensualidades),
):
    filtros = {"matricula": matricula, "estudiante": estudiante, "grupo": grupo, "periodo": periodo}
    return gestor.listar(estado, buscar, pagina, tamano, filtros)


# Con saldo pendiente, para el formulario de pagos
@router.get("/disponibles", response_model=list[MensualidadOpcion], dependencies=permiso)
def mensualidades_por_pagar(gestor=Depends(gestor_mensualidades)):
    return gestor.disponibles()


# Pasa a Vencida las pendientes cuya fecha límite ya pasó
@router.post("/actualizar-vencidas", response_model=ActualizacionMasivaRespuesta, dependencies=permiso)
def actualizar_mensualidades_vencidas(gestor=Depends(gestor_mensualidades)):
    return gestor.actualizar_vencidas()


@router.get("/{identificador}", response_model=MensualidadRespuesta, dependencies=permiso)
def detalle_mensualidad(identificador: int, gestor=Depends(gestor_mensualidades)):
    return gestor.obtener(identificador)


@router.post(
    "", response_model=MensualidadRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_mensualidad(solicitud: MensualidadCreateDto, gestor=Depends(gestor_mensualidades)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=MensualidadRespuesta, dependencies=permiso)
def actualizar_mensualidad(
    identificador: int, solicitud: MensualidadUpdateDto, gestor=Depends(gestor_mensualidades)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=MensualidadRespuesta, dependencies=permiso)
def cambiar_estado_mensualidad(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_mensualidades)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)
