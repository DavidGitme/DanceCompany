"""Inscripción presencial: persona, estudiante, acudientes y cuenta en una sola transacción."""

from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_estudiantes import RepositorioInscripciones
from app.infraestructura.repositorios.persona_sql import PersonaSql

DATOS_PERSONA = """
    p.idPersona AS "idPersona", p.nombre, p.idTipoDocumento AS "idTipoDocumento",
    td.nombre AS "tipoDocumento", p.documento, p.telefono, p.email, p.fecha_nacimiento
"""


class RepositorioInscripcionesSql(PersonaSql, RepositorioInscripciones):
    def _persona(self, condicion: str, parametros: dict):
        fila = self.sesion.execute(
            text(
                f"SELECT {DATOS_PERSONA}, a.idAcudiente AS \"idAcudiente\", "
                "EXISTS (SELECT 1 FROM estudiante e WHERE e.idPersona = p.idPersona) AS \"esEstudiante\", "
                '(SELECT e.idSede FROM estudiante e WHERE e.idPersona = p.idPersona) AS "sedeEstudiante", '
                "EXISTS (SELECT 1 FROM usuarios_roles ur JOIN roles r ON r.idRol = ur.idRol "
                "WHERE ur.documento = p.documento AND lower(trim(r.nombre)) = 'administrador') "
                'AS "esAdministrador" '
                "FROM persona p JOIN tipo_documento td ON td.idTipoDocumento = p.idTipoDocumento "
                f"LEFT JOIN acudiente a ON a.idPersona = p.idPersona WHERE {condicion}"
            ),
            parametros,
        ).mappings().first()
        return dict(fila) if fila else None

    def buscar_persona(self, documento):
        return self._persona("p.documento = :documento", {"documento": documento})

    def obtener_persona(self, id_persona):
        return self._persona("p.idPersona = :id", {"id": id_persona})

    def parentesco_existe(self, id_parentesco):
        return self.sesion.execute(
            text("SELECT 1 FROM parentesco WHERE idParentesco = :id"), {"id": id_parentesco}
        ).first() is not None

    def id_rol(self, nombre):
        return self.sesion.execute(
            text("SELECT idRol FROM roles WHERE lower(nombre) = lower(:nombre) AND idEstado = :activo"),
            {"nombre": nombre, "activo": ESTADO_ACTIVO},
        ).scalar()

    def insertar_persona(self, datos):
        return self._insertar_persona({**datos, "idEstado": ESTADO_ACTIVO})

    def insertar_estudiante(self, id_persona, id_sede):
        return self.sesion.execute(
            text(
                "INSERT INTO estudiante (idSede, idPersona, idEstado) "
                "VALUES (:sede, :persona, :activo) RETURNING idEstudiante"
            ),
            {"sede": id_sede, "persona": id_persona, "activo": ESTADO_ACTIVO},
        ).scalar_one()

    def asegurar_acudiente(self, id_persona):
        existente = self.sesion.execute(
            text("SELECT idAcudiente FROM acudiente WHERE idPersona = :id"), {"id": id_persona}
        ).scalar()
        if existente:
            return existente
        return self.sesion.execute(
            text("INSERT INTO acudiente (idPersona, idEstado) VALUES (:id, :activo) RETURNING idAcudiente"),
            {"id": id_persona, "activo": ESTADO_ACTIVO},
        ).scalar_one()

    def vincular_acudiente(self, id_estudiante, id_acudiente, id_parentesco):
        self.sesion.execute(
            text(
                "INSERT INTO estudiante_responsable (idEstudiante, idAcudiente, idParentesco) "
                "VALUES (:estudiante, :acudiente, :parentesco)"
            ),
            {"estudiante": id_estudiante, "acudiente": id_acudiente, "parentesco": id_parentesco},
        )

    def desvincular_acudiente(self, id_estudiante, id_acudiente):
        resultado = self.sesion.execute(
            text("DELETE FROM estudiante_responsable WHERE idEstudiante = :estudiante AND idAcudiente = :acudiente"),
            {"estudiante": id_estudiante, "acudiente": id_acudiente},
        )
        return resultado.rowcount > 0

    def acudientes_de(self, id_estudiante):
        filas = self.sesion.execute(
            text(
                'SELECT a.idAcudiente AS "idAcudiente", p.idPersona AS "idPersona", p.nombre, '
                'td.nombre AS "tipoDocumento", p.documento, p.telefono, p.email, '
                'er.idParentesco AS "idParentesco", pa.nombre AS parentesco '
                "FROM estudiante_responsable er "
                "JOIN acudiente a ON a.idAcudiente = er.idAcudiente "
                "JOIN persona p ON p.idPersona = a.idPersona "
                "JOIN tipo_documento td ON td.idTipoDocumento = p.idTipoDocumento "
                "JOIN parentesco pa ON pa.idParentesco = er.idParentesco "
                "WHERE er.idEstudiante = :id ORDER BY p.nombre"
            ),
            {"id": id_estudiante},
        ).mappings()
        return [dict(fila) for fila in filas]

    def crear_cuenta(self, documento, password_hash, id_rol):
        self.sesion.execute(
            text("INSERT INTO usuarios (documento, password_hash, idEstado) VALUES (:doc, :hash, :activo)"),
            {"doc": documento, "hash": password_hash, "activo": ESTADO_ACTIVO},
        )
        self.sesion.execute(
            text("INSERT INTO usuarios_roles (documento, idRol) VALUES (:doc, :rol)"),
            {"doc": documento, "rol": id_rol},
        )

    def confirmar(self):
        self.sesion.commit()

    def deshacer(self):
        self.sesion.rollback()
