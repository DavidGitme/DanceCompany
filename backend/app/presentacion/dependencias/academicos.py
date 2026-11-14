"""Arma cada caso de uso con su repositorio de PostgreSQL."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.estilos.gestionar_estilos import GestionarEstilos
from app.aplicacion.casos_uso.estudiantes.gestionar_estudiantes import GestionarEstudiantes
from app.aplicacion.casos_uso.grupos.gestionar_grupos import GestionarGrupos
from app.aplicacion.casos_uso.instructores.gestionar_instructores import GestionarInstructores
from app.aplicacion.casos_uso.niveles.gestionar_niveles import GestionarNiveles
from app.aplicacion.casos_uso.sedes.gestionar_sedes import GestionarSedes
from app.aplicacion.casos_uso.talleres.gestionar_talleres import GestionarTalleres
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.estilos_sql import RepositorioEstilosSql
from app.infraestructura.repositorios.estudiantes_sql import RepositorioEstudiantesSql
from app.infraestructura.repositorios.grupos_sql import RepositorioGruposSql
from app.infraestructura.repositorios.instructores_sql import RepositorioInstructoresSql
from app.infraestructura.repositorios.niveles_sql import RepositorioNivelesSql
from app.infraestructura.repositorios.sedes_sql import RepositorioSedesSql
from app.infraestructura.repositorios.talleres_sql import RepositorioTalleresSql


def gestor_estilos(sesion: Session = Depends(obtener_sesion)):
    return GestionarEstilos(RepositorioEstilosSql(sesion))


def gestor_sedes(sesion: Session = Depends(obtener_sesion)):
    return GestionarSedes(RepositorioSedesSql(sesion))


def gestor_niveles(sesion: Session = Depends(obtener_sesion)):
    return GestionarNiveles(RepositorioNivelesSql(sesion))


def gestor_talleres(sesion: Session = Depends(obtener_sesion)):
    return GestionarTalleres(RepositorioTalleresSql(sesion))


def gestor_instructores(sesion: Session = Depends(obtener_sesion)):
    return GestionarInstructores(RepositorioInstructoresSql(sesion))


def gestor_estudiantes(sesion: Session = Depends(obtener_sesion)):
    return GestionarEstudiantes(RepositorioEstudiantesSql(sesion))


def gestor_grupos(sesion: Session = Depends(obtener_sesion)):
    return GestionarGrupos(RepositorioGruposSql(sesion))
