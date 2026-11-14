from datetime import date
from typing import Literal

from fastapi import APIRouter, Depends, Query, Response, status

from app.aplicacion.dtos.comun_dto import ListaRespuesta
from app.aplicacion.dtos.financiero_dto import (
    AcudienteOpcion,
    PagoCreateDto,
    PagoRespuesta,
    PagoUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_pagos
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/pagos", tags=["Pagos"])
permiso = [Depends(requiere_permiso("pagos"))]


@router.get("", response_model=ListaRespuesta[PagoRespuesta], dependencies=permiso)
def listar_pagos(
    tipo: Literal["mensualidad", "matricula", "taller"] | None = Query(None),
    acudiente: int | None = Query(None, gt=0),
    metodo: int | None = Query(None, gt=0),
    estudiante: int | None = Query(None, gt=0),
    mensualidad: int | None = Query(None, gt=0),
    matricula: int | None = Query(None, gt=0),
    desde: date | None = Query(None),
    hasta: date | None = Query(None),
    buscar: str | None = Query(None, max_length=60, description="Busca por pagador o estudiante"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_pagos),
):
    filtros = {
        "tipo": tipo, "acudiente": acudiente, "metodo": metodo, "estudiante": estudiante,
        "mensualidad": mensualidad, "matricula": matricula, "desde": desde, "hasta": hasta,
    }
    return gestor.listar(buscar, pagina, tamano, filtros)


# Apoyo del formulario: quién puede pagar por el estudiante
@router.get("/acudientes", response_model=list[AcudienteOpcion], dependencies=permiso)
def acudientes_del_estudiante(estudiante: int = Query(..., gt=0), gestor=Depends(gestor_pagos)):
    return gestor.acudientes(estudiante)


@router.get("/{identificador}", response_model=PagoRespuesta, dependencies=permiso)
def detalle_pago(identificador: int, gestor=Depends(gestor_pagos)):
    return gestor.obtener(identificador)


@router.post("", response_model=PagoRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso)
def registrar_pago(solicitud: PagoCreateDto, gestor=Depends(gestor_pagos)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=PagoRespuesta, dependencies=permiso)
def actualizar_pago(identificador: int, solicitud: PagoUpdateDto, gestor=Depends(gestor_pagos)):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# Anula un pago mal registrado y recalcula el estado de la mensualidad
@router.delete(
    "/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso
)
def anular_pago(identificador: int, gestor=Depends(gestor_pagos)):
    gestor.eliminar(identificador)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
