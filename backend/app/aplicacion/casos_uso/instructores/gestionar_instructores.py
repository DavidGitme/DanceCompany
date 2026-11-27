import secrets

from app.aplicacion.casos_uso.gestionar_persona_rol import CAMPOS_PERSONA, GestionarPersonaRol
from app.dominio.excepciones.errores import Conflicto, DatoInvalido
from app.dominio.reglas import ESTADO_ACTIVO
from app.dominio.repositorios.repositorio_instructores import RepositorioInstructores


class GestionarInstructores(GestionarPersonaRol):
    recurso = "instructor"
    mensaje_no_encontrado = "Instructor no encontrado"
    campos = (*CAMPOS_PERSONA, "descripcion", "sedes")
    repositorio: RepositorioInstructores

    def listar(self, estado, buscar, pagina, tamano, sede=None):
        datos, total = self.repositorio.listar(estado, buscar, pagina, tamano, sede)
        return {"datos": datos, "total": total, "pagina": pagina, "tamano": tamano}

    def valores_actuales(self, registro):
        # El detalle trae las sedes como objetos; la edición las recibe como ids
        return {**registro, "sedes": [sede["idSede"] for sede in registro["sedes"]]}

    def validar(self, datos, identificador=None):
        self.validar_persona(datos, identificador)
        sedes = set(datos["sedes"])
        if not sedes:
            raise DatoInvalido("El instructor debe pertenecer al menos a una sede.")
        actuales = set(self.valores_actuales(self.obtener(identificador))["sedes"]) if identificador else set()
        nuevas = sedes - actuales
        if nuevas - self.repositorio.sedes_activas(list(nuevas)):
            raise DatoInvalido("Alguna de las sedes no existe o está inactiva.")
        if identificador:
            # No se puede quitar una sede donde todavía dicta grupos activos
            quitadas = self.repositorio.sedes_con_grupos_activos(identificador) - sedes
            if quitadas:
                raise Conflicto("El instructor tiene grupos activos en una sede que se intenta quitar.")

    def invitar(self, identificador: int, hasher, correo):
        """Cuenta del instructor después de registrarlo (contratación): nadie escribe su clave.

        Se crea con una clave aleatoria que nadie conoce y se envía un enlace de un solo uso
        (48 horas) para que el instructor cree la suya. Solo corresponde si está activo, tiene
        correo, todavía no tiene cuenta y el correo de la academia está configurado.
        """
        instructor = self.obtener(identificador)
        if not instructor.get("email"):
            raise DatoInvalido("Registra el correo del instructor para enviarle la invitación.")
        if not getattr(correo, "configurado", True):
            raise DatoInvalido(
                "El envío de correos no está configurado: no se puede enviar la invitación. "
                "Configura SMTP en el backend e inténtalo de nuevo."
            )
        self.crear_cuenta(identificador, hasher.crear_hash(secrets.token_urlsafe(32)))
        enviado = correo.invitar(
            instructor["documento"], instructor["nombre"], instructor["email"],
            "La academia F&A Dance Company te registró como instructor.",
        )
        return {
            **self.obtener(identificador),
            "invitacionEnviada": enviado,
            "aviso": None if enviado else (
                "La cuenta quedó creada, pero el correo no salió. Pídele usar «¿Olvidaste tu contraseña?» "
                "para recibir un enlace nuevo."
            ),
        }

    def crear_cuenta(self, identificador: int, password_hash: str):
        """Crea el usuario de acceso del instructor. Inicia sesión con su documento."""
        instructor = self.obtener(identificador)
        if instructor["idEstado"] != ESTADO_ACTIVO:
            raise DatoInvalido("El instructor está inactivo.")
        if not instructor["documento"]:
            raise DatoInvalido("El instructor no tiene documento para iniciar sesión.")
        if self.repositorio.tiene_cuenta(instructor["documento"]):
            raise Conflicto("El instructor ya tiene una cuenta de acceso.")
        id_rol = self.repositorio.id_rol_por_nombre("instructor")
        if not id_rol:
            raise DatoInvalido("No existe el rol 'instructor' en la tabla roles.")
        self.repositorio.crear_cuenta(instructor["documento"], password_hash, id_rol)
        return self.obtener(identificador)
