from datetime import date, timedelta

from app.aplicacion.casos_uso.gestionar_catalogo import GestionarCatalogo
from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoAutorizado, NoEncontrado
from app.dominio.reglas import (
    DIAS_MARGEN_FECHA_MATRICULA,
    ESTADO_ACTIVO,
    ESTADO_INACTIVO,
    REQUISITO_INSTRUCTOR,
    VALOR_MATRICULA,
    edad_en,
)
from app.dominio.repositorios.repositorio_matriculas import RepositorioMatriculas

SIN_MIGRACION = (
    "El proceso de aprobación todavía no está disponible: falta ejecutar "
    "bd/08_matricula_aprobacion.sql en la base de datos."
)


class GestionarMatriculas(GestionarCatalogo):
    """Matrícula de un estudiante en un grupo.

    Proceso: la matrícula nace Pendiente (ya ocupa el cupo), se marcan sus requisitos
    (documentos, examen de nivel con el instructor, pago...) y, cuando están todos,
    el administrador o el instructor del grupo la aprueba: queda Activa.

    No se borra: `idEstado` Inactivo conserva las matrículas anteriores (cambio de
    nivel o de grupo) junto con sus mensualidades y pagos.
    """

    recurso = "matrícula"
    mensaje_no_encontrado = "Matrícula no encontrada"
    # El valor no se edita: es el precio único de la matrícula
    campos = ("idEstudiante", "idGrupo", "fecha_matricula")
    repositorio: RepositorioMatriculas

    def listar(self, estado, buscar, pagina, tamano, filtros=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, filtros or {})
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def configuracion(self):
        return {
            "valorMatricula": VALOR_MATRICULA,
            "aprobacionDisponible": self.repositorio.aprobacion_disponible(),
        }

    def estados(self):
        return self.repositorio.estados()

    def catalogo_requisitos(self):
        return self.repositorio.requisitos() if self.repositorio.aprobacion_disponible() else []

    def estudiantes_para_matricular(self, sede=None):
        return self.repositorio.estudiantes_para_matricular(sede)

    def grupos_para_matricular(self, sede=None):
        return self.repositorio.grupos_para_matricular(sede)

    # ---------- Crear, editar y cambiar estado ----------
    def crear(self, datos):
        datos = {
            **{campo: datos.get(campo) for campo in self.campos},
            "valor_matricula": VALOR_MATRICULA,
        }
        if datos.get("fecha_matricula") is None:
            datos["fecha_matricula"] = date.today()
        # Sin la migración 08 se conserva el comportamiento anterior (queda activa)
        pendiente = self._id_pendiente()
        datos["idEstado"] = pendiente if pendiente is not None else ESTADO_ACTIVO
        self.validar(datos)
        return self.repositorio.crear(datos)

    def valores_actuales(self, registro):
        return {campo: registro[campo] for campo in self.campos}

    def cambiar_estado(self, identificador, id_estado):
        actual = self.obtener(identificador)
        pendiente = self._id_pendiente()
        if id_estado not in (ESTADO_ACTIVO, ESTADO_INACTIVO):
            raise DatoInvalido("Solo se puede activar o inactivar. La aprobación se hace con «Aprobar».")
        if id_estado == actual["idEstado"]:
            return actual
        if id_estado == ESTADO_INACTIVO:
            return self.repositorio.cambiar_estado(identificador, ESTADO_INACTIVO)

        if pendiente is not None and actual["idEstado"] == pendiente:
            raise Conflicto(
                "La matrícula está pendiente: se activa al aprobarla, cuando cumpla todos los requisitos."
            )
        # Reactivar ocupa otra vez un cupo del grupo
        grupo = self.repositorio.obtener_grupo(actual["idGrupo"])
        if not grupo or grupo["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El grupo está inactivo: no se puede reactivar la matrícula.")
        estudiante = self.repositorio.obtener_estudiante(actual["idEstudiante"])
        if not estudiante or estudiante["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El estudiante está inactivo: actívalo antes de reactivar la matrícula.")
        self._validar_cupo(actual["idEstudiante"], grupo, identificador)
        # Una matrícula que nunca se aprobó vuelve al proceso de aprobación
        if pendiente is not None and not actual.get("fecha_aprobacion"):
            return self.repositorio.cambiar_estado(identificador, pendiente)
        return self.repositorio.cambiar_estado(identificador, ESTADO_ACTIVO)

    def validar(self, datos, identificador=None):
        actual = self.obtener(identificador) if identificador else {}
        if identificador and actual["idEstado"] == ESTADO_INACTIVO:
            raise Conflicto("La matrícula está inactiva: actívala antes de editarla.")

        def cambio(campo):
            return datos[campo] != actual.get(campo)

        estudiante = self.repositorio.obtener_estudiante(datos["idEstudiante"])
        if not estudiante or (cambio("idEstudiante") and estudiante["idEstado"] != ESTADO_ACTIVO):
            raise DatoInvalido("El estudiante no existe o está inactivo.")
        if identificador and cambio("idEstudiante") and self.repositorio.tiene_movimientos(identificador):
            raise Conflicto(
                "No se puede cambiar el estudiante: la matrícula ya tiene mensualidades o pagos."
            )

        grupo = self.repositorio.obtener_grupo(datos["idGrupo"])
        if not grupo or (cambio("idGrupo") and grupo["idEstado"] != ESTADO_ACTIVO):
            raise DatoInvalido("El grupo no existe o está inactivo.")

        if cambio("fecha_matricula"):
            self._validar_fecha(datos["fecha_matricula"])
        if not (cambio("idEstudiante") or cambio("idGrupo") or cambio("fecha_matricula")):
            return
        if estudiante["idSede"] != grupo["idSede"]:
            raise DatoInvalido("El grupo pertenece a una sede distinta a la del estudiante.")
        self._validar_edad(estudiante, grupo, datos["fecha_matricula"])

        # Una matrícula inactiva no ocupa cupo; una pendiente sí. Si sigue en el mismo
        # grupo, su propio cupo ya está contado: solo se revisa que no quede repetida.
        if cambio("idEstudiante") or cambio("idGrupo"):
            self._validar_cupo(
                datos["idEstudiante"], grupo, identificador, contar_cupo=not identificador or cambio("idGrupo")
            )

    # ---------- Requisitos y aprobación ----------
    def detalle(self, identificador):
        matricula = self.obtener(identificador)
        requisitos = self.repositorio.requisitos(identificador) if self.repositorio.aprobacion_disponible() else []
        return {**matricula, "requisitos": requisitos}

    def marcar_requisito(
        self, identificador, id_requisito, cumplido, documento, observacion=None, *, solo_instructor=False
    ):
        self._exigir_migracion()
        actual = self.obtener(identificador)
        if actual["idEstado"] != self._id_pendiente():
            raise Conflicto("Solo se marcan los requisitos de una matrícula pendiente de aprobación.")
        requisito = self.repositorio.obtener_requisito(id_requisito)
        if not requisito or requisito["idEstado"] != ESTADO_ACTIVO:
            raise NoEncontrado("requisito", "El requisito no existe o ya no se exige.")
        if solo_instructor and requisito["responsable"] != REQUISITO_INSTRUCTOR:
            raise NoAutorizado("Este requisito lo revisa la administración de la sede.")
        self.repositorio.marcar_requisito(
            identificador, id_requisito, cumplido, documento, observacion if cumplido else None
        )
        return self.detalle(identificador)

    def aprobar(self, identificador, documento):
        self._exigir_migracion()
        actual = self.obtener(identificador)
        if actual["idEstado"] == ESTADO_ACTIVO:
            raise Conflicto("La matrícula ya está aprobada.")
        if actual["idEstado"] != self._id_pendiente():
            raise Conflicto("La matrícula está inactiva: actívala para retomar el proceso.")
        faltan = [r["nombre"] for r in self.repositorio.requisitos(identificador) if not r["cumplido"]]
        if faltan:
            raise Conflicto(f"Todavía no se puede aprobar. Falta: {', '.join(faltan)}.")
        grupo = self.repositorio.obtener_grupo(actual["idGrupo"])
        if not grupo or grupo["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El grupo está inactivo: cambia la matrícula a un grupo activo.")
        estudiante = self.repositorio.obtener_estudiante(actual["idEstudiante"])
        if not estudiante or estudiante["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El estudiante está inactivo: actívalo antes de aprobar la matrícula.")
        self.repositorio.aprobar(identificador, documento)
        return self.detalle(identificador)

    # ---------- Portal del instructor ----------
    def pendientes_de_instructor(self, documento):
        id_instructor = self._instructor(documento)
        if not self.repositorio.aprobacion_disponible():
            return []
        return [
            {**m, "requisitos": self.repositorio.requisitos(m["idMatricula"])}
            for m in self.repositorio.pendientes_de_instructor(id_instructor)
        ]

    def exigir_instructor_del_grupo(self, identificador, documento):
        """El instructor solo ve y aprueba matrículas de sus grupos (404 si no es suya)."""
        id_instructor = self._instructor(documento)
        matricula = self.obtener(identificador)
        if matricula.get("idInstructor") != id_instructor:
            raise NoEncontrado(self.recurso, self.mensaje_no_encontrado)
        return matricula

    # ---------- Apoyo ----------
    def _instructor(self, documento):
        id_instructor = self.repositorio.id_instructor_por_documento(documento)
        if id_instructor is None:
            raise NoEncontrado("instructor", "Tu usuario no está asociado a un instructor activo.")
        return id_instructor

    def _id_pendiente(self):
        if not self.repositorio.aprobacion_disponible():
            return None
        return self.repositorio.id_estado_pendiente()

    def _exigir_migracion(self):
        if self._id_pendiente() is None:
            raise DatoInvalido(SIN_MIGRACION)

    @staticmethod
    def _validar_fecha(fecha_matricula):
        hoy = date.today()
        margen = timedelta(days=DIAS_MARGEN_FECHA_MATRICULA)
        if fecha_matricula > hoy + margen:
            raise DatoInvalido("La fecha de matrícula no puede ser de más de un año en el futuro.")
        if fecha_matricula < hoy - margen:
            raise DatoInvalido("La fecha de matrícula no puede ser de hace más de un año.")

    def _validar_cupo(self, id_estudiante, grupo, identificador, contar_cupo=True):
        if self.repositorio.matricula_activa_en_grupo(id_estudiante, grupo["idGrupo"], identificador):
            raise Conflicto("El estudiante ya tiene una matrícula activa o en proceso en ese grupo.")
        if contar_cupo and grupo["matriculasActivas"] >= grupo["capacidad"]:
            raise Conflicto(f"El grupo no tiene cupos disponibles (capacidad {grupo['capacidad']}).")

    @staticmethod
    def _validar_edad(estudiante, grupo, fecha_matricula):
        nacimiento = estudiante["fecha_nacimiento"]
        if nacimiento is None:
            return
        edad = edad_en(nacimiento, fecha_matricula)
        minima, maxima = grupo["edadMin"], grupo["edadMax"]
        if (minima is not None and edad < minima) or (maxima is not None and edad > maxima):
            raise DatoInvalido(
                f"La edad del estudiante ({edad} años) no está en el rango del nivel "
                f"({minima if minima is not None else '-'} a {maxima if maxima is not None else '-'})."
            )
