"""Catálogos de solo lectura para los formularios (requieren sesión)."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.infraestructura.bd.conexion import obtener_sesion
from app.presentacion.dependencias.auth import get_usuario_actual

router = APIRouter(prefix="/catalogos", tags=["Catálogos"], dependencies=[Depends(get_usuario_actual)])


class Opcion(BaseModel):
    id: int
    nombre: str


@router.get("/tipos-documento", response_model=list[Opcion])
def tipos_documento(sesion: Session = Depends(obtener_sesion)):
    filas = sesion.execute(
        text("SELECT idTipoDocumento AS id, nombre FROM tipo_documento ORDER BY idTipoDocumento")
    ).mappings()
    return [dict(fila) for fila in filas]


@router.get("/parentescos", response_model=list[Opcion])
def parentescos(sesion: Session = Depends(obtener_sesion)):
    filas = sesion.execute(
        text("SELECT idParentesco AS id, nombre FROM parentesco ORDER BY nombre")
    ).mappings()
    return [dict(fila) for fila in filas]
