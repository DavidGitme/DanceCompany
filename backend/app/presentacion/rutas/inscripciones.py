"""Inscripción presencial del estudiante. Reemplaza el autorregistro público."""

from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.inscripcion_dto import (
    InscripcionRespuesta,
    InscripcionSolicitud,
    PersonaEncontrada,
)
from app.presentacion.dependencias.academicos import gestor_inscripciones
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import alcance_sede, sede_de_cuenta

router = APIRouter(prefix="/inscripciones", tags=["Inscripción de estudiantes"])
# alcance_sede revisa que idSede e idGrupo del cuerpo sean de la sede de la cuenta
permiso = [Depends(requiere_permiso("estudiantes")), Depends(alcance_sede(None))]


@router.post("", response_model=InscripcionRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso)
def inscribir_estudiante(solicitud: InscripcionSolicitud, gestor=Depends(gestor_inscripciones)):
    return gestor.ejecutar(solicitud.model_dump())


# Para reutilizar a un acudiente que ya existe (por ejemplo, el de un hermano)
@router.get("/personas", response_model=PersonaEncontrada, dependencies=permiso)
def buscar_persona(
    documento: str = Query(min_length=5, max_length=20, pattern=r"^[A-Za-z0-9 .-]+$"),
    sede: int | None = Depends(sede_de_cuenta),
    gestor=Depends(gestor_inscripciones),
):
    return gestor.buscar_persona(documento, sede)
