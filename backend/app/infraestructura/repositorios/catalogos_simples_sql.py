"""Métodos de pago, tipos de convocatoria y tipos de noticia (solo nombre)."""

from app.infraestructura.repositorios.catalogo_simple_sql import RepositorioCatalogoSimpleSql


class RepositorioMetodosPagoSql(RepositorioCatalogoSimpleSql):
    tabla = "metodo_pago"
    columna_id = "idMetodo"
    alias_id = "idMetodo"
    conteo_usos = "SELECT COUNT(*) FROM pago x WHERE x.idMetodo = c.idMetodo"


class RepositorioTiposConvocatoriaSql(RepositorioCatalogoSimpleSql):
    tabla = "tipo_convocatoria"
    columna_id = "idTipoconvo"
    alias_id = "idTipoConvocatoria"
    conteo_usos = "SELECT COUNT(*) FROM convocatoria x WHERE x.idTipoconvo = c.idTipoconvo"


class RepositorioTiposNoticiaSql(RepositorioCatalogoSimpleSql):
    tabla = "tipo_noticia"
    columna_id = "idtiponoticia"
    alias_id = "idTipoNoticia"
    conteo_usos = "SELECT COUNT(*) FROM noticia x WHERE x.idtiponoticia = c.idtiponoticia"
