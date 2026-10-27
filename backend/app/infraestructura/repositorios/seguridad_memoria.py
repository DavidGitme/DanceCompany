from copy import deepcopy
from typing import Any

from app.dominio.repositorios.repositorio_seguridad import RepositorioSeguridad


class RepositorioSeguridadMemoria(RepositorioSeguridad):
    claves = {
        "personas": "idPersona",
        "usuarios": "documento",
        "roles": "idRol",
        "permisos": "idPermiso",
        "estados": "idEstado",
    }

    def __init__(self, password_hash: str):
        self.datos: dict[str, list[dict[str, Any]]] = {
            "estados": [
                {"idEstado": 1, "nombre": "Activo", "categoria": "general", "descripcion": "Registro activo."},
                {"idEstado": 2, "nombre": "Inactivo", "categoria": "general", "descripcion": "Registro inactivo."},
                {"idEstado": 8, "nombre": "Activo", "categoria": "usuario", "descripcion": "Cuenta activa."},
            ],
            "permisos": [
                {"idPermiso": i + 1, "descripcion": permiso}
                for i, permiso in enumerate(
                    ["dashboard", "estudiantes", "instructores", "grupos", "matriculas", "pagos", "talleres", "sedes", "reportes", "landing", "seguridad"]
                )
            ],
            "roles": [
                {"idRol": 1, "nombre": "administrador", "idEstado": 1, "permisos": list(range(1, 12))}
            ],
            "personas": [
                {
                    "idPersona": 1,
                    "nombre": "Andrea Salazar",
                    "documento": "1234567890",
                    "telefono": "3001234567",
                    "email": "asalazar@fanda.co",
                    "fecha_nacimiento": "1990-05-15",
                    "idEstado": 1,
                }
            ],
            "usuarios": [
                {
                    "documento": "1234567890",
                    "username": "asalazar",
                    "password_hash": password_hash,
                    "idEstado": 8,
                    "roles": [1],
                }
            ],
        }

    def listar(self, recurso: str, pagina: int, tamano: int):
        registros = self.datos[recurso]
        inicio = (pagina - 1) * tamano
        return deepcopy(registros[inicio : inicio + tamano]), len(registros)

    def obtener(self, recurso: str, identificador: int | str):
        clave = self.claves[recurso]
        return deepcopy(next((r for r in self.datos[recurso] if r[clave] == identificador), None))

    def crear(self, recurso: str, datos: dict[str, Any]):
        clave = self.claves[recurso]
        if recurso == "usuarios":
            registro = dict(datos)
        else:
            identificador = max((int(r[clave]) for r in self.datos[recurso]), default=0) + 1
            registro = {**datos, clave: identificador}
        self.datos[recurso].append(registro)
        return deepcopy(registro)

    def actualizar(self, recurso: str, identificador: int | str, datos: dict[str, Any]):
        clave = self.claves[recurso]
        for indice, registro in enumerate(self.datos[recurso]):
            if registro[clave] == identificador:
                self.datos[recurso][indice] = {**registro, **datos, clave: identificador}
                return deepcopy(self.datos[recurso][indice])
        return None

    def inactivar(self, recurso: str, identificador: int | str):
        registro = self.obtener(recurso, identificador)
        if not registro:
            return None
        if "idEstado" in registro:
            registro["idEstado"] = 2
            return self.actualizar(recurso, identificador, registro)
        return registro

    def buscar_usuario_por_documento(self, documento: str):
        persona = next((p for p in self.datos["personas"] if p["documento"] == documento), None)
        if not persona:
            return None
        usuario = next((u for u in self.datos["usuarios"] if u["documento"] == documento), None)
        return {**deepcopy(usuario), "nombre": persona["nombre"]} if usuario else None

    def permisos_de_roles(self, roles: list[int]):
        roles_encontrados = [r for r in self.datos["roles"] if r["idRol"] in roles]
        ids = {permiso for rol in roles_encontrados for permiso in rol["permisos"]}
        permisos = [p["descripcion"] for p in self.datos["permisos"] if p["idPermiso"] in ids]
        return [r["nombre"] for r in roles_encontrados], permisos

    def asignar_permisos_rol(self, id_rol: int, permisos: list[int]):
        rol = self.obtener("roles", id_rol)
        if not rol:
            return []
        rol["permisos"] = permisos
        self.actualizar("roles", id_rol, rol)
        return permisos
