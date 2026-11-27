"""Reglas de negocio de aulas, horarios, matrículas, pagos, convocatorias y noticias (sin base de datos)."""

from datetime import date, datetime, time, timedelta
from decimal import Decimal

import pytest

from app.aplicacion.casos_uso.aulas.gestionar_aulas import GestionarAulas
from app.aplicacion.casos_uso.catalogos_simples.gestionar_catalogos_simples import GestionarMetodosPago
from app.aplicacion.casos_uso.convocatorias.gestionar_convocatorias import GestionarConvocatorias
from app.aplicacion.casos_uso.horarios.gestionar_horarios import GestionarHorarios
from app.aplicacion.casos_uso.matriculas.gestionar_matriculas import GestionarMatriculas
from app.aplicacion.casos_uso.mensualidades.gestionar_mensualidades import GestionarMensualidades
from app.aplicacion.casos_uso.noticias.gestionar_noticias import GestionarNoticias
from app.aplicacion.casos_uso.pagos.gestionar_pagos import GestionarPagos
from app.aplicacion.casos_uso.postulaciones.gestionar_postulaciones import GestionarPostulaciones
from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoAutorizado, NoEncontrado
from app.dominio.reglas import (
    ESTADO_ACTIVO,
    ESTADO_INACTIVO,
    VALOR_MATRICULA,
    edad_en,
    normalizar_dia,
    normalizar_texto,
)

HOY = date.today()


class Memoria:
    """Repositorio falso: guarda los registros en un diccionario."""

    def __init__(self, clave):
        self.clave = clave
        self.registros: dict[int, dict] = {}

    def obtener(self, identificador):
        registro = self.registros.get(identificador)
        return dict(registro) if registro else None

    def crear(self, datos):
        nuevo_id = len(self.registros) + 1
        self.registros[nuevo_id] = {**datos, self.clave: nuevo_id}
        return self.obtener(nuevo_id)

    def actualizar(self, identificador, datos):
        self.registros[identificador].update(datos)
        return self.obtener(identificador)

    def cambiar_estado(self, identificador, id_estado):
        return self.actualizar(identificador, {"idEstado": id_estado})

    def eliminar(self, identificador):
        del self.registros[identificador]

    def estado_existe(self, id_estado):
        return id_estado in (ESTADO_ACTIVO, ESTADO_INACTIVO)


class EstadosPorNombre:
    """Estados de una categoría: {id: nombre}."""

    estados: dict[int, str] = {}

    def id_estado(self, nombre):
        return next(i for i, n in self.estados.items() if n == nombre)

    def estado_existe(self, id_estado):
        return id_estado in self.estados

    def nombre_estado(self, id_estado):
        return self.estados.get(id_estado)

    def cambiar_estado(self, identificador, id_estado):
        return self.actualizar(identificador, {"idEstado": id_estado, "estado": self.estados[id_estado]})


# ---------- Reglas compartidas ----------
def test_normalizar_dia_acepta_tildes_y_mayusculas():
    assert normalizar_dia("miércoles") == "Miercoles"
    assert normalizar_dia(" SÁBADO ") == "Sabado"
    assert normalizar_dia("Funday") is None


def test_edad_cumplida():
    assert edad_en(date(2008, 5, 10), date(2026, 5, 9)) == 17
    assert edad_en(date(2008, 5, 10), date(2026, 5, 10)) == 18


# ---------- Aulas ----------
class AulasMemoria(Memoria):
    def __init__(self, grupos=0, capacidad_grupos=0):
        super().__init__("idAula")
        self.grupos, self.capacidad_grupos = grupos, capacidad_grupos

    def sede_activa(self, id_sede):
        return id_sede in (1, 2)

    def cantidad_grupos(self, id_aula):
        return self.grupos

    def capacidad_maxima_grupos_activos(self, id_aula):
        return self.capacidad_grupos


def test_aula_nueva_requiere_sede_activa():
    gestor = GestionarAulas(AulasMemoria())
    assert gestor.crear({"capacidad": 20, "idSede": 1})["idEstado"] == ESTADO_ACTIVO
    with pytest.raises(DatoInvalido):
        gestor.crear({"capacidad": 20, "idSede": 9})


