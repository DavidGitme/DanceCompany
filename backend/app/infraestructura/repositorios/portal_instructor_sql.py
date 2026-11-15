from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_portal_instructor import RepositorioPortalInstructor
from app.infraestructura.bd.consultas import RepositorioBaseSql


class RepositorioPortalInstructorSql(RepositorioBaseSql, RepositorioPortalInstructor):
    def _filas(self, sql, parametros):
        return [dict(fila) for fila in self.sesion.execute(text(sql), parametros).mappings()]

    def perfil_por_documento(self, documento):
        fila = self.sesion.execute(
            text(
                'SELECT i.idInstructor AS "idInstructor", p.nombre, p.documento, '
                "COALESCE(p.email, '') AS correo, COALESCE(p.telefono, '') AS telefono, "
                "COALESCE(i.descripcion, '') AS especialidad "
                "FROM instructor i JOIN persona p ON p.idPersona = i.idPersona "
                "WHERE p.documento = :documento AND i.idEstado = :activo"
            ),
            {"documento": documento, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def grupos(self, id_instructor):
        return self._filas(
            'SELECT g.idGrupo AS "idGrupo", g.nombre, est.nombre AS estilo, n.nombre AS nivel, '
            "s.nombre AS sede, 'Aula ' || g.idAula AS aula, "
            "(SELECT COUNT(*) FROM matricula m JOIN estudiante e ON e.idEstudiante = m.idEstudiante "
            "  WHERE m.idGrupo = g.idGrupo AND e.idEstado = :activo) AS estudiantes "
            "FROM grupo g "
            "JOIN estilo est ON est.idEstilo = g.idEstilo "
            "JOIN nivel n ON n.idNivel = g.idNivel "
            "JOIN sede s ON s.idSede = g.idSede "
            "WHERE g.idInstructor = :instructor AND g.idEstado = :activo "
            "ORDER BY g.nombre",
            {"instructor": id_instructor, "activo": ESTADO_ACTIVO},
        )

    def horarios(self, grupos):
        if not grupos:
            return []
        return self._filas(
            'SELECT idGrupo AS "idGrupo", dia_semana AS dia, hora_inicio AS inicio, hora_fin AS fin '
            "FROM horario WHERE idGrupo = ANY(:grupos) ORDER BY hora_inicio",
            {"grupos": grupos},
        )

    def estudiantes(self, id_instructor):
        return self._filas(
            'SELECT m.idMatricula AS "idMatricula", e.idEstudiante AS "idEstudiante", p.nombre, '
            "COALESCE(p.documento, '') AS documento, COALESCE(p.email, '') AS correo, "
            "COALESCE(p.telefono, '') AS telefono, g.idGrupo AS \"idGrupo\" "
            "FROM matricula m "
            "JOIN grupo g ON g.idGrupo = m.idGrupo "
            "JOIN estudiante e ON e.idEstudiante = m.idEstudiante "
            "JOIN persona p ON p.idPersona = e.idPersona "
            "WHERE g.idInstructor = :instructor AND g.idEstado = :activo AND e.idEstado = :activo "
            "ORDER BY p.nombre",
            {"instructor": id_instructor, "activo": ESTADO_ACTIVO},
        )

    def mensualidades(self, matriculas):
        if not matriculas:
            return []
        return self._filas(
            'SELECT mn.idMatricula AS "idMatricula", mn.valor_pagar AS valor, '
            'mn.fecha_limite AS "fechaLimite", es.nombre AS estado '
            "FROM mensualidad mn JOIN estados es ON es.idEstado = mn.idEstado "
            "WHERE mn.idMatricula = ANY(:matriculas) ORDER BY mn.fecha_limite DESC",
            {"matriculas": matriculas},
        )
