"""Reglas de la inscripción presencial y del alcance por sede (sin base de datos)."""

from datetime import date

import pytest

from app.aplicacion.casos_uso.estudiantes.gestionar_estudiantes import GestionarEstudiantes
from app.aplicacion.casos_uso.inscripciones.inscribir_estudiante import InscribirEstudiante
from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoAutorizado
from app.dominio.reglas import (
    error_documento,
    error_tipo_para_edad,
    normalizar_documento,
    normalizar_telefono,
    telefono_valido,
)
from app.presentacion.dependencias.sede import filtro_sede

TIPOS = {1: "Cedula de ciudadania", 2: "Tarjeta de identidad", 4: "Pasaporte", 5: "Registro civil"}


# ---------- Reglas de documento y teléfono ----------
def test_documento_se_normaliza_y_valida_por_tipo():
    assert normalizar_documento(" 1.000.234-5 ") == "10002345"
    assert error_documento("Cédula de ciudadanía", "10002345") is None
    assert error_documento("Tarjeta de identidad", "AB1234") is not None
    assert error_documento("Pasaporte", "AB1234") is None


def test_tipo_de_documento_segun_la_edad():
    assert error_tipo_para_edad("Registro civil", 5) is None
    assert error_tipo_para_edad("Registro civil", 8) is not None
    assert error_tipo_para_edad("Tarjeta de identidad", 12) is None
    assert error_tipo_para_edad("Tarjeta de identidad", 18) is not None
    assert error_tipo_para_edad("Cedula de ciudadania", 17) is not None
    assert error_tipo_para_edad("Pasaporte", 3) is None


def test_telefono_tiene_exactamente_diez_digitos():
    assert normalizar_telefono("300 111-1111") == "3001111111"
    # El indicativo de Colombia se quita
    assert normalizar_telefono("+57 300 111 1111") == "3001111111"
    assert telefono_valido("3001111111")
    assert not telefono_valido("12345")
    assert not telefono_valido("30011111112")
    assert not telefono_valido("300111111a")


# ---------- Filtro de sede de las listas ----------
def test_filtro_sede_fija_la_sede_de_la_cuenta():
    admin_bello = {"sub": "1", "roles": ["administrador"], "sede": 1}
    assert filtro_sede(None, admin_bello) == 1
    assert filtro_sede(1, admin_bello) == 1
    with pytest.raises(NoAutorizado):
        filtro_sede(2, admin_bello)
    # Una cuenta sin sede filtra solo si lo pide
    assert filtro_sede(None, {"sub": "9", "roles": ["administrador"]}) is None
    assert filtro_sede(2, {"sub": "9", "roles": ["administrador"]}) == 2


# ---------- Inscripción ----------
class EstudiantesMemoria:
    def __init__(self):
        self.registros = {}
        self.documentos = set()
        self.con_matricula = set()

    def nombre_tipo_documento(self, id_tipo):
        return TIPOS.get(id_tipo)

    def documento_existe(self, documento, excluir_persona=None):
        return documento in self.documentos

    def email_existe(self, email, excluir_persona=None):
        return False

    def sedes_activas(self, sedes):
        return {s for s in sedes if s in (1, 2)}

    def tiene_matricula_activa(self, id_estudiante):
        return id_estudiante in self.con_matricula

    def obtener(self, identificador):
        registro = self.registros.get(identificador)
        return dict(registro) if registro else None

    def actualizar(self, identificador, datos):
        self.registros[identificador].update(datos)
        return self.obtener(identificador)


class InscripcionesMemoria:
    """Simula la transacción: nada queda guardado si no se confirma."""

    def __init__(self, estudiantes: EstudiantesMemoria):
        self.estudiantes = estudiantes
        self.pendiente = []
        self.confirmado = []
        self.vinculos = []

    def buscar_persona(self, documento):
        return None

    def obtener_persona(self, id_persona):
        return {"idPersona": id_persona, "nombre": "Madre", "documento": "52000000", "fecha_nacimiento": date(1980, 1, 1)}

    def parentesco_existe(self, id_parentesco):
        return id_parentesco in (1, 2)

    def id_rol(self, nombre):
        return 3

    def insertar_persona(self, datos):
        self.pendiente.append(("persona", datos["documento"]))
        return len(self.pendiente)

    def insertar_estudiante(self, id_persona, id_sede):
        self.pendiente.append(("estudiante", id_sede))
        nuevo = len(self.estudiantes.registros) + 1
        self.estudiantes.registros[nuevo] = {"idEstudiante": nuevo, "idSede": id_sede, "documento": "x"}
        return nuevo

    def asegurar_acudiente(self, id_persona):
        return id_persona

    def vincular_acudiente(self, id_estudiante, id_acudiente, id_parentesco):
        self.vinculos.append((id_estudiante, id_acudiente))

    def acudientes_de(self, id_estudiante):
        return [v for v in self.vinculos if v[0] == id_estudiante]

    def crear_cuenta(self, documento, password_hash, id_rol):
        self.pendiente.append(("cuenta", documento))

    def confirmar(self):
        self.confirmado += self.pendiente
        self.pendiente = []

    def deshacer(self):
        self.pendiente = []


class MatriculasQueFallan:
    def crear(self, datos):
        raise Conflicto("El grupo no tiene cupos disponibles (capacidad 1).")