def test_aula_con_grupos_no_cambia_sede_ni_baja_de_capacidad():
    gestor = GestionarAulas(AulasMemoria(grupos=1, capacidad_grupos=18))
    aula = gestor.crear({"capacidad": 20, "idSede": 1})
    with pytest.raises(Conflicto):
        gestor.actualizar(aula["idAula"], {"idSede": 2})
    with pytest.raises(DatoInvalido):
        gestor.actualizar(aula["idAula"], {"capacidad": 15})
    assert gestor.actualizar(aula["idAula"], {"capacidad": 18})["capacidad"] == 18


# ---------- Horarios ----------
class HorariosMemoria(Memoria):
    """Grupo 1 (activo) y 2 (activo) comparten el aula 1; el grupo 3 está inactivo."""

    grupos = {
        1: {"idGrupo": 1, "nombre": "Kids", "idAula": 1, "idEstado": ESTADO_ACTIVO},
        2: {"idGrupo": 2, "nombre": "Teens", "idAula": 1, "idEstado": ESTADO_ACTIVO},
        3: {"idGrupo": 3, "nombre": "Viejo", "idAula": 2, "idEstado": ESTADO_INACTIVO},
    }

    def __init__(self):
        super().__init__("idHorario")

    def obtener_grupo(self, id_grupo):
        return self.grupos.get(id_grupo)

    def _cruces(self, dia, inicio, fin, excluir_id):
        return [
            h for i, h in self.registros.items()
            if i != excluir_id and h["dia_semana"] == dia and h["hora_inicio"] < fin and h["hora_fin"] > inicio
        ]

    def cruce_en_grupo(self, id_grupo, dia, inicio, fin, excluir_id):
        return any(h["idGrupo"] == id_grupo for h in self._cruces(dia, inicio, fin, excluir_id))

    def cruce_en_aula(self, id_aula, id_grupo, dia, inicio, fin, excluir_id):
        for h in self._cruces(dia, inicio, fin, excluir_id):
            grupo = self.grupos[h["idGrupo"]]
            if grupo["idAula"] == id_aula and h["idGrupo"] != id_grupo and grupo["idEstado"] == ESTADO_ACTIVO:
                return {**h, "grupo": grupo["nombre"]}
        return None


def bloque(grupo, dia, inicio, fin):
    return {"idGrupo": grupo, "dia_semana": dia, "hora_inicio": time(inicio), "hora_fin": time(fin)}


def test_horario_normaliza_dia_y_valida_horas():
    gestor = GestionarHorarios(HorariosMemoria())
    assert gestor.crear(bloque(1, "miércoles", 17, 18))["dia_semana"] == "Miercoles"
    with pytest.raises(DatoInvalido):
        gestor.crear(bloque(1, "Lunes", 18, 18))
    with pytest.raises(DatoInvalido):
        gestor.crear(bloque(1, "Funday", 8, 9))
    with pytest.raises(DatoInvalido):
        gestor.crear(bloque(3, "Lunes", 8, 9))  # grupo inactivo


def test_horario_no_se_cruza_en_el_grupo_ni_en_el_aula():
    gestor = GestionarHorarios(HorariosMemoria())
    propio = gestor.crear(bloque(1, "Martes", 17, 19))
    with pytest.raises(Conflicto):
        gestor.crear(bloque(1, "Martes", 18, 20))
    with pytest.raises(Conflicto) as error:
        gestor.crear(bloque(2, "Martes", 18, 20))
    assert "Kids" in error.value.mensaje
    assert gestor.crear(bloque(2, "Martes", 19, 20))["idGrupo"] == 2  # contiguo sí se permite
    # Editar no choca consigo mismo
    assert gestor.actualizar(propio["idHorario"], {"hora_inicio": time(16)})["hora_inicio"] == time(16)


def test_horario_eliminar_y_no_encontrado():
    gestor = GestionarHorarios(HorariosMemoria())
    horario = gestor.crear(bloque(1, "Lunes", 8, 9))
    gestor.eliminar(horario["idHorario"])
    with pytest.raises(NoEncontrado) as error:
        gestor.obtener(horario["idHorario"])
    assert error.value.mensaje == "Horario no encontrado"


# ---------- Matrículas ----------
MATRICULA_PENDIENTE_ID = 12
REQUISITOS = {
    1: {"idRequisito": 1, "nombre": "Documento de identidad", "descripcion": None,
        "responsable": "administrador", "idEstado": ESTADO_ACTIVO},
    2: {"idRequisito": 2, "nombre": "Examen de nivel", "descripcion": None,
        "responsable": "instructor", "idEstado": ESTADO_ACTIVO},
}


