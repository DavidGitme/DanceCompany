"""Alcance por sede: cada administrador solo ve y cambia los datos de su sede.

La sede viaja en el token ("sede") y sale de usuarios.idSede.

- El administrador sin sede (cuenta técnica creada por script) no queda limitado.
- Una cuenta sin sede que no es administradora (instructor, acudiente...) no entra a
  las rutas por sede aunque su rol tenga permisos del módulo: se niega por defecto.

Reglas para el administrador de sede:
- Registro de otra sede, por ruta, filtro o cuerpo: 404, para no revelar que existe.
- `?sede=` de otra sede o `idSede` ajeno en el cuerpo: 403 (las sedes son públicas).
- Listas: filtro_sede fija la sede de la cuenta aunque el cliente no la envíe.

Los ids se convierten con el mismo validador de Pydantic que usa FastAPI ("2", 2.0 y
"+2" valen 2): el control revisa exactamente el valor que llega al caso de uso.
"""

import json
from collections.abc import Callable

from fastapi import Depends, Query, Request
from pydantic import TypeAdapter, ValidationError
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.dominio.excepciones.errores import NoAutorizado, NoEncontrado
from app.infraestructura.bd.conexion import obtener_sesion
from app.infraestructura.repositorios.persona_sql import condicion_persona_en_sede
from app.presentacion.dependencias.auth import get_usuario_actual

MENSAJE_OTRA_SEDE = "Solo puedes gestionar registros de tu sede."
SIN_SEDE = "Tu cuenta no tiene una sede asignada para este módulo."
_ENTERO = TypeAdapter(int)

# Consulta que devuelve la sede (o sedes) de un registro de cada recurso
SEDE_DE = {
    "sedes": "SELECT idSede FROM sede WHERE idSede = :id",
    "estudiantes": "SELECT idSede FROM estudiante WHERE idEstudiante = :id",
    "instructores": "SELECT idSede FROM instructor_Sede WHERE idInstructor = :id",
    "grupos": "SELECT idSede FROM grupo WHERE idGrupo = :id",
    "aulas": "SELECT idSede FROM aula WHERE idAula = :id",
    "horarios": (
        "SELECT g.idSede FROM horario h JOIN grupo g ON g.idGrupo = h.idGrupo "
        "WHERE h.idHorario = :id"
    ),
    "matriculas": (
        "SELECT g.idSede FROM matricula m JOIN grupo g ON g.idGrupo = m.idGrupo "
        "WHERE m.idMatricula = :id"
    ),
    "mensualidades": (
        "SELECT g.idSede FROM mensualidad me "
        "JOIN matricula m ON m.idMatricula = me.idMatricula "
        "JOIN grupo g ON g.idGrupo = m.idGrupo WHERE me.idMensualidad = :id"
    ),
    # Un pago es de una mensualidad, de una matrícula o de un taller
    "pagos": (
        "SELECT COALESCE(gme.idSede, gma.idSede, e.idSede) FROM pago pg "
        "LEFT JOIN mensualidad me ON me.idMensualidad = pg.idMensualidad "
        "LEFT JOIN matricula mme ON mme.idMatricula = me.idMatricula "
        "LEFT JOIN grupo gme ON gme.idGrupo = mme.idGrupo "
        "LEFT JOIN matricula ma ON ma.idMatricula = pg.idMatricula "
        "LEFT JOIN grupo gma ON gma.idGrupo = ma.idGrupo "
        "LEFT JOIN inscripcion_talle it ON it.idPago = pg.idPago "
        "LEFT JOIN estudiante e ON e.idEstudiante = it.idEstudiante "
        "WHERE pg.idPago = :id"
    ),
    "inscripciones": (
        "SELECT e.idSede FROM inscripcion_talle it "
        "JOIN estudiante e ON e.idEstudiante = it.idEstudiante WHERE it.idInscripcionT = :id"
    ),
    "grupos-competencia": (
        "SELECT g.idSede FROM grupo_competencia gc JOIN grupo g ON g.idGrupo = gc.idGrupo "
        "WHERE gc.idgrupocompe = :id"
    ),
    "preinscripciones": "SELECT idSede FROM preinscripcion WHERE idPreinscripcion = :id",
    "solicitudes": (
        "SELECT a.idSede FROM solicitud_espacio s JOIN aula a ON a.idAula = s.idAula "
        "WHERE s.idSolicitud = :id"
    ),
    "postulaciones": (
        "SELECT e.idSede FROM convocatoria_estudiante ce "
        "JOIN estudiante e ON e.idEstudiante = ce.idEstudiante WHERE ce.idConvocatoriaEst = :id"
    ),
}

