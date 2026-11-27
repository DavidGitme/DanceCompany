"""Casos de uso del sitio público y de su revisión en el panel.

- Disponibilidad: franjas ocupadas de cada aula en una fecha (clases semanales de grupos
  activos + solicitudes aprobadas o en revisión) dentro del horario de la sede.
- Solicitud de espacio: se guarda Pendiente; la sede la aprueba o rechaza en el panel.
- Preinscripción: solo con un periodo de matrícula abierto; exige aceptar los términos y
  confirmar el correo con un enlace de un solo uso. No crea persona, estudiante ni cuenta:
  la inscripción sigue siendo presencial.
"""

import secrets
from datetime import date, datetime, time, timedelta

from app.aplicacion.casos_uso.autenticacion.recuperar_clave import hash_token
from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoEncontrado
from app.dominio.reglas import (
    CATEGORIA_PREINSCRIPCION,
    CATEGORIA_SOLICITUD,
    DIAS_ATENCION,
    EDAD_ADULTO,
    ESTADO_ACTIVO,
    ESTADO_INACTIVO,
    HORAS_CONFIRMAR_PREINSCRIPCION,
    PREINSCRIPCION_CONFIRMADA,
    PREINSCRIPCION_POR_CONFIRMAR,
    SOLICITUD_APROBADA,
    SOLICITUD_PENDIENTE,
    SOLICITUD_RECHAZADA,
    TERMINOS_VERSION,
    dia_de,
    edad_en,
    error_documento,
    error_nombre_persona,
    error_tipo_para_edad,
    normalizar_documento,
    normalizar_telefono,
    se_cruzan,
    telefono_valido,
)

MENSAJE_SIN_PERIODO = "La preinscripción no está abierta en este momento."


def _hora(texto_o_hora) -> time:
    if isinstance(texto_o_hora, time):
        return texto_o_hora
    return time.fromisoformat(str(texto_o_hora))


def _texto_hora(valor) -> str:
    return _hora(valor).strftime("%H:%M")


def _telefono(valor: str, campo: str = "El teléfono") -> str:
    telefono = normalizar_telefono(valor or "")
    if not telefono_valido(telefono):
        raise DatoInvalido(f"{campo} debe tener exactamente 10 dígitos.")
    return telefono