class MatriculasMemoria(Memoria):
    """Con `aprobacion=False` simula una base sin bd/08_matricula_aprobacion.sql."""

    def __init__(self, capacidad=2, edad_min=5, edad_max=99, aprobacion=True):
        super().__init__("idMatricula")
        self.estudiantes = {
            1: {"idEstudiante": 1, "idSede": 1, "idEstado": ESTADO_ACTIVO, "fecha_nacimiento": date(2015, 1, 1)},
            2: {"idEstudiante": 2, "idSede": 1, "idEstado": ESTADO_ACTIVO, "fecha_nacimiento": None},
            3: {"idEstudiante": 3, "idSede": 2, "idEstado": ESTADO_ACTIVO, "fecha_nacimiento": None},
            4: {"idEstudiante": 4, "idSede": 1, "idEstado": ESTADO_ACTIVO, "fecha_nacimiento": None},
        }
        self.grupo = {
            "idGrupo": 1, "idSede": 1, "idEstado": ESTADO_ACTIVO, "idInstructor": 5,
            "capacidad": capacidad, "edadMin": edad_min, "edadMax": edad_max,
        }
        self.movimientos = set()
        self.aprobacion = aprobacion
        self.cumplidos: set[tuple[int, int]] = set()

    def crear(self, datos):
        return super().crear({**datos, "idInstructor": self.grupo["idInstructor"], "fecha_aprobacion": None})

    def obtener_estudiante(self, id_estudiante):
        return self.estudiantes.get(id_estudiante)

    def _ocupa(self, m):
        return m["idEstado"] in (ESTADO_ACTIVO, MATRICULA_PENDIENTE_ID)

    def obtener_grupo(self, id_grupo):
        if id_grupo != 1:
            return None
        activas = sum(1 for m in self.registros.values() if m["idGrupo"] == 1 and self._ocupa(m))
        return {**self.grupo, "matriculasActivas": activas}

    def matricula_activa_en_grupo(self, id_estudiante, id_grupo, excluir_id=None):
        return any(
            m["idEstudiante"] == id_estudiante and m["idGrupo"] == id_grupo
            and self._ocupa(m) and i != excluir_id
            for i, m in self.registros.items()
        )

    def tiene_movimientos(self, id_matricula):
        return id_matricula in self.movimientos

    # Proceso de aprobación
    def aprobacion_disponible(self):
        return self.aprobacion

    def id_estado_pendiente(self):
        return MATRICULA_PENDIENTE_ID if self.aprobacion else None

    def estados(self):
        return []

    def requisitos(self, id_matricula=None):
        return [
            {**r, "cumplido": (id_matricula, r["idRequisito"]) in self.cumplidos}
            for r in REQUISITOS.values() if r["idEstado"] == ESTADO_ACTIVO
        ]

    def obtener_requisito(self, id_requisito):
        return REQUISITOS.get(id_requisito)

    def marcar_requisito(self, id_matricula, id_requisito, cumplido, documento, observacion):
        (self.cumplidos.add if cumplido else self.cumplidos.discard)((id_matricula, id_requisito))

    def aprobar(self, id_matricula, documento):
        return self.actualizar(
            id_matricula, {"idEstado": ESTADO_ACTIVO, "fecha_aprobacion": datetime.now(), "aprobadaPor": documento}
        )

    def id_instructor_por_documento(self, documento):
        return {"500": 5, "600": 6}.get(documento)

    def pendientes_de_instructor(self, id_instructor):
        return [
            dict(m) for m in self.registros.values()
            if m["idInstructor"] == id_instructor and m["idEstado"] == MATRICULA_PENDIENTE_ID
        ]


def matricula(estudiante, grupo=1):
    # Si llega un valor distinto, se ignora: la matrícula tiene precio único
    return {"idEstudiante": estudiante, "idGrupo": grupo, "fecha_matricula": None, "valor_matricula": Decimal("100")}


def aprobada(gestor, repositorio, datos):
    """Crea una matrícula, cumple todos sus requisitos y la aprueba."""
    nueva = gestor.crear(datos)
    for id_requisito in REQUISITOS:
        repositorio.cumplidos.add((nueva["idMatricula"], id_requisito))
    return gestor.aprobar(nueva["idMatricula"], "1000000001")


