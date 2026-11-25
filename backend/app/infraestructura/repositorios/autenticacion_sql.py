"""Login contra el esquema de Neon: usuarios (llave = documento) y usuarios_roles."""

from sqlalchemy import text

from app.dominio.reglas import ACCIONES, ESTADO_ACTIVO, ROL_ADMINISTRADOR
from app.dominio.repositorios.repositorio_autenticacion import RepositorioAutenticacion
from app.infraestructura.bd.consultas import RepositorioBaseSql


class RepositorioAutenticacionSql(RepositorioBaseSql, RepositorioAutenticacion):
    def buscar_usuario_por_documento(self, documento):
        fila = self.sesion.execute(
            text(
                'SELECT u.documento, p.nombre, u.password_hash, u.idEstado AS "idEstado", '
                'u.idSede AS "idSede", s.nombre AS sede, u.terminos_version AS "terminosVersion" '
                "FROM usuarios u JOIN persona p ON p.documento = u.documento "
                "LEFT JOIN sede s ON s.idSede = u.idSede "
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
            text("SELECT lower(trim(nombre)) FROM roles WHERE idRol = ANY(:roles) AND idEstado = :activo"),
            {"roles": roles, "activo": ESTADO_ACTIVO},
        ).scalars()
        permisos = self.sesion.execute(
            text(
                "SELECT DISTINCT p.descripcion FROM permisos p "
                "JOIN roles_permisos rp ON rp.idPermiso = p.idPermiso "
                "JOIN roles r ON r.idRol = rp.idRol "
                "WHERE rp.idRol = ANY(:roles) AND r.idEstado = :activo"
            ),
            {"roles": roles, "activo": ESTADO_ACTIVO},
        ).scalars()
        return list(nombres), list(permisos)

    def privilegios_de_roles(self, roles):
        if not roles:
            return {}
        filas = self.sesion.execute(
            text(
                "SELECT p.descripcion AS modulo, lower(trim(r.nombre)) AS rol, "
                "rp.puede_ver, rp.puede_crear, rp.puede_editar, rp.puede_eliminar "
                "FROM roles_permisos rp "
                "JOIN permisos p ON p.idPermiso = rp.idPermiso "
                "JOIN roles r ON r.idRol = rp.idRol "
                "WHERE rp.idRol = ANY(:roles) AND r.idEstado = :activo"
            ),
            {"roles": roles, "activo": ESTADO_ACTIVO},
        ).mappings()
        privilegios: dict[str, set[str]] = {}
        for fila in filas:
            # El administrador siempre tiene todo, aunque la fila diga otra cosa
            admin = fila["rol"] == ROL_ADMINISTRADOR
            marcas = (fila["puede_ver"], fila["puede_crear"], fila["puede_editar"], fila["puede_eliminar"])
            acciones = privilegios.setdefault(fila["modulo"], set())
            acciones.update(accion for accion, puede in zip(ACCIONES, marcas) if admin or puede)
        return {modulo: [a for a in ACCIONES if a in acciones] for modulo, acciones in privilegios.items() if acciones}

    def tiene_privilegio(self, documento, modulo, accion):
        columna = {"ver": "rp.puede_ver", "crear": "rp.puede_crear", "editar": "rp.puede_editar", "eliminar": "rp.puede_eliminar"}[accion]
        return self.sesion.execute(
            text(
                "SELECT 1 FROM usuarios u "
                "JOIN usuarios_roles ur ON ur.documento = u.documento "
                "JOIN roles r ON r.idRol = ur.idRol AND r.idEstado = :activo "
                "JOIN roles_permisos rp ON rp.idRol = r.idRol "
                "JOIN permisos p ON p.idPermiso = rp.idPermiso "
                f"WHERE u.documento = :documento AND u.idEstado = :activo AND p.descripcion = :modulo AND {columna} "
                "LIMIT 1"
            ),
            {"documento": documento, "modulo": modulo, "activo": ESTADO_ACTIVO},
        ).first() is not None

    def aceptar_terminos(self, documento, version):
        self.sesion.execute(
            text(
                "UPDATE usuarios SET terminos_version = :version, terminos_fecha = LOCALTIMESTAMP "
                "WHERE documento = :documento"
            ),
            {"documento": documento, "version": version},
        )
        self.sesion.commit()
