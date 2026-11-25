from sqlalchemy import text

from app.dominio.repositorios.repositorio_recuperacion import RepositorioRecuperacion
from app.infraestructura.bd.consultas import RepositorioBaseSql


class RepositorioRecuperacionSql(RepositorioBaseSql, RepositorioRecuperacion):
    def cuenta(self, documento):
        fila = self.sesion.execute(
            text(
                'SELECT u.documento, p.nombre, p.email, u.idEstado AS "idEstado" '
                "FROM usuarios u JOIN persona p ON p.documento = u.documento "
                "WHERE u.documento = :documento"
            ),
            {"documento": documento},
        ).mappings().first()
        return dict(fila) if fila else None

    def guardar_token(self, documento, token_hash, expira):
        self.sesion.execute(
            text("UPDATE recuperacion_clave SET usado = TRUE WHERE documento = :documento AND NOT usado"),
            {"documento": documento},
        )
        self.sesion.execute(
            text(
                "INSERT INTO recuperacion_clave (documento, token_hash, expira) "
                "VALUES (:documento, :hash, :expira)"
            ),
            {"documento": documento, "hash": token_hash, "expira": expira},
        )

    def consumir_token(self, token_hash):
        # Un solo UPDATE: dos peticiones con el mismo enlace no pueden usarlo las dos
        return self.sesion.execute(
            text(
                "UPDATE recuperacion_clave SET usado = TRUE "
                "WHERE token_hash = :hash AND NOT usado AND expira > LOCALTIMESTAMP "
                "RETURNING documento"
            ),
            {"hash": token_hash},
        ).scalar()

    def cambiar_clave(self, documento, password_hash):
        self.sesion.execute(
            text(
                "UPDATE usuarios SET password_hash = :hash, intentos_fallidos = 0, bloqueado_hasta = NULL "
                "WHERE documento = :documento"
            ),
            {"documento": documento, "hash": password_hash},
        )

    def confirmar(self):
        self.sesion.commit()

    def deshacer(self):
        self.sesion.rollback()
