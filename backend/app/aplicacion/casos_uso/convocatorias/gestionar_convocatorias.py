from app.aplicacion.casos_uso.gestionar_registro import GestionarRegistro
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.repositorios.repositorio_convocatorias import RepositorioConvocatorias

# La tabla no tiene estado: la vigencia se calcula con las fechas
VIGENCIAS = {"proxima": "Próxima", "abierta": "Abierta", "cerrada": "Cerrada"}


class GestionarConvocatorias(GestionarRegistro):
    recurso = "convocatoria"
    mensaje_no_encontrado = "Convocatoria no encontrada"
    campos = ("nombre", "fecha_inicio", "fecha_fin", "descripcion", "idTipoConvocatoria")
    repositorio: RepositorioConvocatorias

    def disponibles(self):
        return self.repositorio.disponibles()

    def validar(self, datos, identificador=None):
        if datos["fecha_fin"] is not None and datos["fecha_fin"] < datos["fecha_inicio"]:
            raise DatoInvalido("La fecha de fin no puede ser anterior a la fecha de inicio.")
        if not self.repositorio.tipo_existe(datos["idTipoConvocatoria"]):
            raise DatoInvalido("El tipo de convocatoria no existe.")
        if self.repositorio.nombre_existe(datos["nombre"], identificador):
            raise Conflicto("Ya existe una convocatoria con ese nombre.")

    def validar_eliminacion(self, registro):
        if registro["postulados"]:
            raise Conflicto("No se puede eliminar: la convocatoria ya tiene estudiantes postulados.")
        if self.repositorio.tiene_grupo_competencia(registro["idConvocatoria"]):
            raise Conflicto("No se puede eliminar: la convocatoria tiene un grupo de competencia.")
