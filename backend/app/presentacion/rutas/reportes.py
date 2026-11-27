from datetime import date

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.reportes.resumen_financiero import ResumenFinanciero
from app.aplicacion.dtos.reportes_dto import ResumenFinancieroRespuesta
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.reportes_sql import RepositorioReportesSql
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import filtro_sede

router = APIRouter(prefix="/reportes", tags=["Reportes"])


# Mensualidades e ingresos del Dashboard (cada administrador de sede ve solo la suya)
@router.get(
    "/finanzas",
    response_model=ResumenFinancieroRespuesta,
    dependencies=[Depends(requiere_permiso("pagos"))],
)
def resumen_financiero(
    periodo: str | None = Query(None, pattern=r"^\d{4}-(0[1-9]|1[0-2])$", description="Mes YYYY-MM"),
    meses: int = Query(6, ge=1, le=12),
    sede: int | None = Depends(filtro_sede),
    sesion: Session = Depends(obtener_sesion),
):
    return ResumenFinanciero(RepositorioReportesSql(sesion)).ejecutar(sede, periodo, meses, date.today())