# Filtros de consulta que apuntan a un registro con sede ("sede" se revisa aparte)
REFERENCIAS_CONSULTA = {
    "estudiante": "estudiantes",
    "grupo": "grupos",
    "aula": "aulas",
    "matricula": "matriculas",
    "mensualidad": "mensualidades",
}

# Campos del cuerpo que apuntan a un registro con sede. idInstructor y idAcudiente no
# están: los instructores se comparten y el caso de uso de grupos exige que el instructor
# trabaje en la sede del grupo; el acudiente se valida contra el estudiante.
REFERENCIAS_CUERPO = {
    "idEstudiante": "estudiantes",
    "idGrupo": "grupos",
    "idAula": "aulas",
    "idMatricula": "matriculas",
    "idMensualidad": "mensualidades",
}


def sede_de_sesion(usuario: dict) -> int | None:
    return usuario.get("sede")


def es_administrador_global(usuario: dict) -> bool:
    return sede_de_sesion(usuario) is None and "administrador" in usuario.get("roles", [])


def como_entero(valor) -> int | None:
    """El entero que FastAPI/Pydantic verían en `valor`, o None si no es un entero válido."""
    if valor is None or isinstance(valor, (bool, list, dict)):
        return None
    try:
        return _ENTERO.validate_python(valor)
    except ValidationError:
        return None


MENSAJE_INSTRUCTOR_OTRA_SEDE = "Este instructor es de otra sede: solo el administrador de esa sede puede modificarlo."

def sedes_de(sesion: Session, recurso: str, identificador: int) -> set[int]:
    filas = sesion.execute(text(SEDE_DE[recurso]), {"id": identificador}).scalars()
    return {fila for fila in filas if fila is not None}


def _exigir_sede(sesion: Session, recurso: str, identificador: int, propia: int):
    sedes = sedes_de(sesion, recurso, identificador)
    # Si no existe, el caso de uso responde su propio "no encontrado"
    if sedes and propia not in sedes:
        raise NoEncontrado(recurso, "No se encontró el registro.")


async def _cuerpo_json(request: Request) -> dict:
    # Se lee aunque falte el Content-Type: FastAPI también intenta leerlo como JSON
    crudo = await request.body()
    if not crudo:
        return {}
    try:
        cuerpo = json.loads(crudo)
    except ValueError:
        return {}  # FastAPI responde 422 al validar el cuerpo
    return cuerpo if isinstance(cuerpo, dict) else {}


def _sede_propia_o_negar(usuario: dict) -> int | None:
    """Sede de la cuenta; None si es administrador global. Niega a quien no tiene sede."""
    propia = sede_de_sesion(usuario)
    if propia is None and not es_administrador_global(usuario):
        raise NoAutorizado(SIN_SEDE)
    return propia


