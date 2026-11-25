import secrets
from datetime import date

from app.aplicacion.casos_uso.estudiantes.gestionar_estudiantes import GestionarEstudiantes
from app.aplicacion.casos_uso.matriculas.gestionar_matriculas import GestionarMatriculas
from app.aplicacion.servicios.seguridad import HasherClaves
from app.dominio.excepciones.errores import Conflicto, DatoInvalido, NoEncontrado
from app.dominio.reglas import EDAD_ADULTO, edad_en, error_clave, normalizar_documento
from app.dominio.repositorios.repositorio_estudiantes import RepositorioInscripciones

CAMPOS_ESTUDIANTE = ("nombre", "idTipoDocumento", "documento", "telefono", "email", "fecha_nacimiento", "idSede")
MAX_ACUDIENTES = 1
CAMPOS_PERSONA = ("nombre", "idTipoDocumento", "documento", "telefono", "email", "fecha_nacimiento")


def puede_ser_acudiente(persona: dict, sede: int | None) -> bool:
    """Un administrador nunca es acudiente; un estudiante solo de su misma sede."""
    if persona.get("esAdministrador"):
        return False
    sede_estudiante = persona.get("sedeEstudiante")
    return sede is None or sede_estudiante is None or sede_estudiante == sede


class InscribirEstudiante:
    """Inscripción presencial: el administrador registra al estudiante después de matricularlo.

    Todo pasa en una transacción: si un paso falla (acudiente, cupo, edad, cuenta) no se
    guarda nada. Reemplaza el autorregistro público, que ya no existe.
    """

    def __init__(
        self,
        estudiantes: GestionarEstudiantes,
        inscripciones: RepositorioInscripciones,
        matriculas: GestionarMatriculas,
        hasher: HasherClaves,
        correo=None,
    ):
        self.estudiantes = estudiantes
        self.inscripciones = inscripciones
        self.matriculas = matriculas
        self.hasher = hasher
        # RecuperarClave: envía la invitación o la bienvenida después de guardar
        self.correo = correo

    # ---------- Consulta de apoyo ----------
    def buscar_persona(self, documento: str, sede: int | None = None):
        """Para reutilizar a un acudiente. Devuelve lo mínimo para reconocerlo."""
        persona = self.inscripciones.buscar_persona(normalizar_documento(documento))
        if not persona or not puede_ser_acudiente(persona, sede):
            raise NoEncontrado("persona", "No hay ninguna persona registrada con ese documento.")
        return {
            "idPersona": persona["idPersona"],
            "nombre": persona["nombre"],
            "tipoDocumento": persona["tipoDocumento"],
            "documento": persona["documento"],
            "esAcudiente": persona["idAcudiente"] is not None,
        }

    # ---------- Inscripción ----------
    def ejecutar(self, solicitud: dict):
        datos = {campo: solicitud.get(campo) for campo in CAMPOS_ESTUDIANTE}
        # Mismas reglas que al editar un estudiante (normaliza documento, teléfono y correo)
        self.estudiantes.validar(datos)
        acudientes = solicitud.get("acudientes") or []
        if len(acudientes) > MAX_ACUDIENTES:
            raise DatoInvalido("El estudiante puede tener un solo acudiente.")

        clave = solicitud.get("clave")
        crear_cuenta = bool(clave) or bool(solicitud.get("crearCuenta"))
        if clave and (error := error_clave(clave)):
            raise DatoInvalido(error)
        if crear_cuenta and not clave and not datos.get("email"):
            raise DatoInvalido(
                "Para enviar la invitación el estudiante necesita correo. También puedes asignarle una contraseña."
            )
        id_rol = self.inscripciones.id_rol("Estudiante") if crear_cuenta else None
        if crear_cuenta and not id_rol:
            raise DatoInvalido("No existe el rol Estudiante activo.")

        try:
            id_persona = self.inscripciones.insertar_persona(
                {campo: datos[campo] for campo in CAMPOS_PERSONA}
            )
            id_estudiante = self.inscripciones.insertar_estudiante(id_persona, datos["idSede"])
            vistos = {datos["documento"]}
            for acudiente in acudientes:
                self._vincular(id_estudiante, acudiente, vistos, datos["idSede"])
            if crear_cuenta:
                # Sin clave, la cuenta queda con una clave aleatoria que nadie conoce
                # hasta que el estudiante crea la suya con el enlace del correo
                inicial = clave or secrets.token_urlsafe(32)
                self.inscripciones.crear_cuenta(datos["documento"], self.hasher.crear_hash(inicial), id_rol)

            id_matricula = None
            if solicitud.get("idGrupo"):
                # Valida sede, edad del nivel y cupo; al guardar confirma toda la transacción
                matricula = self.matriculas.crear({
                    "idEstudiante": id_estudiante,
                    "idGrupo": solicitud["idGrupo"],
                    "fecha_matricula": solicitud.get("fecha_matricula") or date.today(),
                    "valor_matricula": solicitud["valor_matricula"],
                })
                id_matricula = matricula["idMatricula"]
            else:
                self.inscripciones.confirmar()
        except Exception:
            self.inscripciones.deshacer()
            raise

        correo_enviado, aviso = self._avisar(crear_cuenta, bool(clave), datos)
        return {
            "estudiante": self.estudiantes.obtener(id_estudiante),
            "acudientes": self.inscripciones.acudientes_de(id_estudiante),
            "idMatricula": id_matricula,
            "cuentaCreada": crear_cuenta,
            "correoEnviado": correo_enviado,
            "aviso": aviso,
        }

    def _avisar(self, crear_cuenta: bool, con_clave: bool, datos: dict):
        """El correo sale después de guardar: si falla, la inscripción no se pierde."""
        if not crear_cuenta or not datos.get("email") or not self.correo:
            return None, None
        if con_clave:
            enviado = self.correo.bienvenida(datos["documento"], datos["nombre"], datos["email"])
        else:
            enviado = self.correo.invitar(datos["documento"], datos["nombre"], datos["email"])
        if enviado:
            return True, None
        if con_clave:
            return False, "No se pudo enviar el correo de bienvenida. Entrégale sus datos de acceso en persona."
        return False, (
            "No se pudo enviar la invitación por correo. Asígnale una contraseña desde Seguridad > Usuarios "
            "o pídele que use \"¿Olvidaste tu contraseña?\" cuando el correo esté configurado."
        )

    # ---------- Acudientes de un estudiante ya registrado ----------
    def acudientes(self, id_estudiante: int):
        self.estudiantes.obtener(id_estudiante)
        return self.inscripciones.acudientes_de(id_estudiante)

    def agregar_acudiente(self, id_estudiante: int, acudiente: dict):
        estudiante = self.estudiantes.obtener(id_estudiante)
        vinculados = self.inscripciones.acudientes_de(id_estudiante)
        if len(vinculados) >= MAX_ACUDIENTES:
            raise Conflicto("El estudiante ya tiene un acudiente. Quítalo antes de agregar otro.")
        actuales = {a["documento"] for a in vinculados}
        try:
            self._vincular(id_estudiante, acudiente, {estudiante["documento"], *actuales}, estudiante["idSede"])
            self.inscripciones.confirmar()
        except Exception:
            self.inscripciones.deshacer()
            raise
        return self.inscripciones.acudientes_de(id_estudiante)

    def quitar_acudiente(self, id_estudiante: int, id_acudiente: int):
        estudiante = self.estudiantes.obtener(id_estudiante)
        acudientes = self.inscripciones.acudientes_de(id_estudiante)
        if not any(a["idAcudiente"] == id_acudiente for a in acudientes):
            raise NoEncontrado("acudiente", "Ese acudiente no está asociado al estudiante.")
        try:
            self.inscripciones.desvincular_acudiente(id_estudiante, id_acudiente)
            self.inscripciones.confirmar()
        except Exception:
            self.inscripciones.deshacer()
            raise
        return self.inscripciones.acudientes_de(id_estudiante)

    def _vincular(self, id_estudiante: int, acudiente: dict, vistos: set[str], sede: int):
        if not self.inscripciones.parentesco_existe(acudiente["idParentesco"]):
            raise DatoInvalido("El parentesco no existe.")
        if acudiente.get("idPersona"):
            persona = self.inscripciones.obtener_persona(acudiente["idPersona"])
            # Mismo mensaje si no existe o no se puede usar: no revela datos de otra sede
            if not persona or not puede_ser_acudiente(persona, sede):
                raise DatoInvalido("La persona indicada no puede ser acudiente.")
        else:
            persona = {campo: acudiente["persona"].get(campo) for campo in CAMPOS_PERSONA}
            # Se valida con las mismas reglas de documento, teléfono y duplicados
            self.estudiantes.validar_persona(persona)
            persona["idPersona"] = self.inscripciones.insertar_persona(persona)

        if persona["documento"] in vistos:
            raise DatoInvalido("El acudiente no puede ser el mismo estudiante ni repetirse.")
        nacimiento = persona.get("fecha_nacimiento")
        if nacimiento and edad_en(nacimiento, date.today()) < EDAD_ADULTO:
            raise DatoInvalido(f"El acudiente {persona['nombre']} debe ser mayor de edad.")
        vistos.add(persona["documento"])
        id_acudiente = self.inscripciones.asegurar_acudiente(persona["idPersona"])
        self.inscripciones.vincular_acudiente(id_estudiante, id_acudiente, acudiente["idParentesco"])
