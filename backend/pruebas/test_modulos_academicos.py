"""Pruebas de reglas de negocio de los módulos académicos (sin base de datos)."""

import pytest

from app.aplicacion.casos_uso.estilos.gestionar_estilos import GestionarEstilos
from app.aplicacion.casos_uso.grupos.gestionar_grupos import GestionarGrupos
from app.aplicacion.casos_uso.instructores.gestionar_instructores import GestionarInstructores
from app.aplicacion.casos_uso.niveles.gestionar_niveles import GestionarNiveles
from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoEncontrado
from app.dominio.reglas import ESTADO_ACTIVO, ESTADO_INACTIVO, normalizar_texto


class RepositorioMemoria:
    """Repositorio falso: guarda los registros en un diccionario."""

    def __init__(self, clave: str):
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

    def estado_existe(self, id_estado):
        return id_estado in (ESTADO_ACTIVO, ESTADO_INACTIVO)

    def _repetido(self, campo, valor, excluir_id, normalizar=True):
        comparar = normalizar_texto if normalizar else (lambda v: v)
        return any(
            comparar(r[campo]) == comparar(valor)
            for i, r in self.registros.items()
            if i != excluir_id
        )


class EstilosMemoria(RepositorioMemoria):
    def __init__(self):
        super().__init__("idEstilo")

    def nombre_existe(self, nombre, excluir_id=None):
        return self._repetido("nombre", nombre, excluir_id)


class NivelesMemoria(RepositorioMemoria):
    def __init__(self):
        super().__init__("idNivel")

    def nombre_existe(self, nombre, excluir_id=None):
        return self._repetido("nombre", nombre, excluir_id)

    def orden_existe(self, orden, excluir_id=None):
        return self._repetido("orden", orden, excluir_id, normalizar=False)


# ---------- Estilos ----------
def test_estilo_nuevo_queda_activo():
    gestor = GestionarEstilos(EstilosMemoria())
    estilo = gestor.crear({"nombre": "Breaking"})
    assert estilo["idEstado"] == ESTADO_ACTIVO


def test_estilo_duplicado_sin_importar_mayusculas_ni_tildes():
    gestor = GestionarEstilos(EstilosMemoria())
    gestor.crear({"nombre": "Danza Urbana"})
    with pytest.raises(Conflicto):
        gestor.crear({"nombre": "danza urbána"})


def test_estilo_editar_excluye_el_propio_registro():
    gestor = GestionarEstilos(EstilosMemoria())
    estilo = gestor.crear({"nombre": "Popping"})
    gestor.crear({"nombre": "Locking"})

    assert gestor.actualizar(estilo["idEstilo"], {"nombre": "POPPING"})["nombre"] == "POPPING"
    with pytest.raises(Conflicto):
        gestor.actualizar(estilo["idEstilo"], {"nombre": "locking"})


def test_estilo_no_encontrado_trae_mensaje_del_backlog():
    gestor = GestionarEstilos(EstilosMemoria())
    with pytest.raises(NoEncontrado) as error:
        gestor.obtener(99)
    assert error.value.mensaje == "Estilo no encontrado"


def test_cambiar_estado_rechaza_estado_inexistente():
    gestor = GestionarEstilos(EstilosMemoria())
    estilo = gestor.crear({"nombre": "Krump"})
    assert gestor.cambiar_estado(estilo["idEstilo"], ESTADO_INACTIVO)["idEstado"] == ESTADO_INACTIVO
    with pytest.raises(DatoInvalido):
        gestor.cambiar_estado(estilo["idEstilo"], 50)


# ---------- Niveles ----------
NIVEL = {"nombre": "Básico", "orden": 1, "edadMin": 6, "edadMax": 12}


def test_nivel_nombre_duplicado_ca_10_143():
    gestor = GestionarNiveles(NivelesMemoria())
    gestor.crear(NIVEL)
    with pytest.raises(Conflicto):
        gestor.crear({**NIVEL, "nombre": "basico", "orden": 2})


def test_nivel_orden_duplicado_y_rango_de_edades():
    gestor = GestionarNiveles(NivelesMemoria())
    gestor.crear(NIVEL)
    with pytest.raises(Conflicto):
        gestor.crear({**NIVEL, "nombre": "Intermedio"})
    with pytest.raises(DatoInvalido):
        gestor.crear({**NIVEL, "nombre": "Avanzado", "orden": 3, "edadMin": 15, "edadMax": 15})


