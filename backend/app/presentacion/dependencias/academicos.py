"""Arma cada caso de uso con su repositorio de PostgreSQL."""

from fastapi import Depends
from sqlalchemy.orm import Session

from app.aplicacion.casos_uso.autenticacion.recuperar_clave import RecuperarClave
from app.config.settings import obtener_configuracion
from app.infraestructura.correo.smtp import CorreoSmtp
from app.infraestructura.repositorios.recuperacion_sql import RepositorioRecuperacionSql
from app.aplicacion.casos_uso.estilos.gestionar_estilos import GestionarEstilos
from app.aplicacion.casos_uso.estudiantes.gestionar_estudiantes import GestionarEstudiantes
from app.aplicacion.casos_uso.grupos.gestionar_grupos import GestionarGrupos
from app.aplicacion.casos_uso.inscripciones.inscribir_estudiante import InscribirEstudiante
from app.aplicacion.casos_uso.matriculas.gestionar_matriculas import GestionarMatriculas
from app.aplicacion.casos_uso.instructores.gestionar_instructores import GestionarInstructores
from app.aplicacion.casos_uso.niveles.gestionar_niveles import GestionarNiveles
from app.aplicacion.casos_uso.sedes.gestionar_sedes import GestionarSedes
from app.aplicacion.casos_uso.talleres.gestionar_talleres import GestionarTalleres
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.estilos_sql import RepositorioEstilosSql
from app.infraestructura.repositorios.estudiantes_sql import RepositorioEstudiantesSql
from app.infraestructura.repositorios.grupos_sql import RepositorioGruposSql
from app.infraestructura.repositorios.inscripciones_sql import RepositorioInscripcionesSql
from app.infraestructura.repositorios.matriculas_sql import RepositorioMatriculasSql
from app.infraestructura.repositorios.instructores_sql import RepositorioInstructoresSql
from app.infraestructura.repositorios.niveles_sql import RepositorioNivelesSql
from app.infraestructura.repositorios.sedes_sql import RepositorioSedesSql
from app.infraestructura.repositorios.talleres_sql import RepositorioTalleresSql
from app.infraestructura.seguridad.hash_claves import HasherArgon2


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


def gestor_inscripciones(sesion: Session = Depends(obtener_sesion)):
    # Todos comparten la misma sesión: la inscripción es una sola transacción
    return InscribirEstudiante(
        GestionarEstudiantes(RepositorioEstudiantesSql(sesion)),
        RepositorioInscripcionesSql(sesion),
        GestionarMatriculas(RepositorioMatriculasSql(sesion)),
        HasherArgon2(),
        RecuperarClave(
            RepositorioRecuperacionSql(sesion), HasherArgon2(),
            CorreoSmtp(obtener_configuracion()), obtener_configuracion().frontend_url,
        ),
    )


class _Invitaciones(RecuperarClave):
    """RecuperarClave que también dice si el correo está configurado."""

    @property
    def configurado(self) -> bool:
        return self.correo.configurado


def recuperacion(sesion: Session = Depends(obtener_sesion)):
    configuracion = obtener_configuracion()
    return _Invitaciones(
        RepositorioRecuperacionSql(sesion), HasherArgon2(), CorreoSmtp(configuracion), configuracion.frontend_url
    )
