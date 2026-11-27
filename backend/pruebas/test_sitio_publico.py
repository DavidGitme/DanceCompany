"""Sitio público: disponibilidad, solicitud de espacio y preinscripción (sin base de datos)."""

from datetime import date, datetime, time, timedelta

import pytest

from app.aplicacion.casos_uso.reportes.resumen_financiero import ResumenFinanciero
from app.aplicacion.casos_uso.sitio_publico.sitio_publico import (
    ConsultarDisponibilidad,
    GestionarSolicitudes,
    Preinscribir,
    SolicitarEspacio,
)
from app.aplicacion.casos_uso.autenticacion.recuperar_clave import hash_token
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import TERMINOS_VERSION, error_nombre_persona

AHORA = datetime(2026, 12, 1, 9, 0)  # martes
MIERCOLES = date(2026, 12, 2)
ESTADOS = {
    ("Pendiente", "solicitud"): 38, ("Aprobada", "solicitud"): 39, ("Rechazada", "solicitud"): 40,
    ("Por confirmar", "preinscripcion"): 31, ("Confirmada", "preinscripcion"): 32,
}


class Repo:
    def __init__(self, periodo=True):
        self.solicitudes = {}
        self.preinscripciones = {}
        self.periodo = (
            {"idPeriodo": 1, "nombre": "Matrícula 2027-1", "fecha_inicio": date(2026, 11, 1), "fecha_fin": date(2026, 12, 31)}
            if periodo else None
        )

    def id_estado(self, nombre, categoria):
        return ESTADOS[(nombre, categoria)]

    def sede_publica(self, id_sede):
        return {"idSede": 1, "nombre": "Bello", "horaApertura": "07:00", "horaCierre": "21:00"} if id_sede == 1 else None

    def aulas_de_sede(self, id_sede):
        return [{"idAula": 1, "capacidad": 20}]

    def aula_activa(self, id_aula):
        return {"idAula": 1, "capacidad": 20, "idSede": 1, "sede": "Bello"} if id_aula == 1 else None

    def clases_del_dia(self, aulas, dia):
        return [{"idAula": 1, "hora_inicio": time(18), "hora_fin": time(19)}] if dia == "Miercoles" else []

    def reservas_del_dia(self, aulas, fecha, excluir=None):
        estado = {38: "Pendiente", 39: "Aprobada", 40: "Rechazada"}
        return [
            {**s, "estado": estado[s["idEstado"]]}
            for i, s in self.solicitudes.items()
            if s["fecha"] == fecha and i != excluir and s["idEstado"] in (38, 39)
        ]

    def crear_solicitud(self, datos):
        identificador = len(self.solicitudes) + 1
        self.solicitudes[identificador] = {**datos, "idSolicitud": identificador}
        return self.solicitud(identificador)

    def solicitud(self, identificador):
        s = self.solicitudes.get(identificador)
        if not s:
            return None
        nombres = {38: "Pendiente", 39: "Aprobada", 40: "Rechazada"}
        return {**s, "estado": nombres[s["idEstado"]], "sede": "Bello",
                "horaInicio": s["hora_inicio"].strftime("%H:%M"), "horaFin": s["hora_fin"].strftime("%H:%M")}

    def cambiar_estado_solicitud(self, identificador, id_estado):
        self.solicitudes[identificador]["idEstado"] = id_estado
        return self.solicitud(identificador)

    def periodo_abierto(self, hoy):
        p = self.periodo
        return p if p and p["fecha_inicio"] <= hoy <= p["fecha_fin"] else None

    def nombre_tipo_documento(self, id_tipo):
        return {1: "Cedula de ciudadania", 2: "Tarjeta de identidad"}.get(id_tipo)

    def estilos_activos(self):
        return [{"idEstilo": 1}]

    def planes(self):
        return [{"idPlan": 1}]

    def preinscripcion_existe(self, id_periodo, documento):
        return any(p["documento"] == documento for p in self.preinscripciones.values())

    def crear_preinscripcion(self, datos):
        identificador = len(self.preinscripciones) + 1
        self.preinscripciones[identificador] = {**datos, "idPreinscripcion": identificador}
        return {**datos, "idPreinscripcion": identificador, "estado": "Por confirmar", "sede": "Bello"}

    def confirmar_preinscripcion(self, token_hash, ahora, por_confirmar, confirmada):
        for p in self.preinscripciones.values():
            if p["token_hash"] == token_hash and p["token_expira"] >= ahora and p["idEstado"] == por_confirmar:
                p.update(idEstado=confirmada, token_hash=None)
                return p["idPreinscripcion"]
        return None


class Correo:
    def __init__(self):
        self.enviados = []

    def enviar(self, destino, asunto, texto, html=None):
        self.enviados.append((destino, texto))
        return True


def solicitud(**cambios):
    datos = {
        "nombre": "Ana Pérez", "email": "ANA@x.com", "telefono": "300 111 2233", "idAula": 1,
        "fecha": MIERCOLES, "hora_inicio": time(14), "hora_fin": time(15), "personas": 5, "mensaje": None,
    }
    return {**datos, **cambios}


def test_nombre_de_persona_no_acepta_numeros():
    assert error_nombre_persona("María José O'Neil-Ruiz") is None
    assert "números" in error_nombre_persona("Ana2 Pérez")
    assert error_nombre_persona("Ana_Pérez")


def test_disponibilidad_marca_clases_y_reservas_sin_datos_personales():
    repo = Repo()
    SolicitarEspacio(repo).crear(solicitud(), AHORA)
    dia = ConsultarDisponibilidad(repo).del_dia(1, MIERCOLES)
    franjas = dia["aulas"][0]["ocupado"]
    assert [f["motivo"] for f in franjas] == ["En revisión", "Clase"]
    assert all(set(f) == {"horaInicio", "horaFin", "motivo"} for f in franjas)