class ConsultarDisponibilidad:
    def __init__(self, repositorio):
        self.repositorio = repositorio

    def horario_sede(self, id_sede):
        sede = self.repositorio.sede_publica(id_sede)
        if not sede:
            raise NoEncontrado("sede", "La sede no existe o no está activa.")
        return sede

    def del_dia(self, id_sede: int, fecha: date):
        sede = self.horario_sede(id_sede)
        dia = dia_de(fecha)
        abierta = dia in DIAS_ATENCION and sede["horaApertura"] and sede["horaCierre"]
        aulas = self.repositorio.aulas_de_sede(id_sede)
        ids = [a["idAula"] for a in aulas]
        clases = self.repositorio.clases_del_dia(ids, dia) if abierta else []
        reservas = self.repositorio.reservas_del_dia(ids, fecha) if abierta else []
        resultado = []
        for aula in aulas:
            ocupado = [
                {"horaInicio": _texto_hora(c["hora_inicio"]), "horaFin": _texto_hora(c["hora_fin"]), "motivo": "Clase"}
                for c in clases if c["idAula"] == aula["idAula"]
            ] + [
                {
                    "horaInicio": _texto_hora(r["hora_inicio"]),
                    "horaFin": _texto_hora(r["hora_fin"]),
                    "motivo": "Reservado" if r["estado"] == SOLICITUD_APROBADA else "En revisión",
                }
                for r in reservas if r["idAula"] == aula["idAula"]
            ]
            ocupado.sort(key=lambda f: f["horaInicio"])
            resultado.append({**aula, "nombre": f"Aula {aula['idAula']}", "ocupado": ocupado})
        return {
            "idSede": sede["idSede"],
            "sede": sede["nombre"],
            "fecha": fecha,
            "dia": dia,
            "abierta": bool(abierta),
            "horaApertura": sede["horaApertura"] if abierta else None,
            "horaCierre": sede["horaCierre"] if abierta else None,
            "aulas": resultado,
        }

    def validar_franja(self, id_aula, fecha: date, inicio: time, fin: time, ahora: datetime, excluir=None):
        """Devuelve el aula si la franja cabe en el horario y no se cruza con nada."""
        aula = self.repositorio.aula_activa(id_aula)
        if not aula:
            raise DatoInvalido("El aula no existe o no está disponible.")
        if fin <= inicio:
            raise DatoInvalido("La hora de fin debe ser posterior a la de inicio.")
        if fecha < ahora.date() or (fecha == ahora.date() and inicio <= ahora.time()):
            raise DatoInvalido("Elige una fecha y hora que todavía no hayan pasado.")
        sede = self.horario_sede(aula["idSede"])
        if dia_de(fecha) not in DIAS_ATENCION or not sede["horaApertura"]:
            raise DatoInvalido(f"La sede {sede['nombre']} no tiene horario de atención registrado.")
        apertura, cierre = _hora(sede["horaApertura"]), _hora(sede["horaCierre"])
        if inicio < apertura or fin > cierre:
            raise DatoInvalido(
                f"La sede {sede['nombre']} atiende de {sede['horaApertura']} a {sede['horaCierre']}."
            )
        for bloque in self.repositorio.clases_del_dia([id_aula], dia_de(fecha)):
            if se_cruzan(inicio, fin, _hora(bloque["hora_inicio"]), _hora(bloque["hora_fin"])):
                raise Conflicto("El aula tiene clase en ese horario. Elige otra franja o aula.")
        for reserva in self.repositorio.reservas_del_dia([id_aula], fecha, excluir):
            if se_cruzan(inicio, fin, _hora(reserva["hora_inicio"]), _hora(reserva["hora_fin"])):
                raise Conflicto("Esa franja ya está reservada o en revisión. Elige otra franja o aula.")
        return aula


class SolicitarEspacio:
    def __init__(self, repositorio, correo=None):
        self.repositorio = repositorio
        self.disponibilidad = ConsultarDisponibilidad(repositorio)
        self.correo = correo

    def crear(self, datos: dict, ahora: datetime | None = None):
        ahora = ahora or datetime.now()
        if error := error_nombre_persona(datos["nombre"]):
            raise DatoInvalido(error)
        datos["telefono"] = _telefono(datos["telefono"])
        datos["email"] = datos["email"].strip().lower()
        aula = self.disponibilidad.validar_franja(
            datos["idAula"], datos["fecha"], datos["hora_inicio"], datos["hora_fin"], ahora
        )
        if datos["personas"] > aula["capacidad"]:
            raise DatoInvalido(f"El aula admite máximo {aula['capacidad']} personas.")
        datos["idEstado"] = self.repositorio.id_estado(SOLICITUD_PENDIENTE, CATEGORIA_SOLICITUD)
        creada = self.repositorio.crear_solicitud(datos)
        enviado = False
        if self.correo:
            enviado = self.correo.enviar(
                datos["email"],
                "Recibimos tu solicitud de espacio · F&A Dance Company",
                f"Hola {datos['nombre']}:\n\n"
                f"Recibimos tu solicitud para el aula {aula['idAula']} de la sede {aula['sede']} "
                f"el {datos['fecha']:%d/%m/%Y} de {_texto_hora(datos['hora_inicio'])} a {_texto_hora(datos['hora_fin'])}.\n"
                "La sede la revisará y te responderá a este correo o a tu teléfono.\n"
                f"Número de seguimiento: {creada['idSolicitud']}.\n",
            )
        return {"idSolicitud": creada["idSolicitud"], "estado": creada["estado"], "correoEnviado": enviado}

    # ---------- Panel ----------
    def decidir(self, identificador: int, aprobar: bool, ahora: datetime | None = None):
        solicitud = self.repositorio.solicitud(identificador)
        if not solicitud:
            raise NoEncontrado("solicitud", "Solicitud no encontrada.")
        if solicitud["estado"] != SOLICITUD_PENDIENTE:
            raise Conflicto("Esta solicitud ya fue respondida.")
        if aprobar:
            # Al aprobar se revisa de nuevo: pudo crearse un grupo en esa aula después
            self.disponibilidad.validar_franja(
                solicitud["idAula"], solicitud["fecha"], _hora(solicitud["hora_inicio"]),
                _hora(solicitud["hora_fin"]), ahora or datetime.now(), excluir=identificador,
            )
        nombre = SOLICITUD_APROBADA if aprobar else SOLICITUD_RECHAZADA
        actualizada = self.repositorio.cambiar_estado_solicitud(
            identificador, self.repositorio.id_estado(nombre, CATEGORIA_SOLICITUD)
        )
        if self.correo:
            texto = (
                "La sede aprobó tu solicitud. Te esperamos en el horario acordado."
                if aprobar
                else "La sede no pudo aprobar tu solicitud para esa franja. Puedes pedir otra desde el sitio."
            )
            self.correo.enviar(
                solicitud["email"],
                f"Tu solicitud de espacio fue {nombre.lower()} · F&A Dance Company",
                f"Hola {solicitud['nombre']}:\n\n{texto}\n"
                f"Aula {solicitud['idAula']} · sede {solicitud['sede']} · {solicitud['fecha']:%d/%m/%Y} "
                f"de {solicitud['horaInicio']} a {solicitud['horaFin']}.\n",
            )
        return actualizada