def test_nivel_editar_conserva_datos_no_enviados():
    gestor = GestionarNiveles(NivelesMemoria())
    nivel = gestor.crear(NIVEL)
    editado = gestor.actualizar(nivel["idNivel"], {"edadMax": 14})
    assert editado["nombre"] == "Básico"
    assert editado["orden"] == 1
    assert editado["edadMax"] == 14


# ---------- Grupos ----------
class GruposMemoria(RepositorioMemoria):
    def __init__(self, inactivos=()):
        super().__init__("idGrupo")
        self.inactivos = set(inactivos)

    def crear(self, datos):
        return super().crear({**datos, "matriculados": 0})

    def esta_activo(self, tabla, identificador):
        return (tabla, identificador) not in self.inactivos

    def obtener_aula(self, id_aula):
        return {"idAula": id_aula, "capacidad": 20, "idSede": 1, "idEstado": ESTADO_ACTIVO}

    def tipo_grupo_existe(self, id_tipo):
        return True

    def instructor_en_sede(self, id_instructor, id_sede):
        return id_sede == 1

    def nombre_en_sede_existe(self, nombre, id_sede, excluir_id=None):
        return self._repetido("nombre", nombre, excluir_id)


GRUPO = {
    "nombre": "Kids A", "idNivel": 1, "idEstilo": 1, "idInstructor": 1,
    "idSede": 1, "idAula": 1, "idTipoGrupo": 1, "capacidad": 15,
}


def test_grupo_no_acepta_estilo_inactivo():
    gestor = GestionarGrupos(GruposMemoria(inactivos=[("estilo", 1)]))
    with pytest.raises(DatoInvalido):
        gestor.crear(GRUPO)


def test_grupo_editar_no_falla_si_el_estilo_se_inactivo_despues():
    repositorio = GruposMemoria()
    gestor = GestionarGrupos(repositorio)
    grupo = gestor.crear(GRUPO)
    repositorio.inactivos.add(("estilo", 1))
    assert gestor.actualizar(grupo["idGrupo"], {"capacidad": 18})["capacidad"] == 18


def test_grupo_capacidad_y_sede_del_instructor():
    gestor = GestionarGrupos(GruposMemoria())
    with pytest.raises(DatoInvalido):
        gestor.crear({**GRUPO, "capacidad": 25})
    with pytest.raises(DatoInvalido):
        gestor.crear({**GRUPO, "idSede": 2})


# ---------- Instructores ----------
class InstructoresMemoria(RepositorioMemoria):
    def __init__(self):
        super().__init__("idInstructor")

    def crear(self, datos):
        sedes = [{"idSede": s, "nombre": f"Sede {s}"} for s in datos["sedes"]]
        return super().crear({**datos, "sedes": sedes, "idPersona": len(self.registros) + 1})

    def nombre_tipo_documento(self, id_tipo_documento):
        return "Cedula de ciudadania"

    def documento_existe(self, documento, excluir_persona=None):
        return any(
            r["documento"] == documento and r["idPersona"] != excluir_persona
            for r in self.registros.values()
        )

    def email_existe(self, email, excluir_persona=None):
        return False

    def sedes_activas(self, sedes):
        return {s for s in sedes if s in (1, 2)}

    def sedes_con_grupos_activos(self, id_instructor):
        return {1}


INSTRUCTOR = {
    "nombre": "Ana Ruiz", "idTipoDocumento": 1, "documento": "1001001",
    "telefono": None, "email": None, "fecha_nacimiento": None,
    "descripcion": None, "sedes": [1],
}


def test_instructor_documento_repetido_y_sede_inactiva():
    gestor = GestionarInstructores(InstructoresMemoria())
    gestor.crear(INSTRUCTOR)
    with pytest.raises(Conflicto):
        gestor.crear({**INSTRUCTOR, "nombre": "Otra"})
    with pytest.raises(DatoInvalido):
        gestor.crear({**INSTRUCTOR, "documento": "2002002", "sedes": [9]})


def test_instructor_no_puede_quitar_sede_con_grupos_activos():
    gestor = GestionarInstructores(InstructoresMemoria())
    instructor = gestor.crear({**INSTRUCTOR, "sedes": [1, 2]})
    with pytest.raises(Conflicto):
        gestor.actualizar(instructor["idInstructor"], {"sedes": [2]})


