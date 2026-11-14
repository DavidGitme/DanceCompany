from sqlalchemy import text

from app.dominio.reglas import CATEGORIA_NOTICIA, NOTICIA_DISPONIBLE, NOTICIA_EXPIRADA
from app.dominio.repositorios.repositorio_noticias import RepositorioNoticias
from app.infraestructura.bd.consultas import RepositorioBaseSql, listar_paginado, sin_tildes
from app.infraestructura.repositorios.comun_sql import EstadoCategoriaSql

COLUMNAS = """
    n.idNoticia AS "idNoticia", n.titulo, n.contenido, n.imagen_url,
    n.idtiponoticia AS "idTipoNoticia", tn.nombre AS "tipoNoticia",
    n.fecha_publicacion, n.fecha_expiracion, n.idEstado AS "idEstado", es.nombre AS estado
"""
ORIGEN = """
    FROM noticia n
    JOIN tipo_noticia tn ON tn.idtiponoticia = n.idtiponoticia
    JOIN estados es ON es.idEstado = n.idEstado
"""


class RepositorioNoticiasSql(EstadoCategoriaSql, RepositorioBaseSql, RepositorioNoticias):
    categoria = CATEGORIA_NOTICIA

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        condiciones, parametros = [], {}
        if estado is not None:
            condiciones.append("n.idEstado = :estado")
            parametros["estado"] = estado
        if buscar:
            condiciones.append(f"{sin_tildes('n.titulo')} LIKE {sin_tildes(':buscar')}")
            parametros["buscar"] = f"%{buscar.strip()}%"
        if (filtros or {}).get("tipo") is not None:
            condiciones.append("n.idtiponoticia = :tipo")
            parametros["tipo"] = filtros["tipo"]
        return listar_paginado(
            self.sesion, COLUMNAS, ORIGEN, condiciones, parametros,
            "n.fecha_publicacion DESC, n.idNoticia DESC", pagina, tamano,
        )

    def disponibles(self):
        return self.publicas(None, 100, self.ahora())

    def ahora(self):
        return self.sesion.execute(text("SELECT LOCALTIMESTAMP(0)")).scalar_one()

    def a_hora_local(self, valor):
        if valor is None or valor.tzinfo is None:
            return valor
        return self.sesion.execute(
            text("SELECT CAST(:valor AS timestamptz) AT TIME ZONE current_setting('TimeZone')"),
            {"valor": valor},
        ).scalar_one()

    def publicas(self, id_tipo, limite, ahora):
        filtro_tipo = "AND n.idtiponoticia = :tipo" if id_tipo is not None else ""
        filas = self.sesion.execute(
            text(
                'SELECT n.idNoticia AS "idNoticia", n.titulo, n.contenido, n.imagen_url, '
                'tn.nombre AS "tipoNoticia", n.fecha_publicacion, n.fecha_expiracion '
                f"{ORIGEN} WHERE es.nombre = :disponible AND es.categoria = :categoria "
                "AND n.fecha_publicacion <= :ahora "
                "AND (n.fecha_expiracion IS NULL OR n.fecha_expiracion > :ahora) "
                f"{filtro_tipo} ORDER BY n.fecha_publicacion DESC LIMIT :limite"
            ),
            {
                "disponible": NOTICIA_DISPONIBLE, "categoria": self.categoria,
                "ahora": ahora, "tipo": id_tipo, "limite": limite,
            },
        ).mappings()
        return [dict(fila) for fila in filas]

    def obtener(self, identificador):
        fila = self.sesion.execute(
            text(f"SELECT {COLUMNAS} {ORIGEN} WHERE n.idNoticia = :id"), {"id": identificador}
        ).mappings().first()
        return dict(fila) if fila else None

    def tipo_existe(self, id_tipo):
        return self.sesion.execute(
            text("SELECT 1 FROM tipo_noticia WHERE idtiponoticia = :id"), {"id": id_tipo}
        ).first() is not None

    def marcar_expiradas(self, ahora):
        resultado = self._guardar(
            "UPDATE noticia SET idEstado = :expirada WHERE idEstado = :disponible "
            "AND fecha_expiracion IS NOT NULL AND fecha_expiracion <= :ahora",
            {
                "expirada": self.id_estado(NOTICIA_EXPIRADA),
                "disponible": self.id_estado(NOTICIA_DISPONIBLE),
                "ahora": ahora,
            },
        )
        return resultado.rowcount

    def crear(self, datos):
        nuevo_id = self._guardar(
            "INSERT INTO noticia (titulo, contenido, imagen_url, idtiponoticia, fecha_publicacion, "
            "fecha_expiracion, idEstado) VALUES (:titulo, :contenido, :imagen_url, :idTipoNoticia, "
            ":fecha_publicacion, :fecha_expiracion, :idEstado) RETURNING idNoticia",
            datos,
        ).scalar_one()
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self._guardar(
            "UPDATE noticia SET titulo = :titulo, contenido = :contenido, imagen_url = :imagen_url, "
            "idtiponoticia = :idTipoNoticia, fecha_publicacion = :fecha_publicacion, "
            "fecha_expiracion = :fecha_expiracion WHERE idNoticia = :id",
            {**datos, "id": identificador},
        )
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        self._guardar(
            "UPDATE noticia SET idEstado = :estado WHERE idNoticia = :id",
            {"estado": id_estado, "id": identificador},
        )
        return self.obtener(identificador)