class Preinscribir:
    def __init__(self, repositorio, correo=None, frontend_url: str = ""):
        self.repositorio = repositorio
        self.correo = correo
        self.frontend_url = frontend_url.rstrip("/")

    def estado_publico(self, hoy: date | None = None):
        periodo = self.repositorio.periodo_abierto(hoy or date.today())
        if not periodo:
            return {"abierta": False, "periodo": None, "terminosVersion": TERMINOS_VERSION}
        return {
            "abierta": True,
            "periodo": {
                "idPeriodo": periodo["idPeriodo"],
                "nombre": periodo["nombre"],
                "fecha_inicio": periodo["fecha_inicio"],
                "fecha_fin": periodo["fecha_fin"],
            },
            "terminosVersion": TERMINOS_VERSION,
        }

    def crear(self, datos: dict, ahora: datetime | None = None):
        ahora = ahora or datetime.now()
        periodo = self.repositorio.periodo_abierto(ahora.date())
        if not periodo:
            raise Conflicto(MENSAJE_SIN_PERIODO)
        if datos.pop("aceptaTerminos") is not True or datos.get("terminosVersion") != TERMINOS_VERSION:
            raise DatoInvalido("Debes aceptar los términos y condiciones vigentes.")
        datos.pop("terminosVersion", None)
        if error := error_nombre_persona(datos["nombre"]):
            raise DatoInvalido(error)
        tipo = self.repositorio.nombre_tipo_documento(datos["idTipoDocumento"])
        if not tipo:
            raise DatoInvalido("El tipo de documento no existe.")
        datos["documento"] = normalizar_documento(datos["documento"])
        if error := error_documento(tipo, datos["documento"]):
            raise DatoInvalido(error)
        if datos["fecha_nacimiento"] > ahora.date():
            raise DatoInvalido("La fecha de nacimiento no puede ser futura.")
        edad = edad_en(datos["fecha_nacimiento"], ahora.date())
        if error := error_tipo_para_edad(tipo, edad):
            raise DatoInvalido(error)
        datos["telefono"] = _telefono(datos["telefono"])
        datos["email"] = datos["email"].strip().lower()
        if not self.repositorio.sede_publica(datos["idSede"]):
            raise DatoInvalido("La sede no existe o no está activa.")
        if datos.get("idEstilo") and datos["idEstilo"] not in {e["idEstilo"] for e in self.repositorio.estilos_activos()}:
            raise DatoInvalido("El estilo no existe o no está activo.")
        if datos.get("idPlan") and datos["idPlan"] not in {p["idPlan"] for p in self.repositorio.planes()}:
            raise DatoInvalido("El plan no existe o no está activo.")

        # Menor de edad: un adulto responsable (la inscripción presencial exige acudiente)
        if edad < EDAD_ADULTO:
            nombre_acudiente = (datos.get("nombre_acudiente") or "").strip()
            if len(nombre_acudiente) < 2:
                raise DatoInvalido("Para un menor de edad escribe el nombre del acudiente.")
            if error := error_nombre_persona(nombre_acudiente):
                raise DatoInvalido(f"Acudiente: {error[0].lower()}{error[1:]}")
            datos["nombre_acudiente"] = " ".join(nombre_acudiente.split())
            datos["telefono_acudiente"] = _telefono(datos.get("telefono_acudiente"), "El teléfono del acudiente")
        else:
            datos["nombre_acudiente"] = datos["telefono_acudiente"] = None

        if self.repositorio.preinscripcion_existe(periodo["idPeriodo"], datos["documento"]):
            raise Conflicto(
                "Ya recibimos una preinscripción con ese documento en este periodo. "
                "Revisa tu correo o comunícate con la sede."
            )
        token = secrets.token_urlsafe(32)
        datos.update(
            idPeriodo=periodo["idPeriodo"],
            terminos_version=TERMINOS_VERSION,
            token_hash=hash_token(token),
            token_expira=ahora + timedelta(hours=HORAS_CONFIRMAR_PREINSCRIPCION),
            idEstado=self.repositorio.id_estado(PREINSCRIPCION_POR_CONFIRMAR, CATEGORIA_PREINSCRIPCION),
        )
        creada = self.repositorio.crear_preinscripcion(datos)
        enviado = False
        if self.correo:
            enlace = f"{self.frontend_url}/confirmar-preinscripcion?token={token}"
            enviado = self.correo.enviar(
                datos["email"],
                "Confirma tu correo · Preinscripción F&A Dance Company",
                f"Hola {datos['nombre']}:\n\n"
                f"Recibimos tu preinscripción para {periodo['nombre']} en la sede {creada['sede']}.\n"
                f"Confirma tu correo con este enlace (vence en {HORAS_CONFIRMAR_PREINSCRIPCION} horas):\n\n{enlace}\n\n"
                "Después la sede te contactará para terminar la inscripción en persona.\n"
                "Si no hiciste esta solicitud, ignora este correo.\n",
            )
        return {
            "idPreinscripcion": creada["idPreinscripcion"],
            "estado": creada["estado"],
            "correoEnviado": enviado,
            "email": datos["email"],
        }

    def confirmar(self, token: str, ahora: datetime | None = None):
        id_preinscripcion = self.repositorio.confirmar_preinscripcion(
            hash_token(token),
            ahora or datetime.now(),
            self.repositorio.id_estado(PREINSCRIPCION_POR_CONFIRMAR, CATEGORIA_PREINSCRIPCION),
            self.repositorio.id_estado(PREINSCRIPCION_CONFIRMADA, CATEGORIA_PREINSCRIPCION),
        )
        if not id_preinscripcion:
            raise DatoInvalido("El enlace no es válido, ya se usó o venció.")
        return {"mensaje": "Tu correo quedó confirmado. La sede te contactará para terminar la inscripción."}


