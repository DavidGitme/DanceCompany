"""Arma el portal del estudiante y obtiene el estudiante dueño del token."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.portal_estudiante.consultar_portal_estudiante import (
    ConsultarPortalEstudiante,
)
from app.aplicacion.casos_uso.portal_estudiante.iniciar_sesion_estudiante import (
    ROL_ESTUDIANTE,
    IniciarSesionEstudiante,
)
from app.config.settings import obtener_configuracion
from app.dominio.excepciones.errores import NoAutorizado
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.convocatorias_sql import (
    RepositorioConvocatoriasSql,
    RepositorioPostulacionesSql,
)
from app.infraestructura.repositorios.grupos_sql import RepositorioGruposSql
from app.infraestructura.repositorios.horarios_sql import RepositorioHorariosSql
from app.infraestructura.repositorios.inscripciones_taller_sql import (
    RepositorioInscripcionesTallerSql,
)
from app.infraestructura.repositorios.matriculas_sql import RepositorioMatriculasSql
from app.infraestructura.repositorios.mensualidades_sql import RepositorioMensualidadesSql
from app.infraestructura.repositorios.pagos_sql import RepositorioPagosSql
from app.infraestructura.repositorios.portal_estudiante_sql import RepositorioCuentaEstudianteSql
from app.infraestructura.repositorios.talleres_sql import RepositorioTalleresSql
from app.infraestructura.seguridad.hash_claves import HasherArgon2
from app.infraestructura.seguridad.jwt_tokens import EmisorJwt
from app.presentacion.dependencias.auth import get_usuario_actual


def inicio_sesion_estudiante(sesion: Session = Depends(obtener_sesion)):
    return IniciarSesionEstudiante(
        RepositorioCuentaEstudianteSql(sesion), HasherArgon2(), EmisorJwt(obtener_configuracion())
    )


def portal_estudiante(sesion: Session = Depends(obtener_sesion)):
    return ConsultarPortalEstudiante(
        cuenta=RepositorioCuentaEstudianteSql(sesion),
        matriculas=RepositorioMatriculasSql(sesion),
        horarios=RepositorioHorariosSql(sesion),
        grupos=RepositorioGruposSql(sesion),
        mensualidades=RepositorioMensualidadesSql(sesion),
        pagos=RepositorioPagosSql(sesion),
        inscripciones=RepositorioInscripcionesTallerSql(sesion),
        talleres=RepositorioTalleresSql(sesion),
        convocatorias=RepositorioConvocatoriasSql(sesion),
        postulaciones=RepositorioPostulacionesSql(sesion),
    )


def estudiante_actual(
    usuario: dict = Depends(get_usuario_actual), sesion: Session = Depends(obtener_sesion)
) -> int:
    """idEstudiante del token. Un administrador u otro rol no entra al portal."""
    if ROL_ESTUDIANTE not in usuario.get("roles", []):
        raise NoAutorizado("Esta sección es solo para estudiantes.")
    id_estudiante = RepositorioCuentaEstudianteSql(sesion).id_estudiante_activo(usuario["sub"])
    if id_estudiante is None:
        raise NoAutorizado("Tu cuenta de estudiante no está activa.")
    return id_estudiante