# ---------- Portal del instructor ----------
from datetime import date, time  # noqa: E402

from app.aplicacion.casos_uso.portal_instructor.consultar_portal_instructor import (  # noqa: E402
    ConsultarPortalInstructor,
    resumir_horario,
)


def test_horario_se_resume_como_en_el_portal():
    dias, horario = resumir_horario([
        {"dia": "Miércoles", "inicio": time(19, 0), "fin": time(21, 0)},
        {"dia": "Lunes", "inicio": time(19, 0), "fin": time(21, 0)},
    ])
    assert dias == "Lunes y miércoles"
    assert horario == "7:00 p. m. – 9:00 p. m."


class PortalMemoria:
    def perfil_por_documento(self, documento):
        return {"idInstructor": 1, "nombre": "Ana"} if documento == "100" else None

    def estudiantes(self, id_instructor):
        return [{"idMatricula": 7, "idEstudiante": 1, "nombre": "Juan", "idGrupo": 2}]

    def mensualidades(self, matriculas):
        return [
            {"idMatricula": 7, "valor": 120000, "fechaLimite": date(2026, 10, 15), "estado": "Pagada"},
            {"idMatricula": 7, "valor": 120000, "fechaLimite": date(2026, 11, 15), "estado": "Mora"},
        ]


def test_portal_estado_del_estudiante_es_el_peor_de_sus_mensualidades():
    estudiante = ConsultarPortalInstructor(PortalMemoria()).estudiantes("100")[0]
    assert estudiante["estado"] == "Vencida"
    assert estudiante["mensualidades"][0]["periodo"] == "Octubre 2026"
    assert estudiante["mensualidades"][0]["fechaLimite"] == "15 oct 2026"


def test_portal_usuario_sin_instructor_da_404():
    with pytest.raises(NoEncontrado):
        ConsultarPortalInstructor(PortalMemoria()).perfil("999")


# ---------- Mi perfil del instructor: contacto y contraseña ----------
from app.aplicacion.casos_uso.portal_instructor.actualizar_cuenta_instructor import (  # noqa: E402
    ActualizarCuentaInstructor,
)


class HasherFalso:
    def crear_hash(self, clave):
        return f"hash:{clave}"

    def verificar(self, clave, hash_guardado):
        return hash_guardado == f"hash:{clave}"


class CuentaMemoria(PortalMemoria):
    def __init__(self):
        self.persona = {"nombre": "Ana", "correo": "", "telefono": ""}
        self.clave = "hash:Clave123"
        self.confirmados = 0

    def perfil_por_documento(self, documento):
        return {"idInstructor": 1, **self.persona} if documento == "100" else None

    def actualizar_contacto(self, documento, correo, telefono):
        self.persona.update(correo=correo, telefono=telefono or "")

    def hash_clave(self, documento):
        return self.clave if documento == "100" else None

    def guardar_clave(self, documento, password_hash):
        self.clave = password_hash

    def confirmar(self):
        self.confirmados += 1

    def deshacer(self):
        pass


def test_instructor_actualiza_su_contacto():
    repo = CuentaMemoria()
    perfil = ActualizarCuentaInstructor(repo, HasherFalso()).actualizar_contacto("100", " Ana@Correo.com ", "300 123 4567")
    assert perfil["correo"] == "ana@correo.com"
    assert perfil["telefono"] == "300 123 4567"
    assert repo.confirmados == 1


def test_usuario_sin_instructor_no_puede_actualizar_contacto():
    with pytest.raises(NoEncontrado):
        ActualizarCuentaInstructor(CuentaMemoria(), HasherFalso()).actualizar_contacto("999", "a@b.co", "")


def test_cambiar_clave_exige_la_actual_y_la_regla_de_seguridad():
    repo = CuentaMemoria()
    caso = ActualizarCuentaInstructor(repo, HasherFalso())
    with pytest.raises(DatoInvalido):
        caso.cambiar_clave("100", "Incorrecta1", "NuevaClave1")
    with pytest.raises(DatoInvalido):
        caso.cambiar_clave("100", "Clave123", "sinnumeros")
    with pytest.raises(DatoInvalido):
        caso.cambiar_clave("100", "Clave123", "Clave123")
    caso.cambiar_clave("100", "Clave123", "NuevaClave1")
    assert repo.clave == "hash:NuevaClave1"
