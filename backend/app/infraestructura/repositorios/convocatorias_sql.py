from sqlalchemy import text

from app.dominio.reglas import CATEGORIA_POSTULACION, ESTADO_ACTIVO, POSTULACION_ACEPTADO
from app.dominio.repositorios.repositorio_convocatorias import (
    RepositorioConvocatorias,
    RepositorioPostulaciones,
)
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import EstadoCategoriaSql

# La convocatoria no tiene estado: su vigencia sale de las fechas
VIGENCIA = """CASE WHEN c.fecha_inicio > CURRENT_DATE THEN 'Próxima'
                   WHEN c.fecha_fin IS NOT NULL AND c.fecha_fin < CURRENT_DATE THEN 'Cerrada'
                   ELSE 'Abierta' END"""
CONDICION_VIGENCIA = {
    "proxima": "c.fecha_inicio > CURRENT_DATE",
    "abierta": "c.fecha_inicio <= CURRENT_DATE AND (c.fecha_fin IS NULL OR c.fecha_fin >= CURRENT_DATE)",
    "cerrada": "c.fecha_inicio <= CURRENT_DATE AND c.fecha_fin < CURRENT_DATE",
}

# ---------- Convocatorias ----------
COLUMNAS_CONVOCATORIA = f"""
    c.idConvocatoria AS "idConvocatoria", c.nombre, c.fecha_inicio, c.fecha_fin, c.descripcion,
    c.idTipoconvo AS "idTipoConvocatoria", tc.nombre AS "tipoConvocatoria",
    {VIGENCIA} AS vigencia,
    (SELECT COUNT(*) FROM convocatoria_estudiante ce
      WHERE ce.idConvocatoria = c.idConvocatoria) AS postulados,
    (SELECT COUNT(*) FROM convocatoria_estudiante ce JOIN estados es ON es.idEstado = ce.idEstado
      WHERE ce.idConvocatoria = c.idConvocatoria
        AND es.nombre = :aceptado AND es.categoria = :categoria) AS aceptados
"""
ORIGEN_CONVOCATORIA = """
    FROM convocatoria c
    JOIN tipo_convocatoria tc ON tc.idTipoconvo = c.idTipoconvo
"""
PARAMETROS_CONTEO = {"aceptado": POSTULACION_ACEPTADO, "categoria": CATEGORIA_POSTULACION}


