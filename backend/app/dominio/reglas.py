"""Reglas compartidas por los módulos académicos."""

# Convención del script de base de datos: 1 = Activo, 2 = Inactivo
ESTADO_ACTIVO = 1
ESTADO_INACTIVO = 2

# Mismas letras que usa translate() en las consultas SQL, para que ambos lados comparen igual
CON_TILDE = "áéíóúüÁÉÍÓÚÜ"
SIN_TILDE = "aeiouuaeiouu"
_TABLA_TILDES = str.maketrans(CON_TILDE, SIN_TILDE)


def normalizar_texto(texto: str) -> str:
    """Quita tildes, espacios sobrantes y mayúsculas para comparar nombres."""
    return texto.strip().lower().translate(_TABLA_TILDES)