class HasherFalso:
    def crear_hash(self, clave):
        return "hash"


def armar(matriculas=None):
    estudiantes = EstudiantesMemoria()
    repo = InscripcionesMemoria(estudiantes)
    caso = InscribirEstudiante(GestionarEstudiantes(estudiantes), repo, matriculas, HasherFalso())
    return caso, repo, estudiantes


MENOR = {
    "nombre": "Lucia Mesa", "idTipoDocumento": 2, "documento": "1.112.223.334", "telefono": "300 123 4567",
    "email": None, "fecha_nacimiento": date(2015, 3, 10), "idSede": 1,
}
MADRE = {"idPersona": 7, "persona": None, "idParentesco": 1}


def test_acudiente_es_opcional_y_maximo_uno():
    caso, repo, _ = armar()
    caso.estudiantes.obtener = lambda i: {"idEstudiante": i}
    caso.ejecutar({**MENOR, "acudientes": []})
    assert ("estudiante", 1) in repo.confirmado
    with pytest.raises(DatoInvalido, match="un solo acudiente"):
        caso.ejecutar({**MENOR, "documento": "1112223335", "acudientes": [MADRE, MADRE]})


def test_invitacion_exige_correo_pero_la_clave_no():
    caso, repo, _ = armar()
    caso.estudiantes.obtener = lambda i: {"idEstudiante": i}
    with pytest.raises(DatoInvalido, match="correo"):
        caso.ejecutar({**MENOR, "crearCuenta": True})
    # Con clave asignada por la sede no hace falta correo: el usuario es el documento
    resultado = caso.ejecutar({**MENOR, "clave": "Segura2026"})
    assert resultado["cuentaCreada"] and ("cuenta", "1112223334") in repo.confirmado


def test_clave_debe_tener_letra_y_numero():
    caso, _, _ = armar()
    with pytest.raises(DatoInvalido, match="letra y un número"):
        caso.ejecutar({**MENOR, "clave": "soloLetras"})


class CorreoQueFalla:
    def invitar(self, *args):
        return False

    def bienvenida(self, *args):
        return False


def test_si_el_correo_falla_la_inscripcion_se_guarda_y_avisa():
    caso, repo, _ = armar()
    caso.correo = CorreoQueFalla()
    caso.estudiantes.obtener = lambda i: {"idEstudiante": i}
    resultado = caso.ejecutar({**MENOR, "email": "lucia@correo.com", "crearCuenta": True})
    assert ("cuenta", "1112223334") in repo.confirmado
    assert resultado["correoEnviado"] is False and "invitación" in resultado["aviso"]


def test_inscripcion_normaliza_y_confirma():
    caso, repo, _ = armar()
    caso.estudiantes.obtener = lambda i: {"idEstudiante": i}
    resultado = caso.ejecutar({**MENOR, "acudientes": [MADRE]})
    assert ("persona", "1112223334") in repo.confirmado
    assert resultado["idMatricula"] is None and resultado["cuentaCreada"] is False


def test_si_falla_la_matricula_no_se_guarda_nada():
    caso, repo, _ = armar(MatriculasQueFallan())
    with pytest.raises(Conflicto):
        caso.ejecutar({**MENOR, "acudientes": [MADRE], "idGrupo": 4, "valor_matricula": 100})
    assert repo.confirmado == [] and repo.pendiente == []


def test_traslado_bloqueado_con_matricula_activa():
    estudiantes = EstudiantesMemoria()
    estudiantes.registros[1] = {**MENOR, "documento": "1112223334", "idEstudiante": 1, "idPersona": 1}
    estudiantes.con_matricula.add(1)
    gestor = GestionarEstudiantes(estudiantes)
    with pytest.raises(Conflicto, match="traslad"):
        gestor.actualizar(1, {"idSede": 2})


# ---------- Hallazgos de la revisión independiente ----------
from app.aplicacion.casos_uso.inscripciones.inscribir_estudiante import puede_ser_acudiente  # noqa: E402
from app.presentacion.dependencias.sede import como_entero  # noqa: E402


def test_ids_se_leen_como_los_lee_fastapi():
    # Antes "2", 2.0 o "+2" se saltaban el control de sede
    assert como_entero(2) == 2
    assert como_entero("2") == 2
    assert como_entero("+2") == 2
    assert como_entero(2.0) == 2
    assert como_entero(" 2 ") == 2
    assert como_entero("dos") is None
    assert como_entero(True) is None
    assert como_entero(None) is None


def test_cuenta_sin_sede_que_no_es_admin_no_entra_a_rutas_por_sede():
    # Un rol con permisos (por ejemplo, Acudiente con "pagos") no ve las dos sedes
    with pytest.raises(NoAutorizado):
        filtro_sede(None, {"sub": "5", "roles": ["acudiente"], "permisos": ["pagos"]})


def test_quien_puede_ser_acudiente():
    assert puede_ser_acudiente({"esAdministrador": False, "sedeEstudiante": None}, 1)
    assert not puede_ser_acudiente({"esAdministrador": True, "sedeEstudiante": None}, 1)
    assert not puede_ser_acudiente({"esAdministrador": False, "sedeEstudiante": 2}, 1)
    assert puede_ser_acudiente({"esAdministrador": False, "sedeEstudiante": 1}, 1)
