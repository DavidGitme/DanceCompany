from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_instructores import RepositorioInstructores
from app.infraestructura.bd.consultas import listar_paginado
from app.infraestructura.repositorios.persona_sql import (
    COLUMNAS_PERSONA,
    PersonaSql,
    filtro_buscar_persona,
)

COLUMNAS = f"""
    i.idInstructor AS "idInstructor", {COLUMNAS_PERSONA},
    i.descripcion, i.idEstado AS "idEstado", es.nombre AS estado,
    COALESCE((SELECT json_agg(json_build_object('idSede', s.idSede, 'nombre', s.nombre) ORDER BY s.nombre)
                FROM instructor_Sede ins JOIN sede s ON s.idSede = ins.idSede
               WHERE ins.idInstructor = i.idInstructor), '[]') AS sedes,
    (SELECT COUNT(*) FROM grupo g
      WHERE g.idInstructor = i.idInstructor AND g.idEstado = :activo) AS "gruposActivos"
"""
ORIGEN = """
    FROM instructor i
    JOIN persona p ON p.idPersona = i.idPersona
    JOIN tipo_documento td ON td.idTipoDocumento = p.idTipoDocumento
    JOIN estados es ON es.idEstado = i.idEstado
"""


class RepositorioInstructoresSql(PersonaSql, RepositorioInstructores):
    def listar(self, estado, buscar, pagina, tamano, sede=None):
        filtros, parametros = [], {"activo": ESTADO_ACTIVO}
        if estado is not None:
            filtros.append("i.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(filtro_buscar_persona())
            parametros["buscar"] = f"%{buscar.strip()}%"
        if sede is not None:
            filtros.append(
                "EXISTS (SELECT 1 FROM instructor_Sede ins "
                "WHERE ins.idInstructor = i.idInstructor AND ins.idSede = :sede)"
            )
            parametros["sede"] = sede
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "p.nombre", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                'SELECT i.idInstructor AS "idInstructor", p.nombre FROM instructor i '
                "JOIN persona p ON p.idPersona = i.idPersona "
                "WHERE i.idEstado = :activo ORDER BY p.nombre"
            ),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE i.idInstructor = :id"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def sedes_con_grupos_activos(self, id_instructor):
        filas = self.sesion.execute(
            text("SELECT DISTINCT idSede FROM grupo WHERE idInstructor = :id AND idEstado = :activo"),
            {"id": id_instructor, "activo": ESTADO_ACTIVO},
        ).scalars()
        return set(filas)

    def crear(self, datos):
        # persona + instructor + sedes en una sola transacción
        try:
            id_persona = self._insertar_persona(datos)
            id_instructor = self.sesion.execute(
                text(
                    "INSERT INTO instructor (idPersona, descripcion, idEstado) "
                    "VALUES (:idPersona, :descripcion, :idEstado) RETURNING idInstructor"
                ),
                {**datos, "idPersona": id_persona},
            ).scalar_one()
            self._guardar_sedes(id_instructor, datos["sedes"])
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(id_instructor)

    def actualizar(self, identificador, datos):
        try:
            id_persona = self.sesion.execute(
                text("SELECT idPersona FROM instructor WHERE idInstructor = :id"),
                {"id": identificador},
            ).scalar_one()
            self._actualizar_persona(id_persona, datos)
            self.sesion.execute(
                text("UPDATE instructor SET descripcion = :descripcion WHERE idInstructor = :id"),
                {"descripcion": datos["descripcion"], "id": identificador},
            )
            self._guardar_sedes(identificador, datos["sedes"])
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE instructor SET idEstado = :estado WHERE idInstructor = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)

    def _guardar_sedes(self, id_instructor, sedes):
        """Reemplaza las sedes del instructor por las recibidas."""
        self.sesion.execute(
            text("DELETE FROM instructor_Sede WHERE idInstructor = :id AND NOT (idSede = ANY(:sedes))"),
            {"id": id_instructor, "sedes": list(sedes)},
        )
        for id_sede in set(sedes):
            self.sesion.execute(
                text(
                    "INSERT INTO instructor_Sede (idInstructor, idSede) VALUES (:id, :sede) "
                    "ON CONFLICT (idInstructor, idSede) DO NOTHING"
                ),
                {"id": id_instructor, "sede": id_sede},
            )
