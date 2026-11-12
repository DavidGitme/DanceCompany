from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_grupos import RepositorioGrupos
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes

COLUMNAS = """
    g.idGrupo AS "idGrupo", g.nombre,
    g.idNivel AS "idNivel", n.nombre AS nivel,
    g.idEstilo AS "idEstilo", est.nombre AS estilo,
    g.idInstructor AS "idInstructor", p.nombre AS instructor,
    g.idSede AS "idSede", s.nombre AS sede,
    g.idAula AS "idAula",
    g.idtipogrup AS "idTipoGrupo", tg.nombre AS "tipoGrupo",
    g.capacidad,
    (SELECT COUNT(*) FROM matricula m WHERE m.idGrupo = g.idGrupo) AS matriculados,
    g.idEstado AS "idEstado", es.nombre AS estado
"""
ORIGEN = """
    FROM grupo g
    JOIN nivel n ON n.idNivel = g.idNivel
    JOIN estilo est ON est.idEstilo = g.idEstilo
    JOIN instructor i ON i.idInstructor = g.idInstructor
    JOIN persona p ON p.idPersona = i.idPersona
    JOIN sede s ON s.idSede = g.idSede
    JOIN tipo_grupo tg ON tg.idtipogrup = g.idtipogrup
    JOIN estados es ON es.idEstado = g.idEstado
"""

# Filtros por llave foránea que acepta el listado: parámetro -> columna
FILTROS_FK = {
    "sede": "g.idSede",
    "nivel": "g.idNivel",
    "estilo": "g.idEstilo",
    "instructor": "g.idInstructor",
}

# Tablas que se pueden validar con esta_activo (nunca llega texto del usuario aquí)
TABLAS_CON_ESTADO = {
    "nivel": "idNivel",
    "estilo": "idEstilo",
    "instructor": "idInstructor",
    "sede": "idSede",
}


class RepositorioGruposSql(RepositorioBaseSql, RepositorioGrupos):
    def listar(self, estado, buscar, pagina, tamano, filtros_fk=None):
        filtros, parametros = [], {}
        if estado is not None:
            filtros.append("g.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(f"{sin_tildes('g.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros_fk or {}).items():
            if valor is not None:
                filtros.append(f"{FILTROS_FK[nombre]} = :{nombre}")
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "s.nombre, g.nombre", pagina, tamano
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                f'SELECT g.idGrupo AS "idGrupo", g.nombre, s.nombre AS sede, est.nombre AS estilo, '
                f"n.nombre AS nivel {ORIGEN} WHERE g.idEstado = :activo ORDER BY s.nombre, g.nombre"
            ),
            {"activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE g.idGrupo = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def esta_activo(self, tabla, identificador):
        columna = TABLAS_CON_ESTADO[tabla]
        return self.sesion.execute(
            text(f"SELECT 1 FROM {tabla} WHERE {columna} = :id AND idEstado = :activo"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).first() is not None

    def obtener_aula(self, id_aula):
        fila = self.sesion.execute(
            text(
                'SELECT idAula AS "idAula", capacidad, idSede AS "idSede", idEstado AS "idEstado" '
                "FROM aula WHERE idAula = :id"
            ),
            {"id": id_aula},
        ).mappings().first()
        return dict(fila) if fila else None

    def tipo_grupo_existe(self, id_tipo):
        return self.sesion.execute(
            text("SELECT 1 FROM tipo_grupo WHERE idtipogrup = :id"), {"id": id_tipo}
        ).first() is not None

    def instructor_en_sede(self, id_instructor, id_sede):
        return self.sesion.execute(
            text("SELECT 1 FROM instructor_Sede WHERE idInstructor = :instructor AND idSede = :sede"),
            {"instructor": id_instructor, "sede": id_sede},
        ).first() is not None

    def nombre_en_sede_existe(self, nombre, id_sede, excluir_id=None):
        return self.sesion.execute(
            text(
                f"SELECT 1 FROM grupo WHERE {sin_tildes('nombre')} = {sin_tildes(':nombre')} "
                "AND idSede = :sede AND idGrupo <> :excluir"
            ),
            {"nombre": nombre, "sede": id_sede, "excluir": excluir_id or 0},
        ).first() is not None

    def listar_tipos(self):
        filas = self.sesion.execute(
            text('SELECT idtipogrup AS "idTipoGrupo", nombre FROM tipo_grupo ORDER BY nombre')
        ).mappings()
        return [dict(fila) for fila in filas]

    def listar_aulas(self, id_sede):
        filas = self.sesion.execute(
            text(
                'SELECT idAula AS "idAula", capacidad FROM aula '
                "WHERE idSede = :sede AND idEstado = :activo ORDER BY idAula"
            ),
            {"sede": id_sede, "activo": ESTADO_ACTIVO},
        ).mappings()
        return [dict(fila) for fila in filas]

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO grupo (nombre, idNivel, idEstilo, idInstructor, idSede, idAula, "
            "idtipogrup, capacidad, idEstado) VALUES (:nombre, :idNivel, :idEstilo, "
            ":idInstructor, :idSede, :idAula, :idTipoGrupo, :capacidad, :idEstado) RETURNING idGrupo",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE grupo SET nombre = :nombre, idNivel = :idNivel, idEstilo = :idEstilo, "
            "idInstructor = :idInstructor, idSede = :idSede, idAula = :idAula, "
            "idtipogrup = :idTipoGrupo, capacidad = :capacidad WHERE idGrupo = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE grupo SET idEstado = :estado WHERE idGrupo = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