def test_matricula_nueva_queda_pendiente_con_precio_unico_y_fecha_de_hoy():
    gestor = GestionarMatriculas(MatriculasMemoria())
    nueva = gestor.crear(matricula(1))
    assert nueva["idEstado"] == MATRICULA_PENDIENTE_ID
    assert nueva["fecha_matricula"] == HOY
    assert nueva["valor_matricula"] == VALOR_MATRICULA == Decimal("60000")


def test_sin_migracion_la_matricula_queda_activa_como_antes():
    gestor = GestionarMatriculas(MatriculasMemoria(aprobacion=False))
    nueva = gestor.crear(matricula(1))
    assert nueva["idEstado"] == ESTADO_ACTIVO and nueva["valor_matricula"] == VALOR_MATRICULA
    with pytest.raises(DatoInvalido):
        gestor.aprobar(nueva["idMatricula"], "1")


def test_matricula_valida_sede_edad_duplicado_y_cupo():
    repositorio = MatriculasMemoria(capacidad=2)
    gestor = GestionarMatriculas(repositorio)
    gestor.crear(matricula(1))
    with pytest.raises(Conflicto):
        gestor.crear(matricula(1))  # ya está en proceso en el grupo
    with pytest.raises(DatoInvalido):
        gestor.crear(matricula(3))  # otra sede
    gestor.crear(matricula(2))
    with pytest.raises(Conflicto):
        gestor.crear(matricula(4))  # grupo lleno: las pendientes ocupan cupo

    con_edad = GestionarMatriculas(MatriculasMemoria(edad_min=18))
    with pytest.raises(DatoInvalido):
        con_edad.crear(matricula(1))  # nació en 2015


def test_matricula_valida_la_fecha():
    gestor = GestionarMatriculas(MatriculasMemoria())
    with pytest.raises(DatoInvalido):
        gestor.crear({**matricula(2), "fecha_matricula": HOY + timedelta(days=400)})
    with pytest.raises(DatoInvalido):
        gestor.crear({**matricula(2), "fecha_matricula": HOY - timedelta(days=400)})
    assert gestor.crear({**matricula(2), "fecha_matricula": HOY + timedelta(days=30)})["idMatricula"] == 1


def test_aprobar_exige_todos_los_requisitos():
    repositorio = MatriculasMemoria()
    gestor = GestionarMatriculas(repositorio)
    nueva = gestor.crear(matricula(1))
    gestor.marcar_requisito(nueva["idMatricula"], 1, True, "1000000001")
    with pytest.raises(Conflicto) as error:
        gestor.aprobar(nueva["idMatricula"], "1000000001")
    assert "Examen de nivel" in error.value.mensaje

    gestor.marcar_requisito(nueva["idMatricula"], 2, True, "1000000001")
    resultado = gestor.aprobar(nueva["idMatricula"], "1000000001")
    assert resultado["idEstado"] == ESTADO_ACTIVO
    assert all(r["cumplido"] for r in resultado["requisitos"])
    with pytest.raises(Conflicto):
        gestor.aprobar(nueva["idMatricula"], "1000000001")  # ya aprobada
    with pytest.raises(Conflicto):
        gestor.marcar_requisito(nueva["idMatricula"], 1, False, "1000000001")  # ya no está pendiente


def test_pendiente_no_se_activa_con_el_interruptor():
    gestor = GestionarMatriculas(MatriculasMemoria())
    nueva = gestor.crear(matricula(1))
    with pytest.raises(Conflicto):
        gestor.cambiar_estado(nueva["idMatricula"], ESTADO_ACTIVO)
    with pytest.raises(DatoInvalido):
        gestor.cambiar_estado(nueva["idMatricula"], MATRICULA_PENDIENTE_ID)
    # Inactivar cancela el proceso y al reactivarla vuelve a quedar pendiente
    assert gestor.cambiar_estado(nueva["idMatricula"], ESTADO_INACTIVO)["idEstado"] == ESTADO_INACTIVO
    assert gestor.cambiar_estado(nueva["idMatricula"], ESTADO_ACTIVO)["idEstado"] == MATRICULA_PENDIENTE_ID


