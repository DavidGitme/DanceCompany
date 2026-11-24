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


# ---------- Documento y teléfono ----------
# Tipos colombianos que solo llevan números. Se comparan por nombre normalizado
# (sin tildes ni mayúsculas) para no depender del id del script.
CEDULA = "cedula de ciudadania"
TARJETA_IDENTIDAD = "tarjeta de identidad"
REGISTRO_CIVIL = "registro civil"
TIPOS_NUMERICOS = (CEDULA, TARJETA_IDENTIDAD, REGISTRO_CIVIL)

# Registraduría: registro civil de 0 a 6 años, tarjeta de 7 a 17 y cédula desde los 18.
# Cédula de extranjería y pasaporte sirven a cualquier edad.
EDADES_POR_TIPO = {REGISTRO_CIVIL: (0, 6), TARJETA_IDENTIDAD: (7, 17), CEDULA: (18, None)}


def normalizar_documento(documento: str) -> str:
    """Quita espacios, puntos y guiones ("1.000.234-5" -> "10002345") y pasa a mayúscula."""
    return "".join(c for c in documento if c not in " .-").upper()


def error_documento(tipo: str, documento: str) -> str | None:
    """Mensaje de error si el número no corresponde al tipo; None si es válido."""
    tipo = normalizar_texto(tipo)
    if tipo in TIPOS_NUMERICOS and not documento.isdigit():
        return "Este tipo de documento solo admite números."
    if not documento.isalnum():
        return "El documento solo admite letras y números."
    return None


def error_tipo_para_edad(tipo: str, edad: int) -> str | None:
    """Mensaje de error si el tipo de documento no corresponde a la edad."""
    rango = EDADES_POR_TIPO.get(normalizar_texto(tipo))
    if not rango:
        return None
    minima, maxima = rango
    if edad < minima or (maxima is not None and edad > maxima):
        hasta = f"a {maxima} años" if maxima is not None else "años en adelante"
        return f"Con {edad} años no corresponde ese tipo de documento (es de {minima} {hasta})."
    return None


def normalizar_telefono(telefono: str) -> str:
    """Deja solo dígitos y un + inicial ("300 111-1111" -> "3001111111")."""
    telefono = telefono.strip()
    signo = "+" if telefono.startswith("+") else ""
    return signo + "".join(c for c in telefono if c.isdigit())


def telefono_valido(telefono: str) -> bool:
    return 7 <= len(telefono.lstrip("+")) <= 15
