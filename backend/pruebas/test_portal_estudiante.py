"""Login del estudiante por correo (sin base de datos)."""

import pytest

from app.aplicacion.casos_uso.portal_estudiante.iniciar_sesion_estudiante import IniciarSesionEstudiante
from app.dominio.excepciones.errores import NoAutenticado
from app.dominio.reglas import ESTADO_ACTIVO, ESTADO_INACTIVO

CUENTA = {
    "documento": "1000000007", "nombre": "Julian Rojas", "password_hash": "hash:Dance2026*",
    "idEstadoUsuario": ESTADO_ACTIVO, "bloqueado": False,
    "idEstudiante": 3, "idEstadoEstudiante": ESTADO_ACTIVO, "esEstudiante": True,
}


class Cuentas:
    def __init__(self, **cambios):
        self.cuenta = {**CUENTA, **cambios}

    def buscar_por_correo(self, correo):
        return dict(self.cuenta) if correo.lower() == "julian.rojas@mail.com" else None


class Hasher:
    def verificar(self, clave, hash_guardado):
        return hash_guardado == f"hash:{clave}"


class Tokens:
    def emitir_acceso(self, documento, roles, permisos):
        return f"token-{documento}-{','.join(roles)}", 1200


def login(cuentas, correo="julian.rojas@mail.com", clave="Dance2026*"):
    return IniciarSesionEstudiante(cuentas, Hasher(), Tokens()).ejecutar(correo, clave)


def test_estudiante_entra_con_correo_y_recibe_solo_rol_estudiante():
    respuesta = login(Cuentas(), correo="  Julian.Rojas@mail.com ")
    assert respuesta.usuario.roles == ["estudiante"]
    assert respuesta.usuario.permisos == []
    assert respuesta.accessToken == "token-1000000007-estudiante"


@pytest.mark.parametrize(
    "cuentas, correo, clave",
    [
        (Cuentas(), "otro@mail.com", "Dance2026*"),
        (Cuentas(), "julian.rojas@mail.com", "mala"),
        (Cuentas(esEstudiante=False), "julian.rojas@mail.com", "Dance2026*"),
        (Cuentas(idEstudiante=None), "julian.rojas@mail.com", "Dance2026*"),
        (Cuentas(idEstadoUsuario=ESTADO_INACTIVO), "julian.rojas@mail.com", "Dance2026*"),
        (Cuentas(idEstadoEstudiante=ESTADO_INACTIVO), "julian.rojas@mail.com", "Dance2026*"),
    ],
)
def test_no_entra_con_datos_malos_o_sin_ser_estudiante_activo(cuentas, correo, clave):
    with pytest.raises(NoAutenticado) as error:
        login(cuentas, correo, clave)
    assert error.value.mensaje == "Correo o contraseña incorrectos."


def test_cuenta_bloqueada():
    with pytest.raises(NoAutenticado) as error:
        login(Cuentas(bloqueado=True))
    assert "bloqueada" in error.value.mensaje
