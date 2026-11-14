from fastapi import APIRouter, Depends

from app.presentacion.dependencias.auth import requiere_permiso

router = APIRouter(tags=["Módulos"])


@router.get("/reportes")
def listar_reportes(_: dict = Depends(requiere_permiso("reportes"))):
    # TODO Persona 2: definir consultas de solo lectura para reportes.
    return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}
