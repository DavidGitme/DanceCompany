from fastapi import APIRouter, Depends, Query

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.personas_rol_dto import (
    EstudianteOpcion,
    EstudianteRespuesta,
    EstudianteUpdateDto,
)
from app.aplicacion.dtos.inscripcion_dto import AcudienteRespuesta, VincularAcudienteSolicitud
from app.presentacion.dependencias.academicos import gestor_estudiantes, gestor_inscripciones
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import alcance_sede, filtro_sede

router = APIRouter(prefix="/estudiantes", tags=["Estudiantes"])
# La sede se puede cambiar (traslado); el caso de uso revisa que no tenga matrícula activa
permiso = [Depends(requiere_permiso("estudiantes")), Depends(alcance_sede("estudiantes", permite_traslado=True))]


@router.get("", response_model=ListaRespuesta[EstudianteRespuesta], dependencies=permiso)
def listar_estudiantes(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    sede: int | None = Depends(filtro_sede),
    grupo: int | None = Query(None, gt=0, description="Solo estudiantes matriculados en este grupo"),
    buscar: str | None = Query(None, max_length=60, description="Busca por nombre o documento"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_estudiantes),
):
    return gestor.listar(estado, buscar, pagina, tamano, sede, grupo)


# Solo activos, para selectores (matrículas, talleres)
@router.get("/disponibles", response_model=list[EstudianteOpcion], dependencies=permiso)
def estudiantes_disponibles(sede: int | None = Depends(filtro_sede), gestor=Depends(gestor_estudiantes)):
    return gestor.disponibles(sede)


@router.get("/{identificador}", response_model=EstudianteRespuesta, dependencies=permiso)
def detalle_estudiante(identificador: int, gestor=Depends(gestor_estudiantes)):
    return gestor.obtener(identificador)


# Los estudiantes nuevos entran por POST /inscripciones (inscripción presencial)


@router.put("/{identificador}", response_model=EstudianteRespuesta, dependencies=permiso)
def actualizar_estudiante(
    identificador: int, solicitud: EstudianteUpdateDto, gestor=Depends(gestor_estudiantes)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


@router.patch("/{identificador}/estado", response_model=EstudianteRespuesta, dependencies=permiso)
def cambiar_estado_estudiante(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_estudiantes)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


# ---------- Acudientes del estudiante ----------
@router.get("/{identificador}/acudientes", response_model=list[AcudienteRespuesta], dependencies=permiso)
def acudientes_estudiante(identificador: int, gestor=Depends(gestor_inscripciones)):
    return gestor.acudientes(identificador)


@router.post("/{identificador}/acudientes", response_model=list[AcudienteRespuesta], dependencies=permiso)
def agregar_acudiente(
    identificador: int, solicitud: VincularAcudienteSolicitud, gestor=Depends(gestor_inscripciones)
):
    return gestor.agregar_acudiente(identificador, solicitud.model_dump())


@router.delete(
    "/{identificador}/acudientes/{id_acudiente}", response_model=list[AcudienteRespuesta], dependencies=permiso
)
def quitar_acudiente(identificador: int, id_acudiente: int, gestor=Depends(gestor_inscripciones)):
    return gestor.quitar_acudiente(identificador, id_acudiente)
