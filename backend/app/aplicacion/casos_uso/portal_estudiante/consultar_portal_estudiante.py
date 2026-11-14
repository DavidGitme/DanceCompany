from datetime import date
from decimal import Decimal

from app.aplicacion.casos_uso.postulaciones.gestionar_postulaciones import GestionarPostulaciones
from app.dominio.reglas import ESTADO_ACTIVO, edad_en
from app.dominio.repositorios.repositorio_portal_estudiante import RepositorioCuentaEstudiante

# Un estudiante tiene pocos registros: se traen todos en una página
TODOS = 200
CERO = Decimal("0.00")


class ConsultarPortalEstudiante:
    """Lo que ve el estudiante en su portal, siempre filtrado a su propio idEstudiante.

    Reutiliza los repositorios de los módulos administrativos: el estudiante ve
    los mismos datos que el administrador registra (matrículas, horarios,
    mensualidades, pagos, talleres y convocatorias).
    """

    def __init__(
        self,
        cuenta: RepositorioCuentaEstudiante,
        matriculas,
        horarios,
        grupos,
        mensualidades,
        pagos,
        inscripciones,
        talleres,
        convocatorias,
        postulaciones,
    ):
        self.cuenta = cuenta
        self.matriculas = matriculas
        self.horarios = horarios
        self.grupos = grupos
        self.mensualidades = mensualidades
        self.pagos = pagos
        self.inscripciones = inscripciones
        self.talleres = talleres
        self.convocatorias = convocatorias
        self.postulaciones = postulaciones

    def perfil(self, id_estudiante: int):
        perfil = self.cuenta.perfil(id_estudiante)
        nacimiento = perfil["fecha_nacimiento"]
        perfil["edad"] = edad_en(nacimiento, date.today()) if nacimiento else None
        perfil["acudientes"] = self.cuenta.acudientes(id_estudiante)
        return perfil

    def _matriculas(self, id_estudiante: int):
        datos, _ = self.matriculas.listar(None, None, 1, TODOS, {"estudiante": id_estudiante})
        return datos

    def clases(self, id_estudiante: int):
        vigentes, historial = [], []
        for matricula in self._matriculas(id_estudiante):
            grupo = self.grupos.obtener(matricula["idGrupo"])
            bloques, _ = self.horarios.listar(None, 1, TODOS, {"grupo": matricula["idGrupo"]})
            clase = {
                **matricula,
                "instructor": grupo["instructor"],
                "idAula": grupo["idAula"],
                "horarios": [
                    {
                        "dia_semana": bloque["dia_semana"],
                        "hora_inicio": bloque["hora_inicio"].strftime("%H:%M"),
                        "hora_fin": bloque["hora_fin"].strftime("%H:%M"),
                    }
                    for bloque in bloques
                ],
            }
            (vigentes if matricula["idEstado"] == ESTADO_ACTIVO else historial).append(clase)
        return {"vigentes": vigentes, "historial": historial}

    def finanzas(self, id_estudiante: int):
        matriculas = self._matriculas(id_estudiante)
        mensualidades, _ = self.mensualidades.listar(None, None, 1, TODOS, {"estudiante": id_estudiante})
        pagos, _ = self.pagos.listar(None, 1, TODOS, {"estudiante": id_estudiante})

        con_saldo = [m for m in mensualidades if m["saldo"] > 0]
        saldo = sum((m["saldo"] for m in con_saldo), CERO)
        # La matrícula vigente también puede deber
        saldo += sum((m["saldo"] for m in matriculas if m["idEstado"] == ESTADO_ACTIVO), CERO)
        return {
            "resumen": {
                "saldoPendiente": saldo,
                "totalPagado": sum((p["monto"] for p in pagos), CERO),
                "mensualidadesPendientes": len(con_saldo),
                "proximoVencimiento": min((m["fecha_limite"] for m in con_saldo), default=None),
            },
            "matriculas": matriculas,
            "mensualidades": mensualidades,
            "pagos": pagos,
        }

    def talleres_del_estudiante(self, id_estudiante: int):
        inscritos, _ = self.inscripciones.listar(None, 1, TODOS, {"estudiante": id_estudiante})
        ya_inscrito = {i["idTaller"] for i in inscritos}
        disponibles = [t for t in self.talleres.disponibles() if t["idTaller"] not in ya_inscrito]
        return {"inscritos": inscritos, "disponibles": disponibles}

    def convocatorias_del_estudiante(self, id_estudiante: int):
        postulaciones, _ = self.postulaciones.listar(None, None, 1, TODOS, {"estudiante": id_estudiante})
        postulado_en = {p["idConvocatoria"] for p in postulaciones}
        abiertas, _ = self.convocatorias.listar(None, 1, TODOS, {"vigencia": "abierta"})
        return {
            "abiertas": [
                {**c, "yaPostulado": c["idConvocatoria"] in postulado_en} for c in abiertas
            ],
            "postulaciones": postulaciones,
        }

    def postularse(self, id_estudiante: int, id_convocatoria: int):
        """Mismas reglas que cuando el administrador lo postula (abierta y sin repetir)."""
        return GestionarPostulaciones(self.postulaciones).crear(
            {"idConvocatoria": id_convocatoria, "idEstudiante": id_estudiante, "beneficio": None}
        )