class RepositorioConvocatoriasSql(RepositorioBaseSql, RepositorioConvocatorias):
    def listar(self, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], dict(PARAMETROS_CONTEO)
        filtros = filtros or {}
        if buscar:
            condiciones.append(f"{sin_tildes('c.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        if filtros.get("tipo") is not None:
            condiciones.append("c.idTipoconvo = :tipo")
            parametros["tipo"] = filtros["tipo"]
        if filtros.get("vigencia"):
            condiciones.append(CONDICION_VIGENCIA[filtros["vigencia"]])
        return listar_paginado(
            self.sesion, COLUMNAS_CONVOCATORIA, ORIGEN_CONVOCATORIA, condiciones, parametros,
            "c.fecha_inicio DESC, c.nombre", pagina, tamano,
        )

    def disponibles(self):
        filas = self.sesion.execute(
            text(
                'SELECT c.idConvocatoria AS "idConvocatoria", c.nombre, '
                'tc.nombre AS "tipoConvocatoria", c.fecha_fin '
                f"{ORIGEN_CONVOCATORIA} WHERE {CONDICION_VIGENCIA['abierta']} ORDER BY c.nombre"
            )
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS_CONVOCATORIA} {ORIGEN_CONVOCATORIA} WHERE c.idConvocatoria = :id"),
            {**PARAMETROS_CONTEO, "id": identificador},
        ).mappings().first()
        return dict(fila) if fila else None

    def tipo_existe(self, id_tipo):
        return self.sesion.execute(
            text("SELECT 1 FROM tipo_convocatoria WHERE idTipoconvo = :id"), {"id": id_tipo}
        ).first() is not None

    def nombre_existe(self, nombre, excluir_id=None):
        return self.sesion.execute(
            text(
                f"SELECT 1 FROM convocatoria WHERE {sin_tildes('nombre')} = {sin_tildes(':nombre')} "
                "AND idConvocatoria <> :excluir"
            ),
            {"nombre": nombre, "excluir": excluir_id or 0},
        ).first() is not None

    def tiene_grupo_competencia(self, id_convocatoria):
        return self.sesion.execute(
            text("SELECT 1 FROM grupo_competencia WHERE idConvocatoria = :id"), {"id": id_convocatoria}
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO convocatoria (nombre, fecha_inicio, fecha_fin, descripcion, idTipoconvo) "
            "VALUES (:nombre, :fecha_inicio, :fecha_fin, :descripcion, :idTipoConvocatoria) "
            "RETURNING idConvocatoria",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE convocatoria SET nombre = :nombre, fecha_inicio = :fecha_inicio, "
            "fecha_fin = :fecha_fin, descripcion = :descripcion, idTipoconvo = :idTipoConvocatoria "
            "WHERE idConvocatoria = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def eliminar(self, identificador):
        self._guardar("DELETE FROM convocatoria WHERE idConvocatoria = :id", {"id": identificador})


# ---------- Postulaciones (convocatoria_estudiante) ----------
COLUMNAS_POSTULACION = f"""
    ce.idConvocatoriaEst AS "idPostulacion", ce.idConvocatoria AS "idConvocatoria",
    c.nombre AS convocatoria, {VIGENCIA} AS vigencia,
    ce.idEstudiante AS "idEstudiante", p.nombre AS estudiante, p.documento, s.nombre AS sede,
    ce.idEstado AS "idEstado", es.nombre AS estado, ce.beneficio
"""
ORIGEN_POSTULACION = """
    FROM convocatoria_estudiante ce
    JOIN convocatoria c ON c.idConvocatoria = ce.idConvocatoria
    JOIN estudiante e ON e.idEstudiante = ce.idEstudiante
    JOIN persona p ON p.idPersona = e.idPersona
    JOIN sede s ON s.idSede = e.idSede
    JOIN estados es ON es.idEstado = ce.idEstado
"""
FILTROS_POSTULACION = {"convocatoria": "ce.idConvocatoria", "estudiante": "ce.idEstudiante"}


class RepositorioPostulacionesSql(EstadoCategoriaSql, RepositorioBaseSql, RepositorioPostulaciones):
    categoria = CATEGORIA_POSTULACION

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if estado is not None:
            condiciones.append("ce.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            condiciones.append(
                f"({sin_tildes('p.nombre')} LIKE {sin_tildes(':buscar')} OR p.documento LIKE :buscar)"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        for nombre, valor in (filtros or {}).items():
            if valor is not None:
                condiciones.append(f"{FILTROS_POSTULACION[nombre]} = :{nombre}")
                parametros[nombre] = valor
        return listar_paginado(
            self.sesion, COLUMNAS_POSTULACION, ORIGEN_POSTULACION, condiciones, parametros,
            "c.fecha_inicio DESC, p.nombre", pagina, tamano,
        )

    def disponibles(self):
        """Postulaciones aceptadas."""
        filas = self.sesion.execute(
            text(
                f"SELECT {COLUMNAS_POSTULACION} {ORIGEN_POSTULACION} "
                "WHERE es.nombre = :aceptado AND es.categoria = :categoria ORDER BY c.nombre, p.nombre"
            ),
            PARAMETROS_CONTEO,
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS_POSTULACION} {ORIGEN_POSTULACION} WHERE ce.idConvocatoriaEst = :id"),
            {"id": identificador},
        ).mappings().first()
        return dict(fila) if fila else None

    def obtener_convocatoria(self, id_convocatoria):
        fila = self.sesion.execute(
            text(
                f'SELECT c.idConvocatoria AS "idConvocatoria", {VIGENCIA} AS vigencia '
                "FROM convocatoria c WHERE c.idConvocatoria = :id"
            ),
            {"id": id_convocatoria},
        ).mappings().first()
        return dict(fila) if fila else None

    def estudiante_activo(self, id_estudiante):
        return self.sesion.execute(
            text("SELECT 1 FROM estudiante WHERE idEstudiante = :id AND idEstado = :activo"),
            {"id": id_estudiante, "activo": ESTADO_ACTIVO},
        ).first() is not None

    def postulacion_existe(self, id_convocatoria, id_estudiante):
        return self.sesion.execute(
            text(
                "SELECT 1 FROM convocatoria_estudiante "
                "WHERE idConvocatoria = :convocatoria AND idEstudiante = :estudiante"
            ),
            {"convocatoria": id_convocatoria, "estudiante": id_estudiante},
        ).first() is not None

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO convocatoria_estudiante (idConvocatoria, idEstudiante, idEstado, beneficio) "
            "VALUES (:idConvocatoria, :idEstudiante, :idEstado, :beneficio) RETURNING idConvocatoriaEst",
            {"beneficio": None, **datos},
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE convocatoria_estudiante SET beneficio = :beneficio WHERE idConvocatoriaEst = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE convocatoria_estudiante SET idEstado = :estado WHERE idConvocatoriaEst = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)

    def eliminar(self, identificador):
        self._guardar(
            "DELETE FROM convocatoria_estudiante WHERE idConvocatoriaEst = :id", {"id": identificador}
        )