def alcance_sede(
    recurso: str | None,
    *,
    proteger_lectura: bool = True,
    permite_crear: bool = True,
    permite_traslado: bool = False,
) -> Callable:
    """Dependencia para los routers del panel.

    recurso: clave de SEDE_DE del registro que identifica la ruta (None si no tiene sede).
    proteger_lectura: False cuando el recurso se puede consultar desde cualquier sede.
    permite_crear: False cuando solo la cuenta técnica puede crear (sedes nuevas).
    permite_traslado: al editar, el cuerpo puede llevar otra idSede (traslado de estudiante).
    """

    async def validar(
        request: Request,
        usuario: dict = Depends(get_usuario_actual),
        sesion: Session = Depends(obtener_sesion),
    ):
        propia = _sede_propia_o_negar(usuario)
        if propia is None:
            return
        escritura = request.method not in ("GET", "HEAD", "OPTIONS")
        cuerpo = await _cuerpo_json(request) if escritura else {}

        # 1. El registro de la ruta debe ser de la sede de la cuenta
        identificador = como_entero(request.path_params.get("identificador"))
        if recurso and identificador is not None and (escritura or proteger_lectura):
            if recurso == "instructores" and request.method == "PUT":
                _validar_edicion_instructor(sesion, identificador, cuerpo, propia)
            elif recurso == "instructores":
                # Los instructores se listan en las dos sedes: se responde claro en vez de "no encontrado"
                sedes = sedes_de(sesion, recurso, identificador)
                if sedes and propia not in sedes:
                    raise NoAutorizado(MENSAJE_INSTRUCTOR_OTRA_SEDE)
            else:
                _exigir_sede(sesion, recurso, identificador, propia)
        es_creacion = request.method == "POST" and "identificador" not in request.path_params
        if es_creacion and not permite_crear:
            raise NoAutorizado("Solo la cuenta técnica de la academia puede crear este registro.")

        # 2. Los filtros de la consulta no pueden apuntar a otra sede
        sede_filtro = como_entero(request.query_params.get("sede"))
        if sede_filtro is not None and sede_filtro != propia:
            raise NoAutorizado(MENSAJE_OTRA_SEDE)
        for nombre, referencia in REFERENCIAS_CONSULTA.items():
            valor = como_entero(request.query_params.get(nombre))
            if valor is not None:
                _exigir_sede(sesion, referencia, valor, propia)

        # 3. Los registros que se enlazan en el cuerpo deben ser de la sede
        if not escritura:
            return
        id_sede = como_entero(cuerpo.get("idSede"))
        traslado = permite_traslado and identificador is not None
        if id_sede is not None and id_sede != propia and not traslado:
            raise NoAutorizado(MENSAJE_OTRA_SEDE)
        for campo, referencia in REFERENCIAS_CUERPO.items():
            valor = como_entero(cuerpo.get(campo))
            if valor is not None:
                _exigir_sede(sesion, referencia, valor, propia)
        if recurso == "instructores" and isinstance(cuerpo.get("sedes"), list):
            _validar_sedes_instructor(sesion, cuerpo["sedes"], identificador, propia)

    return validar


def _validar_edicion_instructor(sesion: Session, identificador: int, cuerpo: dict, propia: int):
    """Un instructor de otra sede solo se toca para agregarle la sede propia (nada más)."""
    actuales = sedes_de(sesion, "instructores", identificador)
    if not actuales or propia in actuales:
        return
    if set(cuerpo) != {"sedes"}:
        raise NoAutorizado(MENSAJE_INSTRUCTOR_OTRA_SEDE)


def _validar_sedes_instructor(sesion: Session, nuevas: list, identificador, propia: int):
    """Los instructores se comparten: cada administrador solo agrega o quita su propia sede."""
    actuales = sedes_de(sesion, "instructores", identificador) if identificador else set()
    pedidas = {como_entero(s) for s in nuevas}
    if None in pedidas:
        return  # FastAPI responde 422
    if actuales.symmetric_difference(pedidas) - {propia}:
        raise NoAutorizado("Solo puedes asignar o quitar tu propia sede al instructor.")


def filtro_sede(
    sede: int | None = Query(None, gt=0, description="Solo registros de esta sede"),
    usuario: dict = Depends(get_usuario_actual),
) -> int | None:
    """Filtro de sede para listas: una cuenta con sede siempre ve solo la suya."""
    propia = _sede_propia_o_negar(usuario)
    if propia is None:
        return sede
    if sede is not None and sede != propia:
        raise NoAutorizado(MENSAJE_OTRA_SEDE)
    return propia


