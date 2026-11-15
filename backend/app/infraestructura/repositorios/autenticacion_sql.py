"""Login contra el esquema de Neon: usuarios (llave = documento) y usuarios_roles."""

from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_autenticacion import RepositorioAutenticacion
from app.infraestructura.bd.consultas import RepositorioBaseSql


class RepositorioAutenticacionSql(RepositorioBaseSql, RepositorioAutenticacion):
    def buscar_usuario_por_documento(self, documento):
        fila = self.sesion.execute(
            text(
                'SELECT u.documento, p.nombre, u.password_hash, u.idEstado AS "idEstado" '
                "FROM usuarios u JOIN persona p ON p.documento = u.documento "
                "WHERE u.documento = :documento"
            ),
            {"documento": documento},
        ).mappings().first()
        if not fila:
            return None
        usuario = dict(fila)
        usuario["roles"] = list(
            self.sesion.execute(
                text("SELECT idRol FROM usuarios_roles WHERE documento = :documento"),
                {"documento": documento},
            ).scalars()
        )
        return usuario

    def permisos_de_roles(self, roles):
        if not roles:
            return [], []
        # Los nombres de rol se devuelven en minúscula ("Instructor" -> "instructor"),
        # que es como los compara el backend y el frontend
        nombres = self.sesion.execute(
            text("SELECT lower(nombre) FROM roles WHERE idRol = ANY(:roles) AND idEstado = :activo"),
            {"roles": roles, "activo": ESTADO_ACTIVO},
        ).scalars()
        permisos = self.sesion.execute(
            text(
                "SELECT DISTINCT p.descripcion FROM permisos p "
                "JOIN roles_permisos rp ON rp.idPermiso = p.idPermiso "
                "WHERE rp.idRol = ANY(:roles)"
            ),
            {"roles": roles},
        ).scalars()
        return list(nombres), list(permisos)
