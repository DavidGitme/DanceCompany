from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dominio.repositorios.repositorio_seguridad import RepositorioSeguridad


class RepositorioSeguridadSql(RepositorioSeguridad):
    tablas = {
        "personas": ("personas", "idPersona"),
        "usuarios": ("usuarios", "documento"),
        "roles": ("roles", "idRol"),
        "permisos": ("permisos", "idPermiso"),
        "estados": ("estados", "idEstado"),
    }

    def __init__(self, sesion: Session):
        self.sesion = sesion

    def listar(self, recurso: str, pagina: int, tamano: int):
        tabla, clave = self.tablas[recurso]
        total = self.sesion.execute(text(f"SELECT COUNT(*) FROM {tabla}")).scalar_one()
        consulta = text(
            f"SELECT * FROM {tabla} ORDER BY {clave} OFFSET :inicio ROWS FETCH NEXT :tamano ROWS ONLY"
        )
        filas = self.sesion.execute(
            consulta, {"inicio": (pagina - 1) * tamano, "tamano": tamano}
        ).mappings()
        registros = [dict(fila) for fila in filas]
        for registro in registros:
            self._cargar_relaciones(recurso, registro)
        return registros, total

    def obtener(self, recurso: str, identificador: int | str):
        tabla, clave = self.tablas[recurso]
        fila = self.sesion.execute(
            text(f"SELECT * FROM {tabla} WHERE {clave} = :id"), {"id": identificador}
        ).mappings().first()
        if not fila:
            return None
        registro = dict(fila)
        self._cargar_relaciones(recurso, registro)
        return registro

    def crear(self, recurso: str, datos: dict[str, Any]):
        tabla, _ = self.tablas[recurso]
        datos = dict(datos)
        relaciones = datos.pop("roles", None) if recurso == "usuarios" else datos.pop("permisos", None)
        columnas = ", ".join(datos)
        valores = ", ".join(f":{columna}" for columna in datos)
        fila = self.sesion.execute(
            text(f"INSERT INTO {tabla} ({columnas}) OUTPUT INSERTED.* VALUES ({valores})"),
            datos,
        ).mappings().one()
        registro = dict(fila)
        self._guardar_relaciones(recurso, registro, relaciones)
        self.sesion.commit()
        self._cargar_relaciones(recurso, registro)
        return registro

    def actualizar(self, recurso: str, identificador: int | str, datos: dict[str, Any]):
        tabla, clave = self.tablas[recurso]
        datos = dict(datos)
        relaciones = datos.pop("roles", None) if recurso == "usuarios" else datos.pop("permisos", None)
        asignaciones = ", ".join(f"{campo} = :{campo}" for campo in datos)
        fila = self.sesion.execute(
            text(
                f"UPDATE {tabla} SET {asignaciones} OUTPUT INSERTED.* WHERE {clave} = :_id"
            ),
            {**datos, "_id": identificador},
        ).mappings().first()
        if not fila:
            self.sesion.rollback()
            return None
        registro = dict(fila)
        self._guardar_relaciones(recurso, registro, relaciones)
        self.sesion.commit()
        self._cargar_relaciones(recurso, registro)
        return registro

    def inactivar(self, recurso: str, identificador: int | str):
        return self.actualizar(recurso, identificador, {"idEstado": 2})

    def buscar_usuario_por_documento(self, documento: str):
        fila = self.sesion.execute(
            text(
                "SELECT u.*, p.nombre FROM usuarios u "
                "JOIN personas p ON p.documento = u.documento "
                "WHERE p.documento = :documento"
            ),
            {"documento": documento},
        ).mappings().first()
        if not fila:
            return None
        usuario = dict(fila)
        roles = self.sesion.execute(
            text("SELECT idRol FROM usuarios_roles WHERE documento = :documento"),
            {"documento": usuario["documento"]},
        ).scalars()
        usuario["roles"] = list(roles)
        return usuario

    def permisos_de_roles(self, roles: list[int]):
        if not roles:
            return [], []
        parametros = {f"rol_{i}": rol for i, rol in enumerate(roles)}
        marcadores = ", ".join(f":rol_{i}" for i in range(len(roles)))
        nombres = self.sesion.execute(
            text(f"SELECT nombre FROM roles WHERE idRol IN ({marcadores})"), parametros
        ).scalars()
        permisos = self.sesion.execute(
            text(
                "SELECT DISTINCT p.descripcion FROM permisos p "
                "JOIN roles_permisos rp ON rp.idPermiso = p.idPermiso "
                f"WHERE rp.idRol IN ({marcadores})"
            ),
            parametros,
        ).scalars()
        return list(nombres), list(permisos)

    def asignar_permisos_rol(self, id_rol: int, permisos: list[int]):
        self.sesion.execute(
            text("DELETE FROM roles_permisos WHERE idRol = :idRol"), {"idRol": id_rol}
        )
        for id_permiso in permisos:
            self.sesion.execute(
                text(
                    "INSERT INTO roles_permisos (idRol, idPermiso) "
                    "VALUES (:idRol, :idPermiso)"
                ),
                {"idRol": id_rol, "idPermiso": id_permiso},
            )
        self.sesion.commit()
        return permisos

    def _cargar_relaciones(self, recurso: str, registro: dict[str, Any]):
        if recurso == "usuarios":
            registro["roles"] = list(
                self.sesion.execute(
                    text("SELECT idRol FROM usuarios_roles WHERE documento = :documento"),
                    {"documento": registro["documento"]},
                ).scalars()
            )
        elif recurso == "roles":
            registro["permisos"] = list(
                self.sesion.execute(
                    text("SELECT idPermiso FROM roles_permisos WHERE idRol = :id"),
                    {"id": registro["idRol"]},
                ).scalars()
            )

    def _guardar_relaciones(
        self,
        recurso: str,
        registro: dict[str, Any],
        relaciones: list[int] | None,
    ):
        if relaciones is None:
            return
        if recurso == "usuarios":
            self.sesion.execute(
                text("DELETE FROM usuarios_roles WHERE documento = :documento"),
                {"documento": registro["documento"]},
            )
            for id_rol in relaciones:
                self.sesion.execute(
                    text(
                        "INSERT INTO usuarios_roles (documento, idRol) "
                        "VALUES (:documento, :idRol)"
                    ),
                    {"documento": registro["documento"], "idRol": id_rol},
                )
        elif recurso == "roles":
            self.sesion.execute(
                text("DELETE FROM roles_permisos WHERE idRol = :id"),
                {"id": registro["idRol"]},
            )
            for id_permiso in relaciones:
                self.sesion.execute(
                    text(
                        "INSERT INTO roles_permisos (idRol, idPermiso) "
                        "VALUES (:idRol, :idPermiso)"
                    ),
                    {"idRol": registro["idRol"], "idPermiso": id_permiso},
                )