@pytest.mark.parametrize(
    "cambios, error",
    [
        ({"hora_inicio": time(18, 30), "hora_fin": time(19, 30)}, Conflicto),  # cruza con una clase
        ({"hora_inicio": time(6), "hora_fin": time(8)}, DatoInvalido),  # antes de abrir
        ({"hora_inicio": time(15), "hora_fin": time(14)}, DatoInvalido),
        ({"fecha": date(2026, 11, 30)}, DatoInvalido),  # ya pasó
        ({"personas": 21}, DatoInvalido),  # supera la capacidad
        ({"telefono": "123"}, DatoInvalido),
    ],
)
def test_solicitud_invalida(cambios, error):
    with pytest.raises(error):
        SolicitarEspacio(Repo()).crear(solicitud(**cambios), AHORA)


def test_dos_solicitudes_no_se_cruzan_y_aprobar_revalida():
    repo = Repo()
    caso = SolicitarEspacio(repo, Correo())
    creada = caso.crear(solicitud(), AHORA)
    assert creada["estado"] == "Pendiente" and creada["correoEnviado"]
    with pytest.raises(Conflicto):
        caso.crear(solicitud(hora_inicio=time(14, 30), hora_fin=time(16)), AHORA)
    aprobada = GestionarSolicitudes(repo, Correo()).cambiar_estado(creada["idSolicitud"], 39)
    assert aprobada["estado"] == "Aprobada"
    with pytest.raises(Conflicto):
        GestionarSolicitudes(repo).cambiar_estado(creada["idSolicitud"], 40)


def preinscripcion(**cambios):
    datos = {
        "nombre": "Sofía Gómez", "idTipoDocumento": 2, "documento": "1.098.765.432",
        "fecha_nacimiento": date(2014, 3, 2), "telefono": "3001112233", "email": "Sofia@x.com",
        "idSede": 1, "idEstilo": None, "idPlan": 1, "nombre_acudiente": "Marta Gómez",
        "telefono_acudiente": "3104445566", "aceptaTerminos": True, "terminosVersion": TERMINOS_VERSION,
    }
    return {**datos, **cambios}


def test_preinscripcion_solo_con_periodo_abierto():
    caso = Preinscribir(Repo(periodo=False))
    assert caso.estado_publico(AHORA.date())["abierta"] is False
    with pytest.raises(Conflicto):
        caso.crear(preinscripcion(), AHORA)


@pytest.mark.parametrize(
    "cambios",
    [
        {"aceptaTerminos": False},
        {"terminosVersion": "2020-01"},
        {"nombre_acudiente": None},  # menor sin acudiente
        {"idTipoDocumento": 1},  # cédula para un menor
        {"nombre": "Sofía 2"},
    ],
)
def test_preinscripcion_invalida(cambios):
    with pytest.raises(DatoInvalido):
        Preinscribir(Repo()).crear(preinscripcion(**cambios), AHORA)


def test_preinscripcion_se_confirma_con_el_enlace_una_sola_vez():
    repo, correo = Repo(), Correo()
    caso = Preinscribir(repo, correo, "https://sitio")
    creada = caso.crear(preinscripcion(), AHORA)
    assert creada["correoEnviado"] and creada["email"] == "sofia@x.com"
    guardada = repo.preinscripciones[creada["idPreinscripcion"]]
    assert guardada["documento"] == "1098765432" and guardada["terminos_version"] == TERMINOS_VERSION
    token = correo.enviados[0][1].split("token=")[1].split()[0]
    assert guardada["token_hash"] == hash_token(token)  # solo se guarda el hash
    with pytest.raises(Conflicto):
        caso.crear(preinscripcion(), AHORA)
    assert "confirmado" in caso.confirmar(token, AHORA)["mensaje"]
    with pytest.raises(DatoInvalido):
        caso.confirmar(token, AHORA)


def test_enlace_vencido_no_confirma():
    repo, correo = Repo(), Correo()
    caso = Preinscribir(repo, correo, "https://sitio")
    caso.crear(preinscripcion(), AHORA)
    token = correo.enviados[0][1].split("token=")[1].split()[0]
    with pytest.raises(DatoInvalido):
        caso.confirmar(token, AHORA + timedelta(hours=49))


class ReportesMemoria:
    def mensualidades_por_mes(self, sede, desde, hasta, hoy):
        return [{"periodo": "2026-11", "esperado": 300, "recaudado": 200, "pendiente": 100, "cantidad": 3, "pagadas": 2}]

    def recibido_por_mes(self, sede, desde, hasta):
        return [{"periodo": "2026-10", "total": 50, "mensualidad": 50, "matricula": 0, "taller": 0, "cantidad": 1}]

    def vencidas(self, sede, hoy):
        return {"cantidad": 1, "valor": 100, "estudiantes": 1}

    def estudiantes(self, sede, hoy):
        return {"matriculados": 4, "con_vencidas": 1}

    def detalle_vencidas(self, sede, hoy):
        return []


def test_resumen_financiero_arma_la_serie_con_meses_vacios():
    resumen = ResumenFinanciero(ReportesMemoria()).ejecutar(None, "2026-11", 3, date(2026, 11, 26))
    assert [p["periodo"] for p in resumen["serie"]] == ["2026-09", "2026-10", "2026-11"]
    assert resumen["serie"][1]["recibido"] == 50 and resumen["serie"][0]["esperado"] == 0
    assert resumen["estudiantes"] == {"matriculados": 4, "conVencidas": 1, "alDia": 3}
    assert resumen["mensualidades"]["pendiente"] == 100
