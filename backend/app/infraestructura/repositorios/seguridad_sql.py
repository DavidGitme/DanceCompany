"""Seguridad (personas, usuarios, roles, permisos, estados) sobre el esquema de Neon.

Cada recurso declara su tabla, su llave y sus columnas. Las consultas se arman a partir
de esa lista y usan alias entre comillas ("idPersona") porque PostgreSQL devuelve los
nombres de columna en minúscula (idpersona) y la API los entrega en camelCase.
"""

from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dominio.reglas import ESTADO_ACTIVO, ESTADO_INACTIVO
from app.dominio.repositorios.repositorio_seguridad import RepositorioSeguridad
from app.infraestructura.repositorios.persona_sql import condicion_persona_en_sede
from app.infraestructura.repositorios.autenticacion_sql import RepositorioAutenticacionSql

# Expresión del idPersona de cada recurso, para limitar las listas a una sede
PERSONA_DE = {
    "personas": "persona.idPersona",
    "usuarios": "(SELECT pp.idPersona FROM persona pp WHERE pp.documento = usuarios.documento)",
}

RECURSOS = {
    "personas": {
        "tabla": "persona",
        "clave": "idPersona",
        "columnas": ["idPersona", "nombre", "idTipoDocumento", "documento", "telefono",
                     "email", "fecha_nacimiento", "idEstado"],
        "editables": ["nombre", "idTipoDocumento", "documento", "telefono", "email",
                      "fecha_nacimiento", "idEstado"],
    },
    "usuarios": {
        "tabla": "usuarios",
        "clave": "documento",
        "columnas": ["documento", "idEstado"],
        "editables": ["documento", "password_hash", "idEstado"],
    },
    "roles": {
        "tabla": "roles",
        "clave": "idRol",
        "columnas": ["idRol", "nombre", "idEstado"],
        "editables": ["nombre", "idEstado"],
    },
    "permisos": {
        "tabla": "permisos",
        "clave": "idPermiso",
        "columnas": ["idPermiso", "descripcion"],
        "editables": ["descripcion"],
    },
    "estados": {
        "tabla": "estados",
        "clave": "idEstado",
        "columnas": ["idEstado", "nombre", "categoria", "descripcion", "orden"],
        "editables": ["nombre", "categoria", "descripcion", "orden"],
    },
}


def _select(recurso: str) -> str:
    """SELECT con alias: idPersona AS "idPersona", nombre AS "nombre", ..."""
    config = RECURSOS[recurso]
    columnas = [f'{columna} AS "{columna}"' for columna in config["columnas"]]
    if recurso == "usuarios":
        # La tabla no tiene username: el usuario inicia sesión con su documento
        columnas.append('documento AS "username"')
    return f"SELECT {', '.join(columnas)} FROM {config['tabla']}"


