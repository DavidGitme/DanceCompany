"""Consultas del sitio público (bd/07_sitio_publico.sql) y de sus módulos del panel.

Lo público solo devuelve lo necesario para elegir: aulas, capacidad y franjas
ocupadas. Nunca nombres de estudiantes, grupos ni datos de quien pidió un espacio.
"""

from sqlalchemy import text

from app.dominio.reglas import (
    CATEGORIA_PREINSCRIPCION,
    CATEGORIA_SOLICITUD,
    ESTADO_ACTIVO,
    SOLICITUD_APROBADA,
    SOLICITUD_PENDIENTE,
)
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes


def _filas(resultado):
    return [dict(fila) for fila in resultado.mappings()]


def _hora(valor):
    return valor.strftime("%H:%M") if valor is not None else None


class RepositorioSitioPublicoSql(RepositorioBaseSql):
    # ---------- Estados por categoría ----------
    def id_estado(self, nombre: str, categoria: str) -> int | None:
        return self.sesion.execute(
            text("SELECT idEstado FROM estados WHERE nombre = :n AND categoria = :c"),
            {"n": nombre, "c": categoria},
        ).scalar()

    def estados_de(self, categoria: str):
        return _filas(self.sesion.execute(
            text('SELECT idEstado AS "idEstado", nombre FROM estados WHERE categoria = :c ORDER BY orden'),
            {"c": categoria},
        ))

    # ---------- Catálogos públicos ----------
    def planes(self, solo_activos=True):
        filtro = "WHERE p.idEstado = :activo" if solo_activos else ""
        return _filas(self.sesion.execute(
            text(
                'SELECT p.idPlan AS "idPlan", p.nombre, p.meses, p.valor, p.descripcion, '
                f'p.idEstado AS "idEstado", es.nombre AS estado FROM plan p '
                f"JOIN estados es ON es.idEstado = p.idEstado {filtro} ORDER BY p.meses"
            ),
            {"activo": ESTADO_ACTIVO},
        ))

    def plan(self, id_plan):
        return next((p for p in self.planes(False) if p["idPlan"] == id_plan), None)

    def actualizar_plan(self, id_plan, datos):
        self._guardar(
            "UPDATE plan SET nombre = :nombre, meses = :meses, valor = :valor, descripcion = :descripcion "
            "WHERE idPlan = :id",
            {**datos, "id": id_plan},
        )
        return self.plan(id_plan)

    def crear_plan(self, datos):
        nuevo = self._guardar(
            "INSERT INTO plan (nombre, meses, valor, descripcion) VALUES (:nombre, :meses, :valor, :descripcion) "
            "RETURNING idPlan",
            datos,
        ).scalar_one()
        return self.plan(nuevo)

    def cambiar_estado_plan(self, id_plan, id_estado):
        self._guardar("UPDATE plan SET idEstado = :e WHERE idPlan = :id", {"e": id_estado, "id": id_plan})
        return self.plan(id_plan)

    def plan_nombre_existe(self, nombre, excluir=None):
        return self.sesion.execute(
            text(f"SELECT 1 FROM plan WHERE {sin_tildes('nombre')} = {sin_tildes(':n')} AND idPlan <> :ex"),
            {"n": nombre, "ex": excluir or 0},
        ).first() is not None

    def sedes_publicas(self):
        filas = _filas(self.sesion.execute(
            text(
                'SELECT idSede AS "idSede", nombre, direccion, hora_apertura, hora_cierre FROM sede '
                "WHERE idEstado = :activo ORDER BY idSede"
            ),
            {"activo": ESTADO_ACTIVO},
        ))
        for fila in filas:
            fila["horaApertura"] = _hora(fila.pop("hora_apertura"))
            fila["horaCierre"] = _hora(fila.pop("hora_cierre"))
        return filas

    def sede_publica(self, id_sede):
        return next((s for s in self.sedes_publicas() if s["idSede"] == id_sede), None)

    def estilos_activos(self):
        return _filas(self.sesion.execute(
            text('SELECT idEstilo AS "idEstilo", nombre FROM estilo WHERE idEstado = :a ORDER BY nombre'),
            {"a": ESTADO_ACTIVO},
        ))

    def tipos_documento(self):
        return _filas(self.sesion.execute(
            text('SELECT idTipoDocumento AS id, nombre FROM tipo_documento ORDER BY idTipoDocumento')
        ))

    def nombre_tipo_documento(self, id_tipo):
        return self.sesion.execute(
            text("SELECT nombre FROM tipo_documento WHERE idTipoDocumento = :id"), {"id": id_tipo}
        ).scalar()

    # ---------- Disponibilidad de aulas ----------
    def aulas_de_sede(self, id_sede):
        return _filas(self.sesion.execute(
            text(
                'SELECT idAula AS "idAula", capacidad FROM aula '
                "WHERE idSede = :sede AND idEstado = :activo ORDER BY idAula"
            ),
            {"sede": id_sede, "activo": ESTADO_ACTIVO},
        ))

    def aula_activa(self, id_aula):
        fila = self.sesion.execute(
            text(
                'SELECT a.idAula AS "idAula", a.capacidad, a.idSede AS "idSede", s.nombre AS sede '
                "FROM aula a JOIN sede s ON s.idSede = a.idSede "
                "WHERE a.idAula = :id AND a.idEstado = :activo AND s.idEstado = :activo"
            ),
            {"id": id_aula, "activo": ESTADO_ACTIVO},
        ).mappings().first()
        return dict(fila) if fila else None

    def clases_del_dia(self, aulas: list[int], dia: str):
        """Bloques semanales de grupos activos en esas aulas ese día de la semana."""
        if not aulas:
            return []
        return _filas(self.sesion.execute(
            text(
                'SELECT g.idAula AS "idAula", h.hora_inicio, h.hora_fin FROM horario h '
                "JOIN grupo g ON g.idGrupo = h.idGrupo "
                "WHERE g.idAula = ANY(:aulas) AND g.idEstado = :activo AND h.dia_semana = :dia "
                "ORDER BY h.hora_inicio"
            ),
            {"aulas": aulas, "activo": ESTADO_ACTIVO, "dia": dia},
        ))

    def reservas_del_dia(self, aulas: list[int], fecha, excluir=None):
        """Solicitudes aprobadas o en revisión de esas aulas en esa fecha."""
        if not aulas:
            return []
        return _filas(self.sesion.execute(
            text(
                'SELECT s.idAula AS "idAula", s.hora_inicio, s.hora_fin, es.nombre AS estado '
                "FROM solicitud_espacio s JOIN estados es ON es.idEstado = s.idEstado "
                "WHERE s.idAula = ANY(:aulas) AND s.fecha = :fecha AND es.categoria = :cat "
                "AND es.nombre IN (:aprobada, :pendiente) AND s.idSolicitud <> :excluir "
                "ORDER BY s.hora_inicio"
            ),
            {
                "aulas": aulas, "fecha": fecha, "cat": CATEGORIA_SOLICITUD, "excluir": excluir or 0,
                "aprobada": SOLICITUD_APROBADA, "pendiente": SOLICITUD_PENDIENTE,
            },
        ))

    # ---------- Solicitudes de espacio ----------
    COLUMNAS_SOLICITUD = """
        s.idSolicitud AS "idSolicitud", s.nombre, s.email, s.telefono, s.idAula AS "idAula",
        a.idSede AS "idSede", se.nombre AS sede, a.capacidad, s.fecha,
        to_char(s.hora_inicio, 'HH24:MI') AS "horaInicio", to_char(s.hora_fin, 'HH24:MI') AS "horaFin",
        s.personas, s.mensaje, s.creado, s.idEstado AS "idEstado", es.nombre AS estado
    """
    ORIGEN_SOLICITUD = """
        FROM solicitud_espacio s
        JOIN aula a ON a.idAula = s.idAula
        JOIN sede se ON se.idSede = a.idSede
        JOIN estados es ON es.idEstado = s.idEstado
    """

    def crear_solicitud(self, datos):
        nuevo = self._guardar(
            "INSERT INTO solicitud_espacio (nombre, email, telefono, idAula, fecha, hora_inicio, hora_fin, "
            "personas, mensaje, idEstado) VALUES (:nombre, :email, :telefono, :idAula, :fecha, :hora_inicio, "
            ":hora_fin, :personas, :mensaje, :idEstado) RETURNING idSolicitud",
            datos,
        ).scalar_one()
        return self.solicitud(nuevo)

    def solicitud(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {self.COLUMNAS_SOLICITUD} {self.ORIGEN_SOLICITUD} WHERE s.idSolicitud = :id"),
            {"id": identificador},
        ).mappings().first()
        if not fila:
            return None
        datos = dict(fila)
        datos["hora_inicio"], datos["hora_fin"] = datos["horaInicio"], datos["horaFin"]
        return datos

    def listar_solicitudes(self, estado, buscar, pagina, tamano, sede=None, fecha=None):
        filtros, parametros = [], {}
        if estado is not None:
            filtros.append("s.idEstado = :estado")
            parametros["estado"] = estado
        if sede is not None:
            filtros.append("a.idSede = :sede")
            parametros["sede"] = sede
        if fecha is not None:
            filtros.append("s.fecha = :fecha")
            parametros["fecha"] = fecha
        if buscar:
            filtros.append(
                f"({sin_tildes('s.nombre')} LIKE {sin_tildes(':buscar')} OR lower(s.email) LIKE lower(:buscar) "
                "OR s.telefono LIKE :buscar)"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, self.COLUMNAS_SOLICITUD, self.ORIGEN_SOLICITUD, filtros, parametros,
            "s.fecha DESC, s.hora_inicio", pagina, tamano,
        )

    def cambiar_estado_solicitud(self, identificador, id_estado):
        self._guardar("UPDATE solicitud_espacio SET idEstado = :e WHERE idSolicitud = :id",
                      {"e": id_estado, "id": identificador})
        return self.solicitud(identificador)

    # ---------- Periodos de matrícula ----------
    COLUMNAS_PERIODO = """
        pm.idPeriodo AS "idPeriodo", pm.nombre, pm.fecha_inicio, pm.fecha_fin,
        pm.idEstado AS "idEstado", es.nombre AS estado,
        CASE WHEN CURRENT_DATE < pm.fecha_inicio THEN 'Próximo'
             WHEN CURRENT_DATE > pm.fecha_fin THEN 'Cerrado' ELSE 'Abierto' END AS vigencia,
        (SELECT COUNT(*) FROM preinscripcion pr WHERE pr.idPeriodo = pm.idPeriodo) AS preinscripciones
    """
    ORIGEN_PERIODO = "FROM periodo_matricula pm JOIN estados es ON es.idEstado = pm.idEstado"

    def listar_periodos(self, estado, buscar, pagina, tamano):
        filtros, parametros = [], {}
        if estado is not None:
            filtros.append("pm.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            filtros.append(f"{sin_tildes('pm.nombre')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, self.COLUMNAS_PERIODO, self.ORIGEN_PERIODO, filtros, parametros,
            "pm.fecha_inicio DESC", pagina, tamano,
        )

    def periodo(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {self.COLUMNAS_PERIODO} {self.ORIGEN_PERIODO} WHERE pm.idPeriodo = :id"),
            {"id": identificador},
        ).mappings().first()
        return dict(fila) if fila else None

    def periodo_abierto(self, hoy):
        fila = self.sesion.execute(
            text(
                f"SELECT {self.COLUMNAS_PERIODO} {self.ORIGEN_PERIODO} "
                "WHERE pm.idEstado = :activo AND :hoy BETWEEN pm.fecha_inicio AND pm.fecha_fin "
                "ORDER BY pm.fecha_fin LIMIT 1"
            ),
            {"activo": ESTADO_ACTIVO, "hoy": hoy},
        ).mappings().first()
        return dict(fila) if fila else None

    def periodo_cruzado(self, inicio, fin, excluir=None):
        """Otro periodo activo que se cruza con esas fechas."""
        return self.sesion.execute(
            text(
                "SELECT nombre FROM periodo_matricula WHERE idEstado = :activo AND idPeriodo <> :ex "
                "AND fecha_inicio <= :fin AND fecha_fin >= :inicio LIMIT 1"
            ),
            {"activo": ESTADO_ACTIVO, "ex": excluir or 0, "inicio": inicio, "fin": fin},
        ).scalar()

    def crear_periodo(self, datos):
        nuevo = self._guardar(
            "INSERT INTO periodo_matricula (nombre, fecha_inicio, fecha_fin) VALUES (:nombre, :fecha_inicio, "
            ":fecha_fin) RETURNING idPeriodo",
            datos,
        ).scalar_one()
        return self.periodo(nuevo)

    def actualizar_periodo(self, identificador, datos):
        self._guardar(
            "UPDATE periodo_matricula SET nombre = :nombre, fecha_inicio = :fecha_inicio, fecha_fin = :fecha_fin "
            "WHERE idPeriodo = :id",
            {**datos, "id": identificador},
        )
        return self.periodo(identificador)

    def cambiar_estado_periodo(self, identificador, id_estado):
        self._guardar("UPDATE periodo_matricula SET idEstado = :e WHERE idPeriodo = :id",
                      {"e": id_estado, "id": identificador})
        return self.periodo(identificador)

    # ---------- Preinscripciones ----------
    COLUMNAS_PREINSCRIPCION = """
        pr.idPreinscripcion AS "idPreinscripcion", pr.idPeriodo AS "idPeriodo", pm.nombre AS periodo,
        pr.nombre, pr.idTipoDocumento AS "idTipoDocumento", td.nombre AS "tipoDocumento", pr.documento,
        pr.fecha_nacimiento, pr.telefono, pr.email, pr.idSede AS "idSede", se.nombre AS sede,
        pr.idEstilo AS "idEstilo", est.nombre AS estilo, pr.idPlan AS "idPlan", pl.nombre AS plan,
        pr.nombre_acudiente AS "nombreAcudiente", pr.telefono_acudiente AS "telefonoAcudiente",
        pr.fecha_confirmacion AS "fechaConfirmacion", pr.creado,
        pr.idEstado AS "idEstado", es.nombre AS estado
    """
    ORIGEN_PREINSCRIPCION = """
        FROM preinscripcion pr
        JOIN periodo_matricula pm ON pm.idPeriodo = pr.idPeriodo
        JOIN tipo_documento td ON td.idTipoDocumento = pr.idTipoDocumento
        JOIN sede se ON se.idSede = pr.idSede
        LEFT JOIN estilo est ON est.idEstilo = pr.idEstilo
        LEFT JOIN plan pl ON pl.idPlan = pr.idPlan
        JOIN estados es ON es.idEstado = pr.idEstado
    """

    def preinscripcion(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {self.COLUMNAS_PREINSCRIPCION} {self.ORIGEN_PREINSCRIPCION} WHERE pr.idPreinscripcion = :id"),
            {"id": identificador},
        ).mappings().first()
        return dict(fila) if fila else None

    def listar_preinscripciones(self, estado, buscar, pagina, tamano, sede=None, periodo=None):
        filtros, parametros = [], {}
        for campo, valor in (("pr.idEstado", estado), ("pr.idSede", sede), ("pr.idPeriodo", periodo)):
            if valor is not None:
                clave = campo.split(".")[1].lower()
                filtros.append(f"{campo} = :{clave}")
                parametros[clave] = valor
        if buscar:
            filtros.append(
                f"({sin_tildes('pr.nombre')} LIKE {sin_tildes(':buscar')} OR pr.documento LIKE :buscar "
                "OR lower(pr.email) LIKE lower(:buscar) OR pr.telefono LIKE :buscar)"
            )
            parametros["buscar"] = f"%{buscar.strip()}%"
        return listar_paginado(
            self.sesion, self.COLUMNAS_PREINSCRIPCION, self.ORIGEN_PREINSCRIPCION, filtros, parametros,
            "pr.creado DESC", pagina, tamano,
        )

    def preinscripcion_existe(self, id_periodo, documento):
        return self.sesion.execute(
            text("SELECT 1 FROM preinscripcion WHERE idPeriodo = :p AND documento = :d"),
            {"p": id_periodo, "d": documento},
        ).first() is not None

    def crear_preinscripcion(self, datos):
        nuevo = self._guardar(
            "INSERT INTO preinscripcion (idPeriodo, nombre, idTipoDocumento, documento, fecha_nacimiento, "
            "telefono, email, idSede, idEstilo, idPlan, nombre_acudiente, telefono_acudiente, terminos_version, "
            "token_hash, token_expira, idEstado) VALUES (:idPeriodo, :nombre, :idTipoDocumento, :documento, "
            ":fecha_nacimiento, :telefono, :email, :idSede, :idEstilo, :idPlan, :nombre_acudiente, "
            ":telefono_acudiente, :terminos_version, :token_hash, :token_expira, :idEstado) "
            "RETURNING idPreinscripcion",
            datos,
        ).scalar_one()
        return self.preinscripcion(nuevo)

    def confirmar_preinscripcion(self, token_hash, ahora, id_por_confirmar, id_confirmada):
        """Marca Confirmada la preinscripción del enlace si está vigente. Devuelve su id o None."""
        return self._guardar(
            "UPDATE preinscripcion SET idEstado = :confirmada, fecha_confirmacion = :ahora, token_hash = NULL "
            "WHERE token_hash = :token AND token_expira >= :ahora AND idEstado = :por_confirmar "
            "RETURNING idPreinscripcion",
            {"token": token_hash, "ahora": ahora, "confirmada": id_confirmada, "por_confirmar": id_por_confirmar},
        ).scalar()

    def cambiar_estado_preinscripcion(self, identificador, id_estado):
        self._guardar("UPDATE preinscripcion SET idEstado = :e WHERE idPreinscripcion = :id",
                      {"e": id_estado, "id": identificador})
        return self.preinscripcion(identificador)

    def categoria_de_estado(self, id_estado):
        return self.sesion.execute(
            text("SELECT categoria FROM estados WHERE idEstado = :id"), {"id": id_estado}
        ).scalar()


CATEGORIAS = {"preinscripcion": CATEGORIA_PREINSCRIPCION, "solicitud": CATEGORIA_SOLICITUD}
