"""Consultas sobre `persona` que comparten estudiantes e instructores."""

from typing import Any

from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.infraestructura.bd.consultas import RepositorioBaseSql, sin_tildes

COLUMNAS_PERSONA = """
    p.idPersona AS "idPersona", p.nombre, p.idTipoDocumento AS "idTipoDocumento",
    td.nombre AS "tipoDocumento", p.documento, p.telefono, p.email, p.fecha_nacimiento
"""


def filtro_buscar_persona() -> str:
    return (
        f"({sin_tildes('p.nombre')} LIKE {sin_tildes(':buscar')} "
        "OR p.documento LIKE :buscar)"
    )


class PersonaSql(RepositorioBaseSql):
    def nombre_tipo_documento(self, id_tipo_documento):
        return self.sesion.execute(
            text("SELECT nombre FROM tipo_documento WHERE idTipoDocumento = :id"),
            {"id": id_tipo_documento},
        ).scalar()

    def documento_existe(self, documento, excluir_persona=None):
        return self.sesion.execute(
            text("SELECT 1 FROM persona WHERE documento = :valor AND idPersona <> :excluir"),
            {"valor": documento.strip(), "excluir": excluir_persona or 0},
        ).first() is not None

    def email_existe(self, email, excluir_persona=None):
        return self.sesion.execute(
            text("SELECT 1 FROM persona WHERE lower(email) = lower(:valor) AND idPersona <> :excluir"),
            {"valor": email.strip(), "excluir": excluir_persona or 0},
        ).first() is not None

    def sedes_activas(self, sedes):
        if not sedes:
            return set()
        filas = self.sesion.execute(
            text("SELECT idSede FROM sede WHERE idSede = ANY(:sedes) AND idEstado = :activo"),
            {"sedes": list(sedes), "activo": ESTADO_ACTIVO},
        ).scalars()
        return set(filas)

    # Estos dos no confirman: los usa cada repositorio dentro de su propia transacción
    def _insertar_persona(self, datos: dict[str, Any]) -> int:
        return self.sesion.execute(
            text(
                "INSERT INTO persona (nombre, idTipoDocumento, documento, telefono, email, "
                "fecha_nacimiento, idEstado) VALUES (:nombre, :idTipoDocumento, :documento, "
                ":telefono, :email, :fecha_nacimiento, :idEstado) RETURNING idPersona"
            ),
            datos,
        ).scalar_one()

    def _actualizar_persona(self, id_persona: int, datos: dict[str, Any]) -> None:
        self.sesion.execute(
            text(
                "UPDATE persona SET nombre = :nombre, idTipoDocumento = :idTipoDocumento, "
                "documento = :documento, telefono = :telefono, email = :email, "
                "fecha_nacimiento = :fecha_nacimiento WHERE idPersona = :idPersona"
            ),
            {**datos, "idPersona": id_persona},
        )


def condicion_persona_en_sede(id_persona: str) -> str:
    """Condición SQL: la persona pertenece a la sede :sede.

    Pertenece si es estudiante de la sede, instructor con esa sede o acudiente de un
    estudiante de la sede. Una persona sin ningún vínculo (recién creada) se ve desde
    ambas sedes. Las cuentas de administrador nunca: se gestionan por script.
    """
    p = id_persona
    return f"""(
        NOT EXISTS (
            SELECT 1 FROM persona pa JOIN usuarios_roles ur ON ur.documento = pa.documento
            JOIN roles r ON r.idRol = ur.idRol
            WHERE pa.idPersona = {p} AND lower(trim(r.nombre)) = 'administrador'
        )
        AND (
            EXISTS (SELECT 1 FROM estudiante e WHERE e.idPersona = {p} AND e.idSede = :sede)
            OR EXISTS (
                SELECT 1 FROM instructor i JOIN instructor_Sede ins ON ins.idInstructor = i.idInstructor
                WHERE i.idPersona = {p} AND ins.idSede = :sede
            )
            OR EXISTS (
                SELECT 1 FROM acudiente a
                JOIN estudiante_responsable er ON er.idAcudiente = a.idAcudiente
                JOIN estudiante e ON e.idEstudiante = er.idEstudiante
                WHERE a.idPersona = {p} AND e.idSede = :sede
            )
            OR NOT (
                EXISTS (SELECT 1 FROM estudiante e WHERE e.idPersona = {p})
                OR EXISTS (SELECT 1 FROM instructor i WHERE i.idPersona = {p})
                OR EXISTS (
                    SELECT 1 FROM acudiente a JOIN estudiante_responsable er ON er.idAcudiente = a.idAcudiente
                    WHERE a.idPersona = {p}
                )
            )
        )
    )"""