class RepositorioSeguridadSql(RepositorioSeguridad):
    def __init__(self, sesion: Session):
        self.sesion = sesion

    # ─── CRUD genérico ─────────────────────────────────

    def listar(self, recurso: str, pagina: int, tamano: int, sede: int | None = None):
        config = RECURSOS[recurso]
        donde, parametros = "", {"tamano": tamano, "inicio": (pagina - 1) * tamano}
        if sede is not None and recurso in PERSONA_DE:
            donde = f"WHERE {condicion_persona_en_sede(PERSONA_DE[recurso])}"
            parametros["sede"] = sede
        total = self.sesion.execute(
            text(f"SELECT COUNT(*) FROM {config['tabla']} {donde}"), parametros
        ).scalar_one()
        filas = self.sesion.execute(
            text(f"{_select(recurso)} {donde} ORDER BY {config['clave']} LIMIT :tamano OFFSET :inicio"),
            parametros,
        ).mappings()
        registros = [dict(fila) for fila in filas]
        for registro in registros:
            self._cargar_relaciones(recurso, registro)
        return registros, total

    def obtener(self, recurso: str, identificador: int | str):
        fila = self.sesion.execute(
            text(f"{_select(recurso)} WHERE {RECURSOS[recurso]['clave']} = :id"),
            {"id": identificador},
        ).mappings().first()
        if not fila:
            return None
        registro = dict(fila)
        self._cargar_relaciones(recurso, registro)
        return registro

    def crear(self, recurso: str, datos: dict[str, Any]):
        config = RECURSOS[recurso]
        relaciones = self._separar_relaciones(recurso, datos)
        valores = {campo: datos[campo] for campo in config["editables"] if campo in datos}
        if recurso == "estados" and valores.get("orden") is None:
            valores["orden"] = self._siguiente_orden(valores["categoria"])

        columnas = ", ".join(valores)
        marcadores = ", ".join(f":{campo}" for campo in valores)
        try:
            identificador = self.sesion.execute(
                text(
                    f"INSERT INTO {config['tabla']} ({columnas}) VALUES ({marcadores}) "
                    f"RETURNING {config['clave']}"
                ),
                valores,
            ).scalar_one()
            self._guardar_relaciones(recurso, identificador, relaciones)
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(recurso, identificador)

    def actualizar(self, recurso: str, identificador: int | str, datos: dict[str, Any]):
        config = RECURSOS[recurso]
        relaciones = self._separar_relaciones(recurso, datos)
        valores = {
            campo: datos[campo]
            for campo in config["editables"]
            if campo in datos and campo != config["clave"]
        }
        try:
            if valores:
                asignaciones = ", ".join(f"{campo} = :{campo}" for campo in valores)
                encontrado = self.sesion.execute(
                    text(
                        f"UPDATE {config['tabla']} SET {asignaciones} "
                        f"WHERE {config['clave']} = :_id RETURNING {config['clave']}"
                    ),
                    {**valores, "_id": identificador},
                ).first()
            else:
                encontrado = self.obtener(recurso, identificador)
            if not encontrado:
                self.sesion.rollback()
                return None
            self._guardar_relaciones(recurso, identificador, relaciones)
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(recurso, identificador)

    def inactivar(self, recurso: str, identificador: int | str):
        return self.actualizar(recurso, identificador, {"idEstado": ESTADO_INACTIVO})

    def persona_existe(self, documento: str) -> bool:
        return self.sesion.execute(
            text("SELECT 1 FROM persona WHERE documento = :documento"), {"documento": documento}
        ).first() is not None

    # ─── Login ─────────────────────────────────────────

    def buscar_usuario_por_documento(self, documento: str):
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
        usuario["roles"] = self._roles_de(documento)
        return usuario

    def permisos_de_roles(self, roles: list[int]):
        if not roles:
            return [], []
        nombres = self.sesion.execute(
            text("SELECT lower(nombre) FROM roles WHERE idRol = ANY(:roles) AND idEstado = :activo"),
            {"roles": list(roles), "activo": ESTADO_ACTIVO},
        ).scalars()
        permisos = self.sesion.execute(
            text(
                "SELECT DISTINCT p.descripcion FROM permisos p "
                "JOIN roles_permisos rp ON rp.idPermiso = p.idPermiso "
                "JOIN roles r ON r.idRol = rp.idRol "
                "WHERE rp.idRol = ANY(:roles) AND r.idEstado = :activo"
            ),
            {"roles": list(roles), "activo": ESTADO_ACTIVO},
        ).scalars()
        return list(nombres), list(permisos)

    # El login comparte estas consultas con el repositorio de autenticación
    privilegios_de_roles = RepositorioAutenticacionSql.privilegios_de_roles
    tiene_privilegio = RepositorioAutenticacionSql.tiene_privilegio
    aceptar_terminos = RepositorioAutenticacionSql.aceptar_terminos

    # ─── Privilegios por módulo ────────────────────────

    def privilegios_de_rol(self, id_rol: int) -> list[dict]:
        """Todos los módulos con lo que el rol puede hacer en cada uno (False si no lo tiene)."""
        filas = self.sesion.execute(
            text(
                'SELECT p.idPermiso AS "idPermiso", p.descripcion AS modulo, '
                "COALESCE(rp.puede_ver, false) AS ver, COALESCE(rp.puede_crear, false) AS crear, "
                "COALESCE(rp.puede_editar, false) AS editar, COALESCE(rp.puede_eliminar, false) AS eliminar "
                "FROM permisos p "
                "LEFT JOIN roles_permisos rp ON rp.idPermiso = p.idPermiso AND rp.idRol = :rol "
                "ORDER BY p.idPermiso"
            ),
            {"rol": id_rol},
        ).mappings()
        return [dict(fila) for fila in filas]

    def guardar_privilegios_rol(self, id_rol: int, privilegios: list[dict]) -> list[dict]:
        """Reemplaza la matriz del rol en una sola transacción.
        Un módulo sin "ver" no se guarda: sin ver no tiene sentido crear ni editar."""
        try:
            self.sesion.execute(text("DELETE FROM roles_permisos WHERE idRol = :rol"), {"rol": id_rol})
            for fila in privilegios:
                if not fila["ver"]:
                    continue
                self.sesion.execute(
                    text(
                        "INSERT INTO roles_permisos (idRol, idPermiso, puede_ver, puede_crear, puede_editar, puede_eliminar) "
                        "VALUES (:rol, :permiso, TRUE, :crear, :editar, :eliminar)"
                    ),
                    {"rol": id_rol, "permiso": fila["idPermiso"], "crear": fila["crear"],
                     "editar": fila["editar"], "eliminar": fila["eliminar"]},
                )
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.privilegios_de_rol(id_rol)

    def fijar_sede_si_vacia(self, documento: str, sede: int) -> None:
        self.sesion.execute(
            text("UPDATE usuarios SET idSede = :sede WHERE documento = :documento AND idSede IS NULL"),
            {"documento": documento, "sede": sede},
        )
        self.sesion.commit()

    def ids_permisos(self) -> set[int]:
        return set(self.sesion.execute(text("SELECT idPermiso FROM permisos")).scalars())

    # ─── Roles y permisos ──────────────────────────────

    def asignar_permisos_rol(self, id_rol: int, permisos: list[int]):
        try:
            self._guardar_relaciones("roles", id_rol, permisos)
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return permisos

    def _roles_de(self, documento: str) -> list[int]:
        return list(
            self.sesion.execute(
                text("SELECT idRol FROM usuarios_roles WHERE documento = :documento ORDER BY idRol"),
                {"documento": documento},
            ).scalars()
        )

    def _permisos_de(self, id_rol: int) -> list[int]:
        return list(
            self.sesion.execute(
                text("SELECT idPermiso FROM roles_permisos WHERE idRol = :id ORDER BY idPermiso"),
                {"id": id_rol},
            ).scalars()
        )

    def _cargar_relaciones(self, recurso: str, registro: dict[str, Any]):
        if recurso == "usuarios":
            registro["roles"] = self._roles_de(registro["documento"])
        elif recurso == "roles":
            registro["permisos"] = self._permisos_de(registro["idRol"])

    @staticmethod
    def _separar_relaciones(recurso: str, datos: dict[str, Any]):
        """Saca de los datos la lista de roles (usuarios) o permisos (roles)."""
        if recurso == "usuarios":
            return datos.get("roles")
        if recurso == "roles":
            return datos.get("permisos")
        return None

    def _guardar_relaciones(self, recurso: str, identificador, relaciones: list[int] | None):
        """Reemplaza los roles de un usuario o los permisos de un rol (sin confirmar)."""
        if relaciones is None:
            return
        if recurso == "usuarios":
            tabla, columna = "usuarios_roles", ("documento", "idRol")
        elif recurso == "roles":
            tabla, columna = "roles_permisos", ("idRol", "idPermiso")
        else:
            return
        self.sesion.execute(
            text(f"DELETE FROM {tabla} WHERE {columna[0]} = :id"), {"id": identificador}
        )
        for valor in dict.fromkeys(relaciones):  # quita repetidos conservando el orden
            self.sesion.execute(
                text(f"INSERT INTO {tabla} ({columna[0]}, {columna[1]}) VALUES (:id, :valor)"),
                {"id": identificador, "valor": valor},
            )

    def _siguiente_orden(self, categoria: str) -> int:
        return self.sesion.execute(
            text("SELECT COALESCE(MAX(orden), 0) + 1 FROM estados WHERE categoria = :categoria"),
            {"categoria": categoria},
        ).scalar_one()
