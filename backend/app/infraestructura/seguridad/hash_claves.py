from pwdlib import PasswordHash

from app.aplicacion.servicios.seguridad import HasherClaves


class HasherArgon2(HasherClaves):
    def __init__(self):
        self._hasher = PasswordHash.recommended()

    def crear_hash(self, clave: str) -> str:
        return self._hasher.hash(clave)

    def verificar(self, clave: str, hash_guardado: str) -> bool:
        try:
            return self._hasher.verify(clave, hash_guardado)
        except Exception:
            return False
