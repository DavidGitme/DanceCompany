from fastapi import APIRouter, Depends, Query, Response, status

from app.aplicacion.dtos.comun_dto import ListaRespuesta
from app.aplicacion.dtos.financiero_dto import AcudienteOpcion
from app.aplicacion.dtos.matriculas_dto import (
    InscripcionTallerCreateDto,
    InscripcionTallerRespuesta,
    InscripcionTallerUpdateDto,
)
from app.presentacion.dependencias.administrativos import gestor_inscripciones_taller
from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(prefix="/inscripciones-taller", tags=["Inscripciones a talleres"])
permiso = [Depends(requiere_permiso("talleres"))]


@router.get("", response_model=ListaRespuesta[InscripcionTallerRespuesta], dependencies=permiso)
def listar_inscripciones_taller(
    estudiante: int | None = Query(None, gt=0),
    taller: int | None = Query(None, gt=0),
    buscar: str | None = Query(
        None, max_length=60, description="Busca por estudiante, documento o taller"
    ),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_inscripciones_taller),
):
    return gestor.listar(buscar, pagina, tamano, {"estudiante": estudiante, "taller": taller})


# Apoyo del formulario: quién puede pagar por el estudiante
@router.get("/acudientes", response_model=list[AcudienteOpcion], dependencies=permiso)
def acudientes_del_estudiante(
    estudiante: int = Query(..., gt=0), gestor=Depends(gestor_inscripciones_taller)
):
    return gestor.acudientes(estudiante)


@router.get("/{identificador}", response_model=InscripcionTallerRespuesta, dependencies=permiso)
def detalle_inscripcion_taller(identificador: int, gestor=Depends(gestor_inscripciones_taller)):
    return gestor.obtener(identificador)


@router.post(
    "",
    response_model=InscripcionTallerRespuesta,
    status_code=status.HTTP_201_CREATED,
    dependencies=permiso,
)
def crear_inscripcion_taller(
    solicitud: InscripcionTallerCreateDto, gestor=Depends(gestor_inscripciones_taller)
):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=InscripcionTallerRespuesta, dependencies=permiso)
def actualizar_inscripcion_taller(
    identificador: int,
    solicitud: InscripcionTallerUpdateDto,
    gestor=Depends(gestor_inscripciones_taller),
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# Anula la inscripción y su pago
@router.delete(
    "/{identificador}", status_code=status.HTTP_204_NO_CONTENT, response_class=Response, dependencies=permiso
)
def anular_inscripcion_taller(identificador: int, gestor=Depends(gestor_inscripciones_taller)):
    gestor.eliminar(identificador)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