def test_instructor_solo_marca_su_requisito_y_solo_en_sus_grupos():
    repositorio = MatriculasMemoria()
    gestor = GestionarMatriculas(repositorio)
    nueva = gestor.crear(matricula(1))
    id_matricula = nueva["idMatricula"]

    assert [m["idMatricula"] for m in gestor.pendientes_de_instructor("500")] == [id_matricula]
    assert gestor.pendientes_de_instructor("600") == []
    with pytest.raises(NoEncontrado):
        gestor.exigir_instructor_del_grupo(id_matricula, "600")  # no es su grupo
    with pytest.raises(NoEncontrado):
        gestor.pendientes_de_instructor("999")  # no es instructor

    gestor.exigir_instructor_del_grupo(id_matricula, "500")
    with pytest.raises(NoAutorizado):
        gestor.marcar_requisito(id_matricula, 1, True, "500", solo_instructor=True)  # lo revisa la sede
    detalle = gestor.marcar_requisito(id_matricula, 2, True, "500", solo_instructor=True)
    assert [r["cumplido"] for r in detalle["requisitos"]] == [False, True]


def test_matricula_reactivar_revisa_cupo_y_movimientos_bloquean_cambio_de_estudiante():
    repositorio = MatriculasMemoria(capacidad=1)
    gestor = GestionarMatriculas(repositorio)
    primera = aprobada(gestor, repositorio, matricula(1))
    gestor.cambiar_estado(primera["idMatricula"], ESTADO_INACTIVO)
    gestor.crear(matricula(2))  # el cupo liberado se usa
    with pytest.raises(Conflicto):
        gestor.cambiar_estado(primera["idMatricula"], ESTADO_ACTIVO)

    # Una matrícula inactiva no se edita
    with pytest.raises(Conflicto):
        gestor.actualizar(primera["idMatricula"], {"fecha_matricula": HOY})

    otra = MatriculasMemoria(capacidad=3)
    gestor_otro = GestionarMatriculas(otra)
    activa = aprobada(gestor_otro, otra, matricula(1))
    otra.movimientos.add(activa["idMatricula"])
    with pytest.raises(Conflicto):
        gestor_otro.actualizar(activa["idMatricula"], {"idEstudiante": 4})
    # Al reactivarla, una matrícula ya aprobada vuelve a quedar activa
    gestor_otro.cambiar_estado(activa["idMatricula"], ESTADO_INACTIVO)
    assert gestor_otro.cambiar_estado(activa["idMatricula"], ESTADO_ACTIVO)["idEstado"] == ESTADO_ACTIVO


# ---------- Mensualidades ----------
class MensualidadesMemoria(EstadosPorNombre, Memoria):
    estados = {3: "Pendiente", 4: "Pagada", 5: "Vencida"}

    def __init__(self):
        super().__init__("idMensualidad")

    def crear(self, datos):
        return super().crear({**datos, "estado": self.estados[datos["idEstado"]], "valorPagado": 0,
                              "saldo": datos["valor_pagar"]})

    def obtener_matricula(self, id_matricula):
        return {"idMatricula": id_matricula, "idEstado": ESTADO_ACTIVO if id_matricula == 1 else ESTADO_INACTIVO}

    def existe_en_periodo(self, id_matricula, fecha_cobro, excluir_id=None):
        return any(
            m["idMatricula"] == id_matricula and (m["fecha_pago"].year, m["fecha_pago"].month)
            == (fecha_cobro.year, fecha_cobro.month) and i != excluir_id
            for i, m in self.registros.items()
        )


def mensualidad(matricula=1, cobro=date(2026, 3, 1), limite=date(2026, 3, 10), valor="100"):
    return {"idMatricula": matricula, "fecha_pago": cobro, "fecha_limite": limite, "valor_pagar": Decimal(valor)}


def test_mensualidad_nace_pendiente_y_una_por_mes():
    gestor = GestionarMensualidades(MensualidadesMemoria())
    assert gestor.crear(mensualidad())["estado"] == "Pendiente"
    with pytest.raises(Conflicto):
        gestor.crear(mensualidad(cobro=date(2026, 3, 15), limite=date(2026, 3, 20)))
    with pytest.raises(DatoInvalido):
        gestor.crear(mensualidad(cobro=date(2026, 4, 10), limite=date(2026, 4, 1)))
    with pytest.raises(DatoInvalido):
        gestor.crear(mensualidad(matricula=2, cobro=date(2026, 5, 1), limite=date(2026, 5, 10)))


