"""Recuperación de contraseña y privilegios por módulo (sin base de datos)."""

import pytest

from app.aplicacion.casos_uso.autenticacion.recuperar_clave import (
    MENSAJE_SOLICITUD,
    RecuperarClave,
    hash_token,
)
from app.dominio.excepciones.errores import DatoInvalido
from app.dominio.reglas import ACCION_POR_METODO, error_clave


class RecuperacionMemoria:
    def __init__(self):
        self.cuentas = {
            "1000000001": {"documento": "1000000001", "nombre": "Laura", "email": "laura@x.com", "idEstado": 1},
            "1000000002": {"documento": "1000000002", "nombre": "Sin correo", "email": None, "idEstado": 1},
        }
        self.tokens = {}
        self.claves = {}

    def cuenta(self, documento):
        return self.cuentas.get(documento)

    def guardar_token(self, documento, token_hash, expira):
        for datos in self.tokens.values():
            if datos["documento"] == documento:
                datos["usado"] = True
        self.tokens[token_hash] = {"documento": documento, "usado": False}

    def consumir_token(self, token_hash):
        datos = self.tokens.get(token_hash)
        if not datos or datos["usado"]:
            return None
        datos["usado"] = True
        return datos["documento"]

    def cambiar_clave(self, documento, password_hash):
        self.claves[documento] = password_hash

    def confirmar(self):
        pass

    def deshacer(self):
        pass


class CorreoMemoria:
    def __init__(self):
        self.enviados = []

    def enviar(self, destino, asunto, texto, html=None):
        self.enviados.append((destino, texto))
        return True


class Hasher:
    def crear_hash(self, clave):
        return f"hash:{clave}"


def armar():
    repo, correo = RecuperacionMemoria(), CorreoMemoria()
    return RecuperarClave(repo, Hasher(), correo, "https://app.test/"), repo, correo


def test_misma_respuesta_exista_o_no_la_cuenta():
    caso, _, correo = armar()
    assert caso.solicitar("1000000001") == MENSAJE_SOLICITUD
    assert caso.solicitar("9999999999") == MENSAJE_SOLICITUD
    assert caso.solicitar("1000000002") == MENSAJE_SOLICITUD  # sin correo
    assert len(correo.enviados) == 1


def test_solo_se_guarda_el_hash_y_el_enlace_sirve_una_vez():
    caso, repo, correo = armar()
    caso.solicitar("1.000.000.001")
    texto = correo.enviados[0][1]
    token = texto.split("token=")[1].split()[0]
    assert token not in repo.tokens and hash_token(token) in repo.tokens
    caso.restablecer(token, "NuevaClave2026")
    assert repo.claves["1000000001"] == "hash:NuevaClave2026"
    with pytest.raises(DatoInvalido, match="no es válido"):
        caso.restablecer(token, "OtraClave2026")


def test_un_enlace_nuevo_anula_el_anterior():
    caso, _, correo = armar()
    caso.solicitar("1000000001")
    caso.solicitar("1000000001")
    viejo = correo.enviados[0][1].split("token=")[1].split()[0]
    with pytest.raises(DatoInvalido):
        caso.restablecer(viejo, "NuevaClave2026")


def test_clave_debil_no_consume_el_enlace():
    caso, _, correo = armar()
    caso.solicitar("1000000001")
    token = correo.enviados[0][1].split("token=")[1].split()[0]
    with pytest.raises(DatoInvalido, match="letra y un número"):
        caso.restablecer(token, "12345678")
    caso.restablecer(token, "Valida2026")


def test_reglas_de_clave_y_metodos():
    assert error_clave("abc") is not None
    assert error_clave("Segura2026") is None
    assert ACCION_POR_METODO["GET"] == "ver"
    assert ACCION_POR_METODO["POST"] == "crear"
    assert ACCION_POR_METODO["PATCH"] == "editar"
    assert ACCION_POR_METODO["DELETE"] == "eliminar"
