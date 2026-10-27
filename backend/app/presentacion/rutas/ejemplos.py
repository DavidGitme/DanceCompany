from fastapi import APIRouter, Depends

from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(tags=["Módulos"])


@router.get("/estudiantes")
def listar_estudiantes(_: dict = Depends(requiere_permiso("estudiantes"))):
    # TODO Persona 2: reemplazar por el caso de uso y repositorio de estudiantes.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/grupos")
def listar_grupos(_: dict = Depends(requiere_permiso("grupos"))):
    # TODO Persona 3: reemplazar por el caso de uso y repositorio de grupos.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/instructores")
def listar_instructores(_: dict = Depends(requiere_permiso("instructores"))):
    # TODO Persona 2: implementar instructores con DTOs propios.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/matriculas")
def listar_matriculas(_: dict = Depends(requiere_permiso("matriculas"))):
    # TODO Persona 2: implementar matrículas sin eliminación física.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/pagos")
def listar_pagos(_: dict = Depends(requiere_permiso("pagos"))):
    # TODO Persona 3: implementar pagos y mensualidades.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/talleres")
def listar_talleres(_: dict = Depends(requiere_permiso("talleres"))):
    # TODO Persona 3: implementar talleres e inscripciones.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/sedes")
def listar_sedes(_: dict = Depends(requiere_permiso("sedes"))):
    # TODO Persona 3: implementar sedes y sus relaciones.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/reportes")
def listar_reportes(_: dict = Depends(requiere_permiso("reportes"))):
    # TODO Persona 2: definir consultas de solo lectura para reportes.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}
