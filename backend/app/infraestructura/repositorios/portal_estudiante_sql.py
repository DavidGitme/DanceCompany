from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_portal_estudiante import RepositorioCuentaEstudiante
from app.infraestructura.bd.consultas import RepositorioBaseSql
from app.infraestructura.repositorios.comun_sql import PagadorSql


class RepositorioCuentaEstudianteSql(PagadorSql, RepositorioBaseSql, RepositorioCuentaEstudiante):
    def buscar_por_correo(self, correo):
        fila = self.sesion.execute(
            text(
                """
                SELECT u.documento, p.nombre, u.password_hash,
                       u.idEstado AS "idEstadoUsuario",
                       COALESCE(u.bloqueado_hasta > LOCALTIMESTAMP, false) AS bloqueado,
                       e.idEstudiante AS "idEstudiante", e.idEstado AS "idEstadoEstudiante",
                       EXISTS (SELECT 1 FROM usuarios_roles ur JOIN roles r ON r.idRol = ur.idRol
                                WHERE ur.documento = u.documento AND lower(r.nombre) = 'estudiante'
                                  AND r.idEstado = :activo) AS "esEstudiante"
                  FROM persona p
                  JOIN usuarios u ON u.documento = p.documento
                  LEFT JOIN estudiante e ON e.idPersona = p.idPersona
                 WHERE lower(p.email) = lower(:correo)
                """
            ),
            {"correo": correo, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def id_estudiante_activo(self, documento):
        return self.sesion.execute(
            text(
                "SELECT e.idEstudiante FROM estudiante e JOIN persona p ON p.idPersona = e.idPersona "
                "WHERE p.documento = :documento AND e.idEstado = :activo"
            ),
            {"documento": documento, "activo": ESTADO_ACTIVO},
        ).scalar()

    def perfil(self, id_estudiante):
        fila = self.sesion.execute(
            text(
                """
                SELECT e.idEstudiante AS "idEstudiante", p.nombre, td.nombre AS "tipoDocumento",
                       p.documento, p.email, p.telefono, p.fecha_nacimiento,
                       s.nombre AS sede, s.direccion AS "direccionSede", es.nombre AS estado
                  FROM estudiante e
                  JOIN persona p ON p.idPersona = e.idPersona
                  JOIN tipo_documento td ON td.idTipoDocumento = p.idTipoDocumento
                  JOIN sede s ON s.idSede = e.idSede
                  JOIN estados es ON es.idEstado = e.idEstado
                 WHERE e.idEstudiante = :id
                """
            ),
            {"id": id_estudiante},
        ).mappings().first()
        return dict(fila)

    def acudientes(self, id_estudiante):
        # Solo los acudientes responsables, no el registro propio del estudiante adulto
        return [
            acudiente for acudiente in self.acudientes_de_estudiante(id_estudiante)
            if acudiente["parentesco"] != "El propio estudiante"
        ]
