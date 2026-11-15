"""Crea una cuenta de acceso en la base de datos (por ejemplo, el primer administrador).

Uso, desde la carpeta backend:
    python -m app.herramientas.crear_cuenta --documento 1234567890 --rol administrador --nombre "Andrea Salazar"

Si la persona no existe y se indica --nombre, también la crea. La clave se pide por consola.
"""

import argparse
from getpass import getpass

from sqlalchemy import text

from app.dominio.reglas import ESTADO_ACTIVO
from app.infraestructura.bd.conexion import FabricaSesion
from app.infraestructura.seguridad.hash_claves import HasherArgon2


def main():
    parser = argparse.ArgumentParser(description="Crea un usuario con un rol")
    parser.add_argument("--documento", required=True)
    parser.add_argument("--rol", required=True, help="Nombre del rol, ej. administrador")
    parser.add_argument("--nombre", help="Nombre de la persona si todavía no existe")
    args = parser.parse_args()

    sesion = FabricaSesion()
    try:
        id_rol = sesion.execute(
            text("SELECT idRol FROM roles WHERE lower(nombre) = lower(:rol)"), {"rol": args.rol}
        ).scalar()
        if not id_rol:
            raise SystemExit(f"No existe el rol '{args.rol}' en la tabla roles.")

        existe_persona = sesion.execute(
            text("SELECT 1 FROM persona WHERE documento = :doc"), {"doc": args.documento}
        ).first()
        if not existe_persona:
            if not args.nombre:
                raise SystemExit("La persona no existe. Agrega --nombre para crearla.")
            sesion.execute(
                text(
                    "INSERT INTO persona (nombre, idTipoDocumento, documento, idEstado) "
                    "VALUES (:nombre, (SELECT MIN(idTipoDocumento) FROM tipo_documento), :doc, :activo)"
                ),
                {"nombre": args.nombre, "doc": args.documento, "activo": ESTADO_ACTIVO},
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
                "INSERT INTO usuarios (documento, password_hash, idEstado) "
                "VALUES (:doc, :hash, :activo)"
            ),
            {"doc": args.documento, "hash": HasherArgon2().crear_hash(clave), "activo": ESTADO_ACTIVO},
        )
        sesion.execute(
            text("INSERT INTO usuarios_roles (documento, idRol) VALUES (:doc, :rol)"),
            {"doc": args.documento, "rol": id_rol},
        )
        sesion.commit()
        print(f"Cuenta creada. Inicia sesión con el documento {args.documento}.")
    finally:
        sesion.close()


if __name__ == "__main__":
    main()
