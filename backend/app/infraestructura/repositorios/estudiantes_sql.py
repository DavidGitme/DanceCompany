from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_estudiantes import RepositorioEstudiantes
from app.infraestructura.bd.consultas import listar_paginado
from app.infraestructura.repositorios.persona_sql import (
    COLUMNAS_PERSONA,
    PersonaSql,
    filtro_buscar_persona,
)

COLUMNAS = f"""
    e.idEstudiante AS "idEstudiante", {COLUMNAS_PERSONA},
    e.idSede AS "idSede", s.nombre AS sede, e.idEstado AS "idEstado", es.nombre AS estado,
    COALESCE((SELECT json_agg(json_build_object('idGrupo', g.idGrupo, 'nombre', g.nombre) ORDER BY g.nombre)
                FROM matricula m JOIN grupo g ON g.idGrupo = m.idGrupo
               WHERE m.idEstudiante = e.idEstudiante AND g.idEstado = :activo), '[]') AS grupos
"""
ORIGEN = """
    FROM estudiante e
    JOIN persona p ON p.idPersona = e.idPersona
    JOIN tipo_documento td ON td.idTipoDocumento = p.idTipoDocumento
    JOIN sede s ON s.idSede = e.idSede
    JOIN estados es ON es.idEstado = e.idEstado
"""


class RepositorioEstudiantesSql(PersonaSql, RepositorioEstudiantes):
    def listar(self, estado, buscar, pagina, tamano, sede=None, grupo=None):
        filtros, parametros = [], {"activo": ESTADO_ACTIVO}
        if estado is not None:
            filtros.append("e.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(filtro_buscar_persona())
            parametros["buscar"] = f"%{buscar.strip()}%"
        if sede is not None:
            filtros.append("e.idSede = :sede")
            parametros["sede"] = sede
        if grupo is not None:
            filtros.append(
                "EXISTS (SELECT 1 FROM matricula m "
                "WHERE m.idEstudiante = e.idEstudiante AND m.idGrupo = :grupo)"
            )
            parametros["grupo"] = grupo
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "p.nombre", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                'SELECT e.idEstudiante AS "idEstudiante", p.nombre, p.documento FROM estudiante e '
                "JOIN persona p ON p.idPersona = e.idPersona "
                "WHERE e.idEstado = :activo ORDER BY p.nombre"
            ),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE e.idEstudiante = :id"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def crear(self, datos):
        try:
            id_persona = self._insertar_persona(datos)
            id_estudiante = self.sesion.execute(
                text(
                    "INSERT INTO estudiante (idSede, idPersona, idEstado) "
                    "VALUES (:idSede, :idPersona, :idEstado) RETURNING idEstudiante"
                ),
                {**datos, "idPersona": id_persona},
            ).scalar_one()
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(id_estudiante)

    def actualizar(self, identificador, datos):
        try:
            id_persona = self.sesion.execute(
                text("SELECT idPersona FROM estudiante WHERE idEstudiante = :id"),
                {"id": identificador},
            ).scalar_one()
            self._actualizar_persona(id_persona, datos)
            self.sesion.execute(
                text("UPDATE estudiante SET idSede = :idSede WHERE idEstudiante = :id"),
                {"idSede": datos["idSede"], "id": identificador},
            )
            self.sesion.commit()
        except Exception:
            self.sesion.rollback()
            raise
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE estudiante SET idEstado = :estado WHERE idEstudiante = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