def test_mensualidad_solo_queda_pagada_con_pagos():
    repositorio = MensualidadesMemoria()
    gestor = GestionarMensualidades(repositorio)
    nueva = gestor.crear(mensualidad())
    with pytest.raises(DatoInvalido):
        gestor.cambiar_estado(nueva["idMensualidad"], 4)
    with pytest.raises(DatoInvalido):
        gestor.cambiar_estado(nueva["idMensualidad"], ESTADO_ACTIVO)  # no es de la categoría
    assert gestor.cambiar_estado(nueva["idMensualidad"], 5)["estado"] == "Vencida"

    # Ya pagada: no vuelve atrás ni baja su valor por debajo de lo pagado
    repositorio.actualizar(nueva["idMensualidad"], {"estado": "Pagada", "valorPagado": Decimal("100"), "saldo": 0})
    with pytest.raises(Conflicto):
        gestor.cambiar_estado(nueva["idMensualidad"], 3)
    with pytest.raises(DatoInvalido):
        gestor.actualizar(nueva["idMensualidad"], {"valor_pagar": Decimal("50")})


# ---------- Pagos ----------
class PagosMemoria(Memoria):
    def __init__(self):
        super().__init__("idPago")
        self.saldos = {"mensualidad": {1: Decimal("100"), 2: Decimal("0")}, "matricula": {1: Decimal("80")}}
        # Estudiante 1: menor con acudiente 1. Estudiante 2: adulto sin acudiente.
        self.estudiantes = {
            1: {"idEstudiante": 1, "idEstado": ESTADO_ACTIVO, "fecha_nacimiento": HOY - timedelta(days=365 * 10)},
            2: {"idEstudiante": 2, "idEstado": ESTADO_ACTIVO, "fecha_nacimiento": HOY - timedelta(days=365 * 30)},
        }

    def obtener_mensualidad(self, id_mensualidad):
        if id_mensualidad not in self.saldos["mensualidad"]:
            return None
        return {"idMensualidad": id_mensualidad, "idEstudiante": id_mensualidad,
                "saldo": self.saldos["mensualidad"][id_mensualidad]}

    def obtener_matricula(self, id_matricula):
        if id_matricula not in self.saldos["matricula"]:
            return None
        return {"idMatricula": id_matricula, "idEstudiante": 2, "saldo": self.saldos["matricula"][id_matricula]}

    def obtener_estudiante(self, id_estudiante):
        return self.estudiantes.get(id_estudiante)

    def acudiente_activo(self, id_acudiente):
        return id_acudiente in (1, 2)

    def acudiente_responsable(self, id_acudiente, id_estudiante):
        return (id_acudiente, id_estudiante) == (1, 1)

    def metodo_existe(self, id_metodo):
        return id_metodo == 1

    def crear(self, datos):
        tipo = "mensualidad" if datos.get("idMensualidad") else "matricula"
        return super().crear({**datos, "tipo": tipo})


def pago(**datos):
    return {"idMensualidad": None, "idMatricula": None, "monto": None, "fecha_pago": None,
            "idMetodo": 1, "idAcudiente": None, **datos}


def test_pago_toma_el_saldo_y_permite_abonos():
    gestor = GestionarPagos(PagosMemoria())
    assert gestor.crear(pago(idMensualidad=1, idAcudiente=1))["monto"] == Decimal("100")
    assert gestor.crear(pago(idMensualidad=1, idAcudiente=1, monto=Decimal("40")))["monto"] == Decimal("40")
    with pytest.raises(DatoInvalido):
        gestor.crear(pago(idMensualidad=1, idAcudiente=1, monto=Decimal("101")))
    with pytest.raises(Conflicto):
        gestor.crear(pago(idMensualidad=2, idAcudiente=1))  # ya pagada
    with pytest.raises(DatoInvalido):
        gestor.crear(pago(idMensualidad=99, idAcudiente=1))


def test_pago_quien_paga():
    gestor = GestionarPagos(PagosMemoria())
    with pytest.raises(DatoInvalido):
        gestor.crear(pago(idMensualidad=1))  # menor sin acudiente
    with pytest.raises(DatoInvalido):
        gestor.crear(pago(idMensualidad=1, idAcudiente=2))  # no es su acudiente
    adulto = gestor.crear(pago(idMatricula=1))  # el adulto paga su matrícula
    assert adulto["idAcudiente"] is None and adulto["idEstudiante"] == 2
    with pytest.raises(DatoInvalido):
        gestor.crear(pago(idMatricula=1, idMetodo=9))
    with pytest.raises(DatoInvalido):
        gestor.crear(pago(idMatricula=1, fecha_pago=HOY + timedelta(days=1)))


