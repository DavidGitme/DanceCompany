"""Pruebas de ataque al alcance por sede (revisión de seguridad del 24/11/2026).

Reproduce cada hallazgo de la revisión independiente; todos deben quedar bloqueados.
Usa las cuentas de bd/02_datos_iniciales.sql y CREA registros: correr sobre una base
de prueba recién cargada, nunca sobre la de producción.

    python pruebas_api/probar_alcance_sede.py --url http://localhost:8000/api/v1
"""
import argparse
import json
import urllib.request

parser = argparse.ArgumentParser()
parser.add_argument("--url", default="http://localhost:8000/api/v1")
API = parser.parse_args().url.rstrip("/")
def call(m, ruta, tok=None, body=None, raw=None, ctype="application/json"):
    data = raw if raw is not None else (json.dumps(body).encode() if body is not None else None)
    h = {**({"Content-Type": ctype} if ctype else {}), **({"Authorization":"Bearer "+tok} if tok else {})}
    req=urllib.request.Request(API+ruta, method=m, data=data, headers=h)
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read() or b"null")
    except urllib.error.HTTPError as e:
        try: return e.code, json.loads(e.read() or b"null")
        except Exception: return e.code, None
def login(doc, clave="Dance2026*"): return call("POST","/auth/login",body={"documento":doc,"clave":clave})[1]["accessToken"]
B=login("1000000001")
res=[]
def esperar(nombre, r, buenos):
    ok = r[0] in buenos; res.append(ok)
    print(("✔" if ok else "✘"), f"{nombre:62} {r[0]}  {json.dumps(r[1],ensure_ascii=False)[:90] if not ok else ''}")

print("C1 · escalamiento con roles y cuentas")
esperar("crear rol", call("POST","/roles",B,{"nombre":"Todo"}), [403])
esperar("renombrar rol Instructor a 'administrador'", call("PUT","/roles/2",B,{"nombre":"administrador"}), [403])
esperar("dar todos los permisos al rol Instructor", call("PUT","/roles/2/permisos",B,{"permisos":list(range(1,18))}), [403])
esperar("inactivar rol Estudiante", call("DELETE","/roles/3",B), [403])
call("POST","/personas",B,{"nombre":"Cuenta Prueba","documento":"9990000001"})
esperar("cuenta con rol Acudiente (permiso pagos)", call("POST","/usuarios",B,{"documento":"9990000001","clave":"Prueba2026*","roles":[4]}), [201])
A=login("9990000001","Prueba2026*")
esperar("  esa cuenta no ve pagos de ninguna sede", call("GET","/pagos",A), [403])
esperar("  ni estudiantes de Copacabana", call("GET","/estudiantes?sede=2",A), [403])
esperar("asignar rol Administrador a una cuenta", call("PUT","/usuarios/9990000001",B,{"idEstado":1,"roles":[1,4]}), [403])

print("C2 · ids como texto o decimal en el cuerpo")
base={"nombre":"Ataque Texto","idTipoDocumento":1,"documento":"55500011","telefono":"3001112233","fecha_nacimiento":"1990-01-01"}
esperar('inscribir con "idSede":"2"', call("POST","/inscripciones",B,{**base,"idSede":"2"}), [403])
esperar('inscribir con "idSede":2.0', call("POST","/inscripciones",B,{**base,"idSede":2.0}), [403])
esperar('matrícula con "idGrupo":"17"', call("POST","/matriculas",B,{"idEstudiante":"1","idGrupo":"17","valor_matricula":1}), [404])
esperar('matrícula con "idEstudiante":"4"', call("POST","/matriculas",B,{"idEstudiante":"4","idGrupo":"1","valor_matricula":1}), [404])
esperar("cuerpo sin Content-Type", call("POST","/matriculas",B,raw=json.dumps({"idEstudiante":4,"idGrupo":9,"valor_matricula":1}).encode(), ctype=None), [404,415,422])

