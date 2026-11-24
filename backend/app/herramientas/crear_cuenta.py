"""Crea una cuenta de acceso en la base de datos (por ejemplo, el primer administrador).

Uso, desde la carpeta backend:
    python -m app.herramientas.crear_cuenta --documento 1234567890 --rol administrador --nombre "Andrea Salazar" --sede 1
    python -m app.herramientas.crear_cuenta --documento 2222222222 --rol instructor --nombre "Juan Pérez" --correo juan@mail.com
    python -m app.herramientas.crear_cuenta --documento 3333333333 --rol estudiante --nombre "Sara Gómez" --correo sara@mail.com --sede 1

Si la persona no existe y se indica --nombre, también la crea. La clave se pide por consola.
Con rol instructor o estudiante también crea el registro en instructor o estudiante,
porque cada portal necesita ese registro activo para mostrar datos.
El estudiante inicia sesión con su correo; por eso --correo es obligatorio para ese rol.
Cada administrador queda a cargo de una sede: --sede es obligatorio para ese rol.
La cuenta técnica (roles, permisos y estados de toda la academia) se crea con --sin-sede.
"""

import argparse
from getpass import getpass

from email_validator import EmailNotValidError, validate_email
from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.infraestructura.bd.conexion import FabricaSesion
from app.infraestructura.seguridad.hash_claves import HasherArgon2


def _crear_persona(sesion, args):
    sesion.execute(
        text(
            "INSERT INTO persona (nombre, idTipoDocumento, documento, email, idEstado) "
            "VALUES (:nombre, (SELECT MIN(idTipoDocumento) FROM tipo_documento), :doc, :correo, :activo)"
        ),
        {"nombre": args.nombre, "doc": args.documento, "correo": args.correo, "activo": ESTADO_ACTIVO},
    )


def _crear_perfil(sesion, rol: str, args):
    """Crea el registro de instructor o estudiante si todavía no existe."""
    id_persona = sesion.execute(
        text("SELECT idPersona FROM persona WHERE documento = :doc"), {"doc": args.documento}
    ).scalar_one()

    if rol == "instructor":
        existe = sesion.execute(
            text("SELECT 1 FROM instructor WHERE idPersona = :id"), {"id": id_persona}
        ).first()
        if not existe:
            sesion.execute(
                text(
                    "INSERT INTO instructor (idPersona, descripcion, idEstado) "
                    "VALUES (:id, :descripcion, :activo)"
                ),
                {"id": id_persona, "descripcion": args.descripcion, "activo": ESTADO_ACTIVO},
            )

    if rol == "estudiante":
        existe = sesion.execute(
            text("SELECT 1 FROM estudiante WHERE idPersona = :id"), {"id": id_persona}
        ).first()
        if not existe:
            id_sede = args.sede or sesion.execute(
                text("SELECT MIN(idSede) FROM sede WHERE idEstado = :activo"), {"activo": ESTADO_ACTIVO}
            ).scalar()
            if not id_sede:
                raise SystemExit("No hay sedes activas. Crea una sede antes del estudiante.")
            sesion.execute(
                text("INSERT INTO estudiante (idSede, idPersona, idEstado) VALUES (:sede, :id, :activo)"),
                {"sede": id_sede, "id": id_persona, "activo": ESTADO_ACTIVO},
            )


def main():
    parser = argparse.ArgumentParser(description="Crea un usuario con un rol")
    parser.add_argument("--documento", required=True)
    parser.add_argument("--rol", required=True, help="Nombre del rol: administrador, instructor o estudiante")
    parser.add_argument("--nombre", help="Nombre de la persona si todavía no existe")
    parser.add_argument("--correo", help="Correo de la persona (obligatorio para estudiantes)")
    parser.add_argument("--sede", type=int, help="idSede del administrador (obligatorio) o del estudiante")
    parser.add_argument("--descripcion", default="Instructor", help="Descripción del instructor")
    parser.add_argument("--sin-sede", action="store_true", help="Administrador técnico sin sede (ve todo)")
    args = parser.parse_args()
    rol = args.rol.strip().lower()
    if rol == "administrador" and not args.sede and not args.sin_sede:
        raise SystemExit(
            "Cada administrador administra una sede: agrega --sede (1 = Bello, 2 = Copacabana) "
            "o --sin-sede para la cuenta técnica."
        )
    if args.correo:
        # Misma validación que el login del portal del estudiante (EmailStr)
        try:
            args.correo = validate_email(args.correo, check_deliverability=False).normalized
        except EmailNotValidError as error:
            raise SystemExit(f"Correo no válido: {error}")

    sesion = FabricaSesion()
    try:
        id_rol = sesion.execute(
            text("SELECT idRol FROM roles WHERE lower(nombre) = :rol AND idEstado = :activo"),
            {"rol": rol, "activo": ESTADO_ACTIVO},
        ).scalar()
        if not id_rol:
            raise SystemExit(f"No existe un rol activo llamado '{args.rol}' en la tabla roles.")

        persona = sesion.execute(
            text("SELECT email FROM persona WHERE documento = :doc"), {"doc": args.documento}
        ).first()
        if not persona:
            if not args.nombre:
                raise SystemExit("La persona no existe. Agrega --nombre para crearla.")
            if rol == "estudiante" and not args.correo:
                raise SystemExit("El estudiante inicia sesión con su correo: agrega --correo.")
            _crear_persona(sesion, args)
        elif rol == "estudiante" and not persona.email:
            if not args.correo:
                raise SystemExit("La persona no tiene correo y el estudiante entra con él: agrega --correo.")
            sesion.execute(
                text("UPDATE persona SET email = :correo WHERE documento = :doc"),
                {"correo": args.correo, "doc": args.documento},
            )

        if sesion.execute(
            text("SELECT 1 FROM usuarios WHERE documento = :doc"), {"doc": args.documento}
        ).first():
            raise SystemExit("Esa persona ya tiene una cuenta.")

        clave = getpass("Clave (mínimo 8 caracteres): ")
        if len(clave) < 8 or clave != getpass("Repite la clave: "):
            raise SystemExit("Las claves no coinciden o son muy cortas.")

        sesion.execute(
            text(
                "INSERT INTO usuarios (documento, password_hash, idEstado, idSede) "
                "VALUES (:doc, :hash, :activo, :sede)"
            ),
            {
                "doc": args.documento,
                "hash": HasherArgon2().crear_hash(clave),
                "activo": ESTADO_ACTIVO,
                # Solo el administrador queda atado a una sede en su cuenta
                "sede": args.sede if rol == "administrador" else None,
            },
        )
        sesion.execute(
            text("INSERT INTO usuarios_roles (documento, idRol) VALUES (:doc, :rol)"),
            {"doc": args.documento, "rol": id_rol},
        )
        _crear_perfil(sesion, rol, args)
        sesion.commit()
        entrada = "su correo" if rol == "estudiante" else f"el documento {args.documento}"
        print(f"Cuenta de {rol} creada. Inicia sesión con {entrada}.")
    except Exception:
        sesion.rollback()
        raise
    finally:
        sesion.close()


if __name__ == "__main__":
    main()