class GestionarPeriodos:
    def __init__(self, repositorio):
        self.repositorio = repositorio

    def listar(self, estado, buscar, pagina, tamano):
        datos, total = self.repositorio.listar_periodos(estado, buscar, pagina, tamano)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, identificador):
        periodo = self.repositorio.periodo(identificador)
        if not periodo:
            raise NoEncontrado("periodo", "Periodo no encontrado.")
        return periodo

    def _validar(self, datos, identificador=None):
        if datos["fecha_fin"] < datos["fecha_inicio"]:
            raise DatoInvalido("La fecha de cierre no puede ser anterior a la de apertura.")
        cruzado = self.repositorio.periodo_cruzado(datos["fecha_inicio"], datos["fecha_fin"], identificador)
        if cruzado:
            raise Conflicto(f"Las fechas se cruzan con el periodo activo «{cruzado}».")

    def crear(self, datos):
        self._validar(datos)
        return self.repositorio.crear_periodo(datos)

    def actualizar(self, identificador, datos):
        self.obtener(identificador)
        self._validar(datos, identificador)
        return self.repositorio.actualizar_periodo(identificador, datos)

    def cambiar_estado(self, identificador, id_estado):
        periodo = self.obtener(identificador)
        if id_estado not in (ESTADO_ACTIVO, ESTADO_INACTIVO):
            raise DatoInvalido("El estado debe ser Activo o Inactivo.")
        if id_estado == ESTADO_ACTIVO:
            self._validar(periodo, identificador)
        return self.repositorio.cambiar_estado_periodo(identificador, id_estado)