def test_pago_de_taller_no_se_anula_desde_pagos():
    repositorio = PagosMemoria()
    gestor = GestionarPagos(repositorio)
    repositorio.registros[7] = {"idPago": 7, "tipo": "taller", "fecha_pago": HOY, "idMetodo": 1}
    with pytest.raises(Conflicto):
        gestor.eliminar(7)
    normal = gestor.crear(pago(idMensualidad=1, idAcudiente=1))
    gestor.eliminar(normal["idPago"])
    assert gestor.repositorio.obtener(normal["idPago"]) is None


# ---------- Métodos de pago (catálogo simple) ----------
class MetodosMemoria(Memoria):
    def __init__(self):
        super().__init__("idMetodo")

    def crear(self, datos):
        return super().crear({**datos, "registrosAsociados": 0})

    def nombre_existe(self, nombre, excluir_id=None):
        return any(normalizar_texto(r["nombre"]) == normalizar_texto(nombre)
                   for i, r in self.registros.items() if i != excluir_id)


def test_metodo_pago_duplicado_y_en_uso():
    repositorio = MetodosMemoria()
    gestor = GestionarMetodosPago(repositorio)
    efectivo = gestor.crear({"nombre": "Efectivo"})
    with pytest.raises(Conflicto):
        gestor.crear({"nombre": "EFECTIVO"})
    repositorio.registros[efectivo["idMetodo"]]["registrosAsociados"] = 3
    with pytest.raises(Conflicto):
        gestor.eliminar(efectivo["idMetodo"])
    libre = gestor.crear({"nombre": "Nequi"})
    gestor.eliminar(libre["idMetodo"])
    assert repositorio.obtener(libre["idMetodo"]) is None


# ---------- Convocatorias y postulaciones ----------
class ConvocatoriasMemoria(Memoria):
    def __init__(self):
        super().__init__("idConvocatoria")
        self.con_competencia = set()

    def crear(self, datos):
        return super().crear({**datos, "postulados": 0})

    def tipo_existe(self, id_tipo):
        return id_tipo in (1, 2, 3)

    def nombre_existe(self, nombre, excluir_id=None):
        return any(normalizar_texto(r["nombre"]) == normalizar_texto(nombre)
                   for i, r in self.registros.items() if i != excluir_id)

    def tiene_grupo_competencia(self, id_convocatoria):
        return id_convocatoria in self.con_competencia


CONVOCATORIA = {"nombre": "Audiciones", "fecha_inicio": date(2026, 1, 1), "fecha_fin": date(2026, 2, 1),
                "descripcion": None, "idTipoConvocatoria": 1}


def test_convocatoria_fechas_tipo_y_nombre():
    gestor = GestionarConvocatorias(ConvocatoriasMemoria())
    gestor.crear(CONVOCATORIA)
    with pytest.raises(Conflicto):
        gestor.crear({**CONVOCATORIA, "nombre": "AUDICIONES"})
    with pytest.raises(DatoInvalido):
        gestor.crear({**CONVOCATORIA, "nombre": "Otra", "fecha_fin": date(2025, 12, 1)})
    with pytest.raises(DatoInvalido):
        gestor.crear({**CONVOCATORIA, "nombre": "Otra", "idTipoConvocatoria": 9})


def test_convocatoria_solo_se_elimina_sin_postulados_ni_competencia():
    repositorio = ConvocatoriasMemoria()
    gestor = GestionarConvocatorias(repositorio)
    con_postulados = gestor.crear(CONVOCATORIA)
    repositorio.registros[con_postulados["idConvocatoria"]]["postulados"] = 2
    with pytest.raises(Conflicto):
        gestor.eliminar(con_postulados["idConvocatoria"])
    competencia = gestor.crear({**CONVOCATORIA, "nombre": "Nacional"})
    repositorio.con_competencia.add(competencia["idConvocatoria"])
    with pytest.raises(Conflicto):
        gestor.eliminar(competencia["idConvocatoria"])


