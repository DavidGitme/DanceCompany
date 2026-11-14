from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_aulas import RepositorioAulas
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import EstadoCategoriaSql

COLUMNAS = """
    a.idAula AS "idAula", a.capacidad, a.idSede AS "idSede", s.nombre AS sede,
    a.idEstado AS "idEstado", es.nombre AS estado,
    (SELECT COUNT(*) FROM grupo g
      WHERE g.idAula = a.idAula AND g.idEstado = :activo) AS "gruposActivos"
"""
ORIGEN = """
    FROM aula a
    JOIN sede s ON s.idSede = a.idSede
    JOIN estados es ON es.idEstado = a.idEstado
"""


class RepositorioAulasSql(EstadoCategoriaSql, RepositorioBaseSql, RepositorioAulas):
    def listar(self, estado, buscar, pagina, tamano, filtros_fk=None):
        filtros, parametros = [], {"activo": ESTADO_ACTIVO}
        if estado is not None:
            filtros.append("a.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(f"{sin_tildes('s.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        if (filtros_fk or {}).get("sede") is not None:
            filtros.append("a.idSede = :sede")
            parametros["sede"] = filtros_fk["sede"]
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, filtros, parametros, "s.nombre, a.idAula", pagina, tamano
        )

    def disponibles(self, id_sede=None):
        filtro_sede = "AND a.idSede = :sede" if id_sede is not None else ""
        filas = self.sesion.execute(
            text(
                'SELECT a.idAula AS "idAula", a.capacidad, a.idSede AS "idSede", s.nombre AS sede '
                f"FROM aula a JOIN sede s ON s.idSede = a.idSede "
                f"WHERE a.idEstado = :activo {filtro_sede} ORDER BY s.nombre, a.idAula"
            ),
            {"activo": ESTADO_ACTIVO, "sede": id_sede},
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE a.idAula = :id"),
            {"id": identificador, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def sede_activa(self, id_sede):
        return self.sesion.execute(
            text("SELECT 1 FROM sede WHERE idSede = :id AND idEstado = :activo"),
            {"id": id_sede, "activo": ESTADO_ACTIVO},
        ).first() is not None

    def cantidad_grupos(self, id_aula):
        return self.sesion.execute(
            text("SELECT COUNT(*) FROM grupo WHERE idAula = :id"), {"id": id_aula}
        ).scalar_one()

    def capacidad_maxima_grupos_activos(self, id_aula):
        return self.sesion.execute(
            text("SELECT COALESCE(MAX(capacidad), 0) FROM grupo WHERE idAula = :id AND idEstado = :activo"),
            {"id": id_aula, "activo": ESTADO_ACTIVO},
        ).scalar_one()

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO aula (capacidad, idSede, idEstado) "
            "VALUES (:capacidad, :idSede, :idEstado) RETURNING idAula",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE aula SET capacidad = :capacidad, idSede = :idSede WHERE idAula = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE aula SET idEstado = :estado WHERE idAula = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
