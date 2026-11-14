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


# ---------- Estados por categoría (tabla `estados`) ----------
# Se buscan por nombre y categoría, no por id, para no depender del orden del script.
CATEGORIA_MENSUALIDAD = "mensualidad"
CATEGORIA_POSTULACION = "postulacion"
CATEGORIA_NOTICIA = "noticia"

MENSUALIDAD_PENDIENTE = "Pendiente"
MENSUALIDAD_PAGADA = "Pagada"
MENSUALIDAD_VENCIDA = "Vencida"

POSTULACION_POSTULADO = "Postulado"
POSTULACION_ACEPTADO = "Aceptado"

NOTICIA_DISPONIBLE = "Disponible"
NOTICIA_EXPIRADA = "Expirada"

# Se guardan sin tilde, igual que los datos iniciales ("Miercoles", "Sabado")
DIAS_SEMANA = ("Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo")

EDAD_ADULTO = 18


def normalizar_dia(dia: str) -> str | None:
    """Convierte 'miércoles', 'SABADO'... al formato guardado. None si no es un día válido."""
    buscado = normalizar_texto(dia)
    return next((d for d in DIAS_SEMANA if normalizar_texto(d) == buscado), None)


def edad_en(fecha_nacimiento, fecha) -> int:
    """Años cumplidos en `fecha`."""
    cumplio = (fecha.month, fecha.day) >= (fecha_nacimiento.month, fecha_nacimiento.day)
    return fecha.year - fecha_nacimiento.year - (0 if cumplio else 1)
