from fastapi import APIRouter, Depends

from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(tags=["Módulos"])


@router.get("/matriculas")
def listar_matriculas(_: dict = Depends(requiere_permiso("matriculas"))):
    # TODO Persona 2: implementar matrículas sin eliminación física.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/pagos")
def listar_pagos(_: dict = Depends(requiere_permiso("pagos"))):
    # TODO Persona 3: implementar pagos y mensualidades.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}


@router.get("/reportes")
def listar_reportes(_: dict = Depends(requiere_permiso("reportes"))):
    # TODO Persona 2: definir consultas de solo lectura para reportes.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}