print("C3 · ids con + o espacio en la ruta y en filtros")
for ruta in ["/estudiantes/%2B4","/estudiantes/%2B4/acudientes","/grupos/%2B17","/pagos/%2B5"]:
    esperar(f"GET {ruta}", call("GET",ruta,B), [404])
esperar("PATCH /estudiantes/%2B4/estado", call("PATCH","/estudiantes/%2B4/estado",B,{"idEstado":2}), [404])
esperar("GET /pagos/acudientes?estudiante=%2B4", call("GET","/pagos/acudientes?estudiante=%2B4",B), [404])
esperar("GET /pagos/acudientes?estudiante=%204", call("GET","/pagos/acudientes?estudiante=%204",B), [404])
esperar("GET /grupos/aulas?sede=%2B2", call("GET","/grupos/aulas?sede=%2B2",B), [403])

print("A1 · personas y cuentas de la otra sede")
st,lista=call("GET","/personas?tamano=100",B)
docs={p["documento"] for p in lista["datos"]}
ok = "1000000009" not in docs and "1000000007" not in docs and "1000000010" not in docs and "1000000004" in docs
res.append(ok); print(("✔" if ok else "✘"), f"{'lista de personas solo de Bello (o sin vínculos)':62} {sorted(docs)}")
esperar("GET /personas/7 (estudiante de Copacabana)", call("GET","/personas/7",B), [404])
esperar("PUT /personas/7", call("PUT","/personas/7",B,{"nombre":"X","documento":"1000000007"}), [404])
esperar("PUT /usuarios/1000000007 (cuenta de Copacabana)", call("PUT","/usuarios/1000000007",B,{"idEstado":2,"roles":[3]}), [404])
st,us=call("GET","/usuarios?tamano=100",B)
ok = all(u["documento"] not in ("1000000007","1000000010") for u in us["datos"]); res.append(ok)
print(("✔" if ok else "✘"), "lista de usuarios sin cuentas de Copacabana ni administradores")

print("A2 · búsqueda de personas para acudiente")
esperar("buscar alumna de Copacabana (1000000009)", call("GET","/inscripciones/personas?documento=1000000009",B), [404])
esperar("buscar a la admin de Copacabana", call("GET","/inscripciones/personas?documento=1000000010",B), [404])
r=call("GET","/inscripciones/personas?documento=1000000006",B)
ok = r[0]==200 and "telefono" not in r[1]; res.append(ok); print(("✔" if ok else "✘"), "acudiente válida sin teléfono en la respuesta", r[1])
esperar("vincular a la admin (idPersona 10) como acudiente", call("POST","/estudiantes/1/acudientes",B,{"idPersona":10,"idParentesco":1}), [400])

print("A3 · instructor solo de la otra sede")
C=login("1000000010")
call("POST","/instructores",C,{"nombre":"Instructor Copa","idTipoDocumento":1,"documento":"77700011","descripcion":"Breaking","sedes":[2]})
st,ins=call("GET","/instructores?tamano=100",B)
solo_copa=[i for i in ins["datos"] if [s["idSede"] for s in i["sedes"]]==[2]]
if solo_copa:
    i=solo_copa[0]["idInstructor"]
    esperar(f"PUT nombre del instructor {i} (solo Copacabana)", call("PUT",f"/instructores/{i}",B,{"nombre":"Cambiado"}), [404])
    esperar(f"PUT solo agregar Bello al instructor {i}", call("PUT",f"/instructores/{i}",B,{"sedes":[1,2]}), [200])
else:
    print("  (no hay instructor solo de Copacabana en la semilla)")

print("M1 · vencidas por sede")
esperar("actualizar-vencidas (solo su sede)", call("POST","/mensualidades/actualizar-vencidas",B), [200])

print("M4 · login con puntos")
r=call("POST","/auth/login",body={"documento":"1.000.000.010","clave":"Dance2026*"}); res.append(r[0]==200)
print(("✔" if r[0]==200 else "✘"), "login con documento con puntos", r[0])
print(f"\nResultado: {sum(res)}/{len(res)}")
