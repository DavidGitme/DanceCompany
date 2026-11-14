from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_grupos import RepositorioGrupos


class GestionarGrupos(GestionarCatalogo):
    recurso = "grupo"
    mensaje_no_encontrado = "Grupo no encontrado"
    campos = (
        "nombre", "idNivel", "idEstilo", "idInstructor",
        "idSede", "idAula", "idTipoGrupo", "capacidad",
    )
    repositorio: RepositorioGrupos

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def tipos(self):
        return self.repositorio.listar_tipos()

    def aulas(self, id_sede: int):
        return self.repositorio.listar_aulas(id_sede)

    def validar(self, datos, identificador=None):
        actual = self.obtener(identificador) if identificador else {}

        def cambio(campo):
            return datos[campo] != actual.get(campo)

        # Un estilo, nivel, sede o instructor inactivo no se puede asignar a un grupo.
        # Al editar solo se revisa lo que cambió.
        for tabla, campo, nombre in (
            ("nivel", "idNivel", "El nivel"),
            ("estilo", "idEstilo", "El estilo"),
            ("sede", "idSede", "La sede"),
            ("instructor", "idInstructor", "El instructor"),
        ):
            if cambio(campo) and not self.repositorio.esta_activo(tabla, datos[campo]):
                raise DatoInvalido(f"{nombre} no existe o está inactivo.")

        if not self.repositorio.tipo_grupo_existe(datos["idTipoGrupo"]):
            raise DatoInvalido("El tipo de grupo no existe.")
        mismo_instructor_y_sede = not cambio("idInstructor") and not cambio("idSede")
        if not mismo_instructor_y_sede and not self.repositorio.instructor_en_sede(
            datos["idInstructor"], datos["idSede"]
        ):
            raise DatoInvalido("El instructor no está asignado a esa sede.")

        aula = self.repositorio.obtener_aula(datos["idAula"])
        if not aula or (cambio("idAula") and aula["idEstado"] != ESTADO_ACTIVO):
            raise DatoInvalido("El aula no existe o está inactiva.")
        if aula["idSede"] != datos["idSede"]:
            raise DatoInvalido("El aula no pertenece a la sede seleccionada.")
        if datos["capacidad"] > aula["capacidad"]:
            raise DatoInvalido(f"La capacidad supera la del aula ({aula['capacidad']}).")

        if identificador:
            matriculados = actual["matriculados"]
            if datos["capacidad"] < matriculados:
                raise DatoInvalido(f"El grupo ya tiene {matriculados} estudiantes matriculados.")

        if self.repositorio.nombre_en_sede_existe(datos["nombre"], datos["idSede"], identificador):
            raise Conflicto("Ya existe un grupo con ese nombre en la sede.")