class PostulacionesMemoria(EstadosPorNombre, Memoria):
    estados = {7: "Postulado", 8: "Aceptado", 9: "Rechazado"}
    vigencias = {1: "Abierta", 2: "Cerrada", 3: "Próxima"}

    def __init__(self):
        super().__init__("idPostulacion")

    def crear(self, datos):
        return super().crear({**datos, "estado": self.estados[datos["idEstado"]]})

    def obtener_convocatoria(self, id_convocatoria):
        vigencia = self.vigencias.get(id_convocatoria)
        return {"idConvocatoria": id_convocatoria, "vigencia": vigencia} if vigencia else None

    def estudiante_activo(self, id_estudiante):
        return id_estudiante != 99

    def postulacion_existe(self, id_convocatoria, id_estudiante):
        return any(p["idConvocatoria"] == id_convocatoria and p["idEstudiante"] == id_estudiante
                   for p in self.registros.values())


def test_postulacion_solo_en_convocatoria_abierta_y_sin_repetir():
    gestor = GestionarPostulaciones(PostulacionesMemoria())
    nueva = gestor.crear({"idConvocatoria": 1, "idEstudiante": 1, "beneficio": None})
    assert nueva["estado"] == "Postulado"
    with pytest.raises(Conflicto):
        gestor.crear({"idConvocatoria": 1, "idEstudiante": 1, "beneficio": None})
    for convocatoria in (2, 3):
        with pytest.raises(DatoInvalido):
            gestor.crear({"idConvocatoria": convocatoria, "idEstudiante": 2, "beneficio": None})
    with pytest.raises(DatoInvalido):
        gestor.crear({"idConvocatoria": 1, "idEstudiante": 99, "beneficio": None})


def test_postulacion_decidida_no_se_retira():
    gestor = GestionarPostulaciones(PostulacionesMemoria())
    postulacion = gestor.crear({"idConvocatoria": 1, "idEstudiante": 1, "beneficio": None})
    with pytest.raises(DatoInvalido):
        gestor.cambiar_estado(postulacion["idPostulacion"], 3)
    gestor.cambiar_estado(postulacion["idPostulacion"], 8)
    with pytest.raises(Conflicto):
        gestor.eliminar(postulacion["idPostulacion"])


# ---------- Noticias ----------
AHORA = datetime(2026, 6, 1, 12, 0)


class NoticiasMemoria(EstadosPorNombre, Memoria):
    estados = {10: "Disponible", 11: "Expirada"}

    def __init__(self):
        super().__init__("idNoticia")

    def crear(self, datos):
        return super().crear({**datos, "estado": self.estados[datos["idEstado"]]})

    def tipo_existe(self, id_tipo):
        return id_tipo == 1

    def ahora(self):
        return AHORA

    def a_hora_local(self, valor):
        return valor


NOTICIA = {"titulo": "Muestra", "contenido": "Texto", "imagen_url": None, "idTipoNoticia": 1,
           "fecha_publicacion": None, "fecha_expiracion": None}


def test_noticia_nace_disponible_y_valida_expiracion():
    gestor = GestionarNoticias(NoticiasMemoria())
    nueva = gestor.crear(NOTICIA)
    assert nueva["estado"] == "Disponible" and nueva["fecha_publicacion"] == AHORA
    with pytest.raises(DatoInvalido):
        gestor.crear({**NOTICIA, "fecha_expiracion": AHORA - timedelta(days=1)})
    with pytest.raises(DatoInvalido):
        gestor.crear({**NOTICIA, "idTipoNoticia": 9})


def test_noticia_expirada_no_se_republica_sin_ampliar_fecha():
    repositorio = NoticiasMemoria()
    gestor = GestionarNoticias(repositorio)
    noticia = gestor.crear({**NOTICIA, "fecha_expiracion": AHORA + timedelta(days=1)})
    repositorio.actualizar(noticia["idNoticia"], {"fecha_expiracion": AHORA - timedelta(hours=1)})
    gestor.cambiar_estado(noticia["idNoticia"], 11)
    with pytest.raises(DatoInvalido):
        gestor.cambiar_estado(noticia["idNoticia"], 10)
    gestor.actualizar(noticia["idNoticia"], {"fecha_expiracion": AHORA + timedelta(days=30)})
    assert gestor.cambiar_estado(noticia["idNoticia"], 10)["estado"] == "Disponible"