class GestionarPlanes:
    def __init__(self, repositorio):
        self.repositorio = repositorio

    def listar(self, estado=None):
        planes = self.repositorio.planes(solo_activos=False)
        return [p for p in planes if estado is None or p["idEstado"] == estado]

    def obtener(self, identificador):
        plan = self.repositorio.plan(identificador)
        if not plan:
            raise NoEncontrado("plan", "Plan no encontrado.")
        return plan

    def crear(self, datos):
        if self.repositorio.plan_nombre_existe(datos["nombre"]):
            raise Conflicto("Ya existe un plan con ese nombre.")
        return self.repositorio.crear_plan(datos)

    def actualizar(self, identificador, datos):
        self.obtener(identificador)
        if self.repositorio.plan_nombre_existe(datos["nombre"], identificador):
            raise Conflicto("Ya existe un plan con ese nombre.")
        return self.repositorio.actualizar_plan(identificador, datos)

    def cambiar_estado(self, identificador, id_estado):
        self.obtener(identificador)
        if id_estado not in (ESTADO_ACTIVO, ESTADO_INACTIVO):
            raise DatoInvalido("El estado debe ser Activo o Inactivo.")
        return self.repositorio.cambiar_estado_plan(identificador, id_estado)


class GestionarPreinscripciones:
    def __init__(self, repositorio):
        self.repositorio = repositorio

    def listar(self, estado, buscar, pagina, tamano, sede=None, periodo=None):
        datos, total = self.repositorio.listar_preinscripciones(estado, buscar, pagina, tamano, sede, periodo)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, identificador):
        registro = self.repositorio.preinscripcion(identificador)
        if not registro:
            raise NoEncontrado("preinscripcion", "Preinscripción no encontrada.")
        return registro

    def cambiar_estado(self, identificador, id_estado):
        self.obtener(identificador)
        if self.repositorio.categoria_de_estado(id_estado) != CATEGORIA_PREINSCRIPCION:
            raise DatoInvalido("El estado indicado no es un estado de preinscripción.")
        return self.repositorio.cambiar_estado_preinscripcion(identificador, id_estado)


class GestionarSolicitudes:
    def __init__(self, repositorio, correo=None):
        self.repositorio = repositorio
        self.solicitar = SolicitarEspacio(repositorio, correo)

    def listar(self, estado, buscar, pagina, tamano, sede=None, fecha=None):
        datos, total = self.repositorio.listar_solicitudes(estado, buscar, pagina, tamano, sede, fecha)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def obtener(self, identificador):
        registro = self.repositorio.solicitud(identificador)
        if not registro:
            raise NoEncontrado("solicitud", "Solicitud no encontrada.")
        return registro

    def cambiar_estado(self, identificador, id_estado):
        registro = self.obtener(identificador)
        aprobada = self.repositorio.id_estado(SOLICITUD_APROBADA, CATEGORIA_SOLICITUD)
        rechazada = self.repositorio.id_estado(SOLICITUD_RECHAZADA, CATEGORIA_SOLICITUD)
        if id_estado not in (aprobada, rechazada):
            raise DatoInvalido("Una solicitud solo se puede aprobar o rechazar.")
        return self.solicitar.decidir(registro["idSolicitud"], id_estado == aprobada)
