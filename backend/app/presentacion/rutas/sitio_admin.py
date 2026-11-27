"""Módulos del panel que atienden lo que llega del sitio público.

- Planes (permiso pagos) y periodos de matrícula (permiso matriculas): son de toda la
  academia, como los demás catálogos compartidos.
- Preinscripciones (matriculas) y solicitudes de espacio (aulas): cada administrador de
  sede solo ve y responde las de su sede.
"""

from datetime import date

from fastapi import APIRouter, Depends, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.sitio_publico_dto import (
    EstadoOpcion,
    PeriodoRespuesta,
    PeriodoSolicitud,
    PlanRespuesta,
    PlanSolicitud,
    PreinscripcionRespuesta,
    SolicitudRespuesta,
)
from app.dominio.reglas import CATEGORIA_PREINSCRIPCION, CATEGORIA_SOLICITUD
from app.presentacion.dependencias.auth import requiere_permiso
from app.presentacion.dependencias.sede import alcance_sede, filtro_sede
from app.presentacion.dependencias.sitio_publico import (
    gestor_periodos,
    gestor_planes,
    gestor_preinscripciones,
    gestor_solicitudes,
    repositorio_sitio,
)

# ---------- Planes ----------
planes = APIRouter(prefix="/planes", tags=["Planes"])
permiso_planes = [Depends(requiere_permiso("pagos"))]


@planes.get("", response_model=ListaRespuesta[PlanRespuesta], dependencies=permiso_planes)
def listar_planes(
    estado: int | None = Query(None, gt=0),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_planes),
):
    todos = gestor.listar(estado)
    inicio = (pagina - 1) * tamano
    return {"datos": todos[inicio:inicio + tamano], "total": len(todos), "pagina": pagina, "tamano": tamano}


@planes.post("", response_model=PlanRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso_planes)
def crear_plan(solicitud: PlanSolicitud, gestor=Depends(gestor_planes)):
    return gestor.crear(solicitud.model_dump())


@planes.put("/{identificador}", response_model=PlanRespuesta, dependencies=permiso_planes)
def actualizar_plan(identificador: int, solicitud: PlanSolicitud, gestor=Depends(gestor_planes)):
    return gestor.actualizar(identificador, solicitud.model_dump())


@planes.patch("/{identificador}/estado", response_model=PlanRespuesta, dependencies=permiso_planes)
def estado_plan(identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_planes)):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


# ---------- Periodos de matrícula ----------
periodos = APIRouter(prefix="/periodos-matricula", tags=["Periodos de matrícula"])
permiso_periodos = [Depends(requiere_permiso("matriculas"))]


@periodos.get("", response_model=ListaRespuesta[PeriodoRespuesta], dependencies=permiso_periodos)
def listar_periodos(
    estado: int | None = Query(None, gt=0),
    buscar: str | None = Query(None, max_length=60),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_periodos),
):
    return gestor.listar(estado, buscar, pagina, tamano)


@periodos.get("/{identificador}", response_model=PeriodoRespuesta, dependencies=permiso_periodos)
def detalle_periodo(identificador: int, gestor=Depends(gestor_periodos)):
    return gestor.obtener(identificador)


@periodos.post("", response_model=PeriodoRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso_periodos)
def crear_periodo(solicitud: PeriodoSolicitud, gestor=Depends(gestor_periodos)):
    return gestor.crear(solicitud.model_dump())


@periodos.put("/{identificador}", response_model=PeriodoRespuesta, dependencies=permiso_periodos)
def actualizar_periodo(identificador: int, solicitud: PeriodoSolicitud, gestor=Depends(gestor_periodos)):
    return gestor.actualizar(identificador, solicitud.model_dump())


@periodos.patch("/{identificador}/estado", response_model=PeriodoRespuesta, dependencies=permiso_periodos)
def estado_periodo(identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_periodos)):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


# ---------- Preinscripciones ----------
preinscripciones = APIRouter(prefix="/preinscripciones", tags=["Preinscripciones"])
permiso_pre = [Depends(requiere_permiso("matriculas")), Depends(alcance_sede("preinscripciones"))]


@preinscripciones.get("", response_model=ListaRespuesta[PreinscripcionRespuesta], dependencies=permiso_pre)
def listar_preinscripciones(
    estado: int | None = Query(None, gt=0),
    periodo: int | None = Query(None, gt=0),
    sede: int | None = Depends(filtro_sede),
    buscar: str | None = Query(None, max_length=60, description="Nombre, documento, correo o teléfono"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_preinscripciones),
):
    return gestor.listar(estado, buscar, pagina, tamano, sede, periodo)


@preinscripciones.get("/estados", response_model=list[EstadoOpcion], dependencies=permiso_pre)
def estados_preinscripcion(repositorio=Depends(repositorio_sitio)):
    return repositorio.estados_de(CATEGORIA_PREINSCRIPCION)


@preinscripciones.get("/{identificador}", response_model=PreinscripcionRespuesta, dependencies=permiso_pre)
def detalle_preinscripcion(identificador: int, gestor=Depends(gestor_preinscripciones)):
    return gestor.obtener(identificador)


@preinscripciones.patch("/{identificador}/estado", response_model=PreinscripcionRespuesta, dependencies=permiso_pre)
def estado_preinscripcion(identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_preinscripciones)):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


# ---------- Solicitudes de espacio ----------
solicitudes = APIRouter(prefix="/solicitudes-espacio", tags=["Solicitudes de espacio"])
permiso_sol = [Depends(requiere_permiso("aulas")), Depends(alcance_sede("solicitudes"))]


@solicitudes.get("", response_model=ListaRespuesta[SolicitudRespuesta], dependencies=permiso_sol)
def listar_solicitudes(
    estado: int | None = Query(None, gt=0),
    fecha: date | None = Query(None),
    sede: int | None = Depends(filtro_sede),
    buscar: str | None = Query(None, max_length=60, description="Nombre, correo o teléfono"),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_solicitudes),
):
    return gestor.listar(estado, buscar, pagina, tamano, sede, fecha)


@solicitudes.get("/estados", response_model=list[EstadoOpcion], dependencies=permiso_sol)
def estados_solicitud(repositorio=Depends(repositorio_sitio)):
    return repositorio.estados_de(CATEGORIA_SOLICITUD)


@solicitudes.get("/{identificador}", response_model=SolicitudRespuesta, dependencies=permiso_sol)
def detalle_solicitud(identificador: int, gestor=Depends(gestor_solicitudes)):
    return gestor.obtener(identificador)


@solicitudes.patch("/{identificador}/estado", response_model=SolicitudRespuesta, dependencies=permiso_sol)
def estado_solicitud(identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_solicitudes)):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


routers = (planes, periodos, preinscripciones, solicitudes)
