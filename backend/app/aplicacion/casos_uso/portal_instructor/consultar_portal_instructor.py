"""Arma los datos del portal del instructor con el mismo formato que usa el frontend."""

from collections import defaultdict
from datetime import date, time

from app.dominio.excepciones.errores import NoEncontrado
from app.dominio.repositorios.repositorio_portal_instructor import RepositorioPortalInstructor

DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]
MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
]

# Estado de la mensualidad en la BD -> estado que muestra el portal
ESTADO_MENSUALIDAD = {"pagada": "Al día", "pendiente": "Pendiente", "vencida": "Vencida", "mora": "Vencida"}
GRAVEDAD = {"Al día": 0, "Pendiente": 1, "Vencida": 2}


def formatear_hora(hora: time) -> str:
    sufijo = "a. m." if hora.hour < 12 else "p. m."
    return f"{hora.hour % 12 or 12}:{hora.minute:02d} {sufijo}"


def unir_textos(textos: list[str]) -> str:
    """["Lunes", "miércoles", "viernes"] -> "Lunes, miércoles y viernes"."""
    if len(textos) <= 1:
        return "".join(textos)
    return f"{', '.join(textos[:-1])} y {textos[-1]}"


def resumir_horario(horarios: list[dict]) -> tuple[str, str]:
    if not horarios:
        return "Sin horario", "Sin horario"
    ordenados = sorted(
        horarios,
        key=lambda h: DIAS.index(h["dia"].lower()) if h["dia"].lower() in DIAS else 99,
    )
    dias = []
    for horario in ordenados:
        dia = horario["dia"].strip().lower()
        if dia not in dias:
            dias.append(dia)
    franjas = []
    for horario in ordenados:
        franja = f"{formatear_hora(horario['inicio'])} – {formatear_hora(horario['fin'])}"
        if franja not in franjas:
            franjas.append(franja)
    texto_dias = unir_textos(dias)
    return texto_dias[:1].upper() + texto_dias[1:], " / ".join(franjas)


def periodo(fecha: date) -> str:
    return f"{MESES[fecha.month - 1].capitalize()} {fecha.year}"


def fecha_corta(fecha: date) -> str:
    return f"{fecha.day} {MESES[fecha.month - 1][:3]} {fecha.year}"


class ConsultarPortalInstructor:
    def __init__(self, repositorio: RepositorioPortalInstructor):
        self.repositorio = repositorio

    def perfil(self, documento: str) -> dict:
        perfil = self.repositorio.perfil_por_documento(documento)
        if not perfil:
            raise NoEncontrado("instructor", "Tu usuario no está asociado a un instructor activo.")
        return perfil

    def grupos(self, documento: str) -> list[dict]:
        id_instructor = self.perfil(documento)["idInstructor"]
        grupos = self.repositorio.grupos(id_instructor)
        horarios = defaultdict(list)
        for horario in self.repositorio.horarios([g["idGrupo"] for g in grupos]):
            horarios[horario["idGrupo"]].append(horario)
        for grupo in grupos:
            grupo["dias"], grupo["horario"] = resumir_horario(horarios[grupo["idGrupo"]])
        return grupos

    def estudiantes(self, documento: str) -> list[dict]:
        id_instructor = self.perfil(documento)["idInstructor"]
        estudiantes = self.repositorio.estudiantes(id_instructor)
        cuotas = defaultdict(list)
        for cuota in self.repositorio.mensualidades([e["idMatricula"] for e in estudiantes]):
            cuotas[cuota["idMatricula"]].append(
                {
                    "periodo": periodo(cuota["fechaLimite"]),
                    "valor": cuota["valor"],
                    "fechaLimite": fecha_corta(cuota["fechaLimite"]),
                    "estado": ESTADO_MENSUALIDAD.get(cuota["estado"].lower(), "Pendiente"),
                }
            )
        for estudiante in estudiantes:
            mensualidades = cuotas[estudiante.pop("idMatricula")]
            estudiante["mensualidades"] = mensualidades
            # El estado general es el peor de sus mensualidades
            estudiante["estado"] = max(
                (m["estado"] for m in mensualidades), key=GRAVEDAD.get, default="Al día"
            )
        return estudiantes