def sede_de_cuenta(usuario: dict = Depends(get_usuario_actual)) -> int | None:
    """Sede de la cuenta (None para el administrador global), para listas de seguridad."""
    return sede_de_sesion(usuario)


# ---------- Seguridad: personas, cuentas, roles ----------

# Roles que un administrador de sede puede asignar (sus permisos los fija la cuenta técnica)
ROLES_ASIGNABLES_POR_SEDE = ("instructor", "estudiante", "acudiente")


def _ids_roles_asignables(sesion: Session) -> set[int]:
    filas = sesion.execute(
        text("SELECT idRol FROM roles WHERE lower(trim(nombre)) = ANY(:nombres)"),
        {"nombres": list(ROLES_ASIGNABLES_POR_SEDE)},
    ).scalars()
    return set(filas)


def persona_en_sede(sesion: Session, id_persona: int, sede: int) -> bool | None:
    """True o False según la persona sea de la sede; None si no existe."""
    if not sesion.execute(text("SELECT 1 FROM persona WHERE idPersona = :id"), {"id": id_persona}).first():
        return None
    return sesion.execute(
        text(f"SELECT 1 WHERE {condicion_persona_en_sede(':id')}"),
        {"id": id_persona, "sede": sede},
    ).first() is not None


def _id_persona_de_documento(sesion: Session, documento: str) -> int | None:
    return sesion.execute(
        text("SELECT idPersona FROM persona WHERE documento = :doc"), {"doc": documento}
    ).scalar()


async def proteger_cuentas_admin(
    request: Request,
    usuario: dict = Depends(get_usuario_actual),
    sesion: Session = Depends(obtener_sesion),
):
    """Seguridad para un administrador de sede:
    - Personas y cuentas: solo las de su sede (o sin vínculos); nunca las de administradores.
    - Al crear o editar cuentas solo asigna los roles Instructor, Estudiante o Acudiente.
    - Roles, permisos y estados son de toda la academia: solo los cambia la cuenta técnica.
    - Excepción: la matriz de privilegios (ver/crear/editar/eliminar) de los roles que
      no son Administrador, que es la configuración del día a día de la academia.
    """
    propia = sede_de_sesion(usuario)
    if propia is None:
        return  # El permiso "usuarios" ya se exigió; la cuenta técnica gestiona todo
    ruta = request.url.path
    escritura = request.method not in ("GET", "HEAD", "OPTIONS")
    identificador = request.path_params.get("identificador")
    no_encontrado = NoEncontrado("registro", "No se encontró el registro.")

    if ruta.rstrip("/").endswith("/privilegios"):
        # La matriz de privilegios la ajusta cualquier administrador; el rol Administrador
        # no se puede limitar (la ruta lo rechaza) y los roles que asigna siguen siendo
        # solo Instructor, Estudiante y Acudiente, así que no hay escalada.
        return

    if "/roles" in ruta or "/permisos" in ruta or "/estados" in ruta:
        # Un admin de sede podría crear un rol con todos los permisos y dárselo a una cuenta
        if escritura:
            raise NoAutorizado("Roles, permisos y estados se configuran con la cuenta técnica de la academia.")
        return

    if "/personas" in ruta and identificador is not None:
        id_persona = como_entero(identificador)
        if id_persona is not None and persona_en_sede(sesion, id_persona, propia) is False:
            raise no_encontrado

    if "/usuarios" in ruta:
        cuerpo = await _cuerpo_json(request) if escritura else {}
        documento = identificador if identificador is not None else cuerpo.get("documento")
        if isinstance(documento, str) and documento.strip():
            id_persona = _id_persona_de_documento(sesion, documento.strip())
            if id_persona is not None and not persona_en_sede(sesion, id_persona, propia):
                raise no_encontrado
        roles = cuerpo.get("roles")
        if escritura and isinstance(roles, list):
            pedidos = {como_entero(r) for r in roles}
            if not pedidos <= _ids_roles_asignables(sesion):
                raise NoAutorizado("Solo puedes asignar los roles Instructor, Estudiante o Acudiente.")
