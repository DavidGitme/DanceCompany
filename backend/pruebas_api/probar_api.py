"""Prueba de humo de la API contra un backend en ejecución (local o desplegado).

No necesita instalar nada: usa solo la librería estándar de Python.

Uso (desde la carpeta backend):
    python pruebas_api/probar_api.py
    python pruebas_api/probar_api.py --url https://mi-backend.vercel.app/api/v1
    python pruebas_api/probar_api.py --escritura

Por defecto solo LEE datos. Con --escritura crea registros de prueba ("PRUEBA API ...")
y al final los deja inactivos (el sistema no borra físicamente).
Las cuentas por defecto son las de 02_datos_iniciales.sql.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request

# ─── Cliente HTTP mínimo ───────────────────────────────


class Api:
    def __init__(self, url_base: str):
        self.url_base = url_base.rstrip("/")

    def llamar(self, metodo, ruta, token=None, cuerpo=None):
        datos = json.dumps(cuerpo).encode() if cuerpo is not None else None
        peticion = urllib.request.Request(self.url_base + ruta, data=datos, method=metodo)
        peticion.add_header("Content-Type", "application/json")
        if token:
            peticion.add_header("Authorization", f"Bearer {token}")
        inicio = time.perf_counter()
        try:
            with urllib.request.urlopen(peticion, timeout=30) as respuesta:
                codigo, texto = respuesta.status, respuesta.read().decode()
        except urllib.error.HTTPError as error:
            codigo, texto = error.code, error.read().decode()
        except (urllib.error.URLError, TimeoutError) as error:
            return 0, {"error": str(error)}, 0
        milisegundos = int((time.perf_counter() - inicio) * 1000)
        try:
            return codigo, json.loads(texto) if texto else None, milisegundos
        except json.JSONDecodeError:
            return codigo, texto, milisegundos


# ─── Registro de resultados ────────────────────────────

resultados = []


def revisar(api, nombre, metodo, ruta, esperado, token=None, cuerpo=None):
    """Hace la petición, compara el código HTTP con el esperado y lo imprime."""
    codigo, datos, ms = api.llamar(metodo, ruta, token, cuerpo)
    ok = codigo == esperado
    resultados.append(ok)
    detalle = ""
    if not ok:
        mensaje = datos.get("mensaje") or datos.get("error") or datos.get("detail") if isinstance(datos, dict) else datos
        detalle = f"  ← {str(mensaje)[:90]}"
    elif isinstance(datos, dict) and "total" in datos:
        detalle = f"  ({datos['total']} registros)"
    elif isinstance(datos, list):
        detalle = f"  ({len(datos)} registros)"
    print(f"  {'✔' if ok else '✘'} {codigo or '---':>3} (esperado {esperado}) {ms:>5} ms  {metodo:5} {ruta}{detalle}")
    return datos if ok else None


def titulo(texto):
    print(f"\n── {texto} " + "─" * max(0, 70 - len(texto)))


# ─── Pruebas ───────────────────────────────────────────

LISTADOS = [
    "/sedes", "/estilos", "/niveles", "/talleres", "/instructores", "/estudiantes", "/grupos",
    "/aulas", "/horarios", "/matriculas", "/mensualidades", "/pagos", "/metodos-pago",
    "/noticias", "/convocatorias", "/tipos-convocatoria", "/postulaciones",
    "/inscripciones-taller", "/estados", "/roles", "/permisos", "/personas", "/usuarios",
]
DISPONIBLES = [
    "/sedes", "/estilos", "/niveles", "/talleres", "/instructores", "/estudiantes", "/grupos",
    "/aulas", "/matriculas", "/mensualidades", "/metodos-pago", "/convocatorias", "/tipos-convocatoria",
]


def iniciar_sesion(api, documento, clave, rol):
    datos = revisar(api, "login", "POST", "/auth/login", 200, cuerpo={"documento": documento, "clave": clave})
    if not datos:
        return None
    roles = datos["usuario"]["roles"]
    print(f"      usuario: {datos['usuario']['nombre']} · roles: {roles} · permisos: {len(datos['usuario']['permisos'])}")
    if rol not in roles:
        print(f"  ✘ se esperaba el rol '{rol}'")
        resultados.append(False)
    return datos["accessToken"]


def main():
    parser = argparse.ArgumentParser(description="Prueba de humo de la API de DanceFlow")
    parser.add_argument("--url", default="http://localhost:8000/api/v1")
    parser.add_argument("--admin", default="1000000001", help="documento del administrador de una sede")
    parser.add_argument("--admin2", default="1000000010", help="documento del administrador de la otra sede")
    parser.add_argument("--instructor", default="1000000002", help="documento del instructor")
    parser.add_argument("--estudiante", default="julian.rojas@mail.com", help="correo del estudiante")
    parser.add_argument("--clave", default="Dance2026*", help="clave de las cuentas de prueba")
    parser.add_argument("--escritura", action="store_true", help="crea e inactiva registros de prueba")
    args = parser.parse_args()
    api = Api(args.url)

    print(f"Probando {args.url}  ({'lectura y escritura' if args.escritura else 'solo lectura'})")

    titulo("1. Conexión")
    if revisar(api, "salud", "GET", "/salud", 200) is None:
        print("\n  El backend no responde. ¿Está corriendo uvicorn o es correcta la URL?")
        sys.exit(1)
    revisar(api, "openapi", "GET", "/openapi.json", 200)

    titulo("2. Login del administrador (lee usuarios en la base de datos)")
    admin = iniciar_sesion(api, args.admin, args.clave, "administrador")
    if not admin:
        print("\n  Sin login no se puede seguir. Revisa DATABASE_URL, MODO_MOCK=false y los datos iniciales.")
        sys.exit(1)

    titulo("3. Listados (consultas a la base de datos)")
    for ruta in LISTADOS:
        revisar(api, ruta, "GET", ruta, 200, admin)
    revisar(api, "tipos de grupo", "GET", "/grupos/tipos", 200, admin)
    revisar(api, "noticias públicas", "GET", "/noticias/publicas", 200)

    titulo("4. Selectores /disponibles (solo activos)")
    for ruta in DISPONIBLES:
        revisar(api, ruta, "GET", f"{ruta}/disponibles", 200, admin)

    titulo("5. Reglas y validaciones (no guardan nada)")
    revisar(api, "sin token", "GET", "/estilos", 401)
    revisar(api, "no existe", "GET", "/estilos/999999", 404, admin)
    estilos = api.llamar("GET", "/estilos/disponibles", admin)[1] or []
    if estilos:
        # Mismo nombre en mayúsculas: debe chocar sin importar mayúsculas ni tildes
        revisar(api, "duplicado", "POST", "/estilos", 409, admin, {"nombre": estilos[0]["nombre"].upper()})
    revisar(api, "edades", "POST", "/niveles", 400, admin,
            {"nombre": "PRUEBA edades", "orden": 9999, "edadMin": 15, "edadMax": 10})
    revisar(api, "formato", "POST", "/estilos", 422, admin, {"nombre": ""})

    # Un registro de otra sede responde 404 para no revelar que existe
    titulo("5b. Alcance por sede (cada administrador solo ve y cambia su sede)")
    admin2 = iniciar_sesion(api, args.admin2, args.clave, "administrador")
    if admin2:
        propios = api.llamar("GET", "/estudiantes?tamano=100", admin)[1] or {"datos": []}
        ajenos = api.llamar("GET", "/estudiantes?tamano=100", admin2)[1] or {"datos": []}
        sedes_propias = {e["idSede"] for e in propios["datos"]}
        sedes_ajenas = {e["idSede"] for e in ajenos["datos"]}
        separadas = len(sedes_propias) <= 1 and len(sedes_ajenas) <= 1 and not (sedes_propias & sedes_ajenas)
        print(f"  {'✔' if separadas else '✘'} listas de estudiantes separadas por sede: {sedes_propias} / {sedes_ajenas}")
        resultados.append(separadas)
        if ajenos["datos"] and sedes_ajenas:
            otro = ajenos["datos"][0]
            otra_sede = next(iter(sedes_ajenas))
            revisar(api, "estudiante de otra sede", "GET", f"/estudiantes/{otro['idEstudiante']}", 404, admin)
            revisar(api, "inactivar de otra sede", "PATCH", f"/estudiantes/{otro['idEstudiante']}/estado",
                    404, admin, {"idEstado": 2})
            revisar(api, "filtro de otra sede", "GET", f"/matriculas?sede={otra_sede}", 403, admin)
            revisar(api, "pagos de alumno ajeno", "GET", f"/pagos?estudiante={otro['idEstudiante']}", 404, admin)
        revisar(api, "crear sede con cuenta de sede", "POST", "/sedes", 403, admin, {"nombre": "PRUEBA sede"})
        revisar(api, "dar rol administrador", "POST", "/usuarios", 403, admin,
                {"documento": "00000000", "clave": "Prueba2026*", "roles": [1]})
        revisar(api, "inactivar al otro admin", "DELETE", f"/usuarios/{args.admin2}", 404, admin)
        revisar(api, "crear rol con cuenta de sede", "POST", "/roles", 403, admin, {"nombre": "PRUEBA rol"})
        revisar(api, "cambiar matriz de permisos", "PUT", "/roles/2/permisos", 403, admin, {"permisos": [1]})

    titulo("6. Portal del instructor")
    instructor = iniciar_sesion(api, args.instructor, args.clave, "instructor")
    if instructor:
        revisar(api, "perfil", "GET", "/portal-instructor/perfil", 200, instructor)
        revisar(api, "grupos", "GET", "/portal-instructor/grupos", 200, instructor)
        revisar(api, "estudiantes", "GET", "/portal-instructor/estudiantes", 200, instructor)
        revisar(api, "sin permiso", "GET", "/estilos", 403, instructor)
    revisar(api, "admin no es instructor", "GET", "/portal-instructor/grupos", 403, admin)

    titulo("7. Portal del estudiante")
    datos = revisar(api, "login", "POST", "/portal-estudiante/login", 200,
                    cuerpo={"correo": args.estudiante, "clave": args.clave})
    if datos:
        estudiante = datos["accessToken"]
        for ruta in ["/perfil", "/clases", "/finanzas", "/talleres", "/convocatorias"]:
            revisar(api, ruta, "GET", f"/portal-estudiante{ruta}", 200, estudiante)

    if args.escritura:
        titulo("8. Escritura (crea, edita e inactiva registros de prueba)")
        marca = time.strftime("%H%M%S")
        for ruta, cuerpo, cambio, clave_id in [
            ("/estilos", {"nombre": f"PRUEBA API {marca}"}, {"nombre": f"PRUEBA API {marca} editado"}, "idEstilo"),
            ("/talleres", {"descripcion": f"PRUEBA API {marca}", "valor": 1000}, {"valor": 2000}, "idTaller"),
        ]:
            creado = revisar(api, "crear", "POST", ruta, 201, admin, cuerpo)
            if creado:
                identificador = creado[clave_id]
                revisar(api, "editar", "PUT", f"{ruta}/{identificador}", 200, admin, cambio)
                revisar(api, "inactivar", "PATCH", f"{ruta}/{identificador}/estado", 200, admin, {"idEstado": 2})

        titulo("9. Seguridad (persona → cuenta → login → desactivar)")
        # El backend acepta 5 inicios de sesión por minuto desde la misma IP
        print("      esperando 60 s por el límite de inicios de sesión...")
        time.sleep(61)
        documento = "99" + time.strftime("%H%M%S")
        persona = revisar(api, "crear persona", "POST", "/personas", 201, admin,
                          {"nombre": f"PRUEBA API {marca}", "documento": documento})
        roles = api.llamar("GET", "/roles?tamano=100", admin)[1] or {"datos": []}
        rol = next((r for r in roles["datos"] if r["nombre"].lower() == "instructor"), None)
        if persona and rol:
            revisar(api, "crear cuenta", "POST", "/usuarios", 201, admin,
                    {"documento": documento, "clave": "Prueba2026*", "roles": [rol["idRol"]]})
            revisar(api, "cuenta repetida", "POST", "/usuarios", 409, admin,
                    {"documento": documento, "clave": "Prueba2026*", "roles": [rol["idRol"]]})
            revisar(api, "login nuevo", "POST", "/auth/login", 200,
                    cuerpo={"documento": documento, "clave": "Prueba2026*"})
            revisar(api, "desactivar cuenta", "DELETE", f"/usuarios/{documento}", 200, admin)
            revisar(api, "login desactivado", "POST", "/auth/login", 401,
                    cuerpo={"documento": documento, "clave": "Prueba2026*"})
            revisar(api, "desactivar persona", "DELETE", f"/personas/{persona['idPersona']}", 200, admin)
        if rol:
            revisar(api, "cuenta sin persona", "POST", "/usuarios", 400, admin,
                    {"documento": "00000000", "clave": "Prueba2026*", "roles": [rol["idRol"]]})

    total, buenos = len(resultados), sum(resultados)
    print("\n" + "═" * 72)
    print(f"  Resultado: {buenos}/{total} pruebas correctas" + ("  ✔ todo bien" if buenos == total else f"  ✘ {total - buenos} fallaron"))
    print("═" * 72)
    sys.exit(0 if buenos == total else 1)


if __name__ == "__main__":
    main()
