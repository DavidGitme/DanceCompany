"""Arma los casos de uso del sitio público con su repositorio y el correo."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.sitio_publico.sitio_publico import (
    ConsultarDisponibilidad,
    GestionarPeriodos,
    GestionarPlanes,
    GestionarPreinscripciones,
    GestionarSolicitudes,
    Preinscribir,
    SolicitarEspacio,
)
from app.config.settings import obtener_configuracion
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.correo.smtp import CorreoSmtp
from app.infraestructura.repositorios.sitio_publico_sql import RepositorioSitioPublicoSql


def repositorio_sitio(sesion: Session = Depends(obtener_sesion)):
    return RepositorioSitioPublicoSql(sesion)


def _correo():
    return CorreoSmtp(obtener_configuracion())


def disponibilidad(repositorio=Depends(repositorio_sitio)):
    return ConsultarDisponibilidad(repositorio)


def solicitar_espacio(repositorio=Depends(repositorio_sitio)):
    return SolicitarEspacio(repositorio, _correo())


def preinscribir(repositorio=Depends(repositorio_sitio)):
    return Preinscribir(repositorio, _correo(), obtener_configuracion().frontend_url)


def gestor_periodos(repositorio=Depends(repositorio_sitio)):
    return GestionarPeriodos(repositorio)


def gestor_planes(repositorio=Depends(repositorio_sitio)):
    return GestionarPlanes(repositorio)


def gestor_preinscripciones(repositorio=Depends(repositorio_sitio)):
    return GestionarPreinscripciones(repositorio)


def gestor_solicitudes(repositorio=Depends(repositorio_sitio)):
    return GestionarSolicitudes(repositorio, _correo())
