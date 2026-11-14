"""Arma cada caso de uso administrativo (aulas, horarios, matrículas, pagos, convocatorias,
noticias...) con su repositorio de PostgreSQL."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.aulas.gestionar_aulas import GestionarAulas
from app.aplicacion.casos_uso.catalogos_simples.gestionar_catalogos_simples import (
    GestionarMetodosPago,
    GestionarTiposConvocatoria,
    GestionarTiposNoticia,
)
from app.aplicacion.casos_uso.convocatorias.gestionar_convocatorias import GestionarConvocatorias
from app.aplicacion.casos_uso.horarios.gestionar_horarios import GestionarHorarios
from app.aplicacion.casos_uso.inscripciones_taller.gestionar_inscripciones_taller import (
    GestionarInscripcionesTaller,
)
from app.aplicacion.casos_uso.matriculas.gestionar_matriculas import GestionarMatriculas
from app.aplicacion.casos_uso.mensualidades.gestionar_mensualidades import GestionarMensualidades
from app.aplicacion.casos_uso.noticias.gestionar_noticias import GestionarNoticias
from app.aplicacion.casos_uso.pagos.gestionar_pagos import GestionarPagos
from app.aplicacion.casos_uso.postulaciones.gestionar_postulaciones import GestionarPostulaciones
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.aulas_sql import RepositorioAulasSql
from app.infraestructura.repositorios.catalogos_simples_sql import (
    RepositorioMetodosPagoSql,
    RepositorioTiposConvocatoriaSql,
    RepositorioTiposNoticiaSql,
)
from app.infraestructura.repositorios.convocatorias_sql import (
    RepositorioConvocatoriasSql,
    RepositorioPostulacionesSql,
)
from app.infraestructura.repositorios.horarios_sql import RepositorioHorariosSql
from app.infraestructura.repositorios.inscripciones_taller_sql import (
    RepositorioInscripcionesTallerSql,
)
from app.infraestructura.repositorios.matriculas_sql import RepositorioMatriculasSql
from app.infraestructura.repositorios.mensualidades_sql import RepositorioMensualidadesSql
from app.infraestructura.repositorios.noticias_sql import RepositorioNoticiasSql
from app.infraestructura.repositorios.pagos_sql import RepositorioPagosSql


def gestor_aulas(sesion: Session = Depends(obtener_sesion)):
    return GestionarAulas(RepositorioAulasSql(sesion))


def gestor_horarios(sesion: Session = Depends(obtener_sesion)):
    return GestionarHorarios(RepositorioHorariosSql(sesion))


def gestor_matriculas(sesion: Session = Depends(obtener_sesion)):
    return GestionarMatriculas(RepositorioMatriculasSql(sesion))


def gestor_inscripciones_taller(sesion: Session = Depends(obtener_sesion)):
    return GestionarInscripcionesTaller(RepositorioInscripcionesTallerSql(sesion))


def gestor_mensualidades(sesion: Session = Depends(obtener_sesion)):
    return GestionarMensualidades(RepositorioMensualidadesSql(sesion))


def gestor_pagos(sesion: Session = Depends(obtener_sesion)):
    return GestionarPagos(RepositorioPagosSql(sesion))


def gestor_metodos_pago(sesion: Session = Depends(obtener_sesion)):
    return GestionarMetodosPago(RepositorioMetodosPagoSql(sesion))


def gestor_tipos_convocatoria(sesion: Session = Depends(obtener_sesion)):
    return GestionarTiposConvocatoria(RepositorioTiposConvocatoriaSql(sesion))


def gestor_convocatorias(sesion: Session = Depends(obtener_sesion)):
    return GestionarConvocatorias(RepositorioConvocatoriasSql(sesion))


def gestor_postulaciones(sesion: Session = Depends(obtener_sesion)):
    return GestionarPostulaciones(RepositorioPostulacionesSql(sesion))


def gestor_tipos_noticia(sesion: Session = Depends(obtener_sesion)):
    return GestionarTiposNoticia(RepositorioTiposNoticiaSql(sesion))


def gestor_noticias(sesion: Session = Depends(obtener_sesion)):
    return GestionarNoticias(RepositorioNoticiasSql(sesion))
