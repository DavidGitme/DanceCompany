from app.aplicacion.casos_uso.convocatorias.gestionar_convocatorias import VIGENCIAS
from app.aplicacion.casos_uso.gestionar_con_estado_categoria import GestionarConEstadoPorCategoria
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import POSTULACION_POSTULADO
from app.dominio.repositorios.repositorio_convocatorias import RepositorioPostulaciones


class GestionarPostulaciones(GestionarConEstadoPorCategoria):
    """Estudiantes postulados a una convocatoria (tabla convocatoria_estudiante).

    Nace Postulado; luego pasa a Aceptado o Rechazado con PATCH /estado.
    Solo una postulación sin decidir (Postulado) se puede eliminar.
    """

    recurso = "postulación"
    mensaje_no_encontrado = "Postulación no encontrada"
    campos = ("beneficio",)
    estado_inicial = POSTULACION_POSTULADO
    mensaje_estado_invalido = "El estado indicado no es un estado de postulación."
    repositorio: RepositorioPostulaciones

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def validar(self, datos, identificador=None):
        if identificador:
            return  # al editar solo cambia el beneficio
        convocatoria = self.repositorio.obtener_convocatoria(datos["idConvocatoria"])
        if not convocatoria:
            raise DatoInvalido("La convocatoria no existe.")
        if convocatoria["vigencia"] != VIGENCIAS["abierta"]:
            raise DatoInvalido("La convocatoria no está abierta para postulaciones.")
        if not self.repositorio.estudiante_activo(datos["idEstudiante"]):
            raise DatoInvalido("El estudiante no existe o está inactivo.")
        if self.repositorio.postulacion_existe(datos["idConvocatoria"], datos["idEstudiante"]):
            raise Conflicto("El estudiante ya está postulado a esa convocatoria.")

    def eliminar(self, identificador: int) -> None:
        registro = self.obtener(identificador)
        if registro["estado"] != POSTULACION_POSTULADO:
            raise Conflicto("Solo se puede eliminar una postulación que aún no ha sido decidida.")
        self.repositorio.eliminar(identificador)
