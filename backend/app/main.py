from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.exc import IntegrityError

from app.config.settings import obtener_configuracion
from app.dominio.excepciones.errores import ErrorDominio
from app.presentacion.middlewares.errores import (
    manejar_error_dominio,
    manejar_error_integridad,
    manejar_error_validacion,
)
from app.presentacion.rutas import (
    aulas,
    auth,
    catalogos,
    catalogos_simples,
    convocatorias,
    ejemplos,
    estilos,
    grupos_competencia,
    estudiantes,
    grupos,
    horarios,
    inscripciones,
    inscripciones_taller,
    instructores,
    matriculas,
    mensualidades,
    niveles,
    noticias,
    pagos,
    portal_estudiante,
    portal_instructor,
    postulaciones,
    publico,
    reportes,
    sitio_admin,
    sedes,
    seguridad,
    talleres,
)

configuracion = obtener_configuracion()
app = FastAPI(
    title="API F&A Dance Company",
    version="1.0.0",
    docs_url="/docs",
    openapi_url="/api/v1/openapi.json",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=configuracion.origenes_permitidos,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)
app.add_exception_handler(ErrorDominio, manejar_error_dominio)
app.add_exception_handler(RequestValidationError, manejar_error_validacion)
app.add_exception_handler(IntegrityError, manejar_error_integridad)
app.include_router(auth.router, prefix="/api/v1")
app.include_router(seguridad.router, prefix="/api/v1")
app.include_router(ejemplos.router, prefix="/api/v1")
app.include_router(catalogos.router, prefix="/api/v1")
app.include_router(inscripciones.router, prefix="/api/v1")

# Módulos académicos
for modulo in (sedes, estilos, niveles, talleres, instructores, estudiantes, grupos, portal_instructor):
    app.include_router(modulo.router, prefix="/api/v1")

# Módulos administrativos: aulas y horarios, matrículas, finanzas, convocatorias y noticias
for modulo in (
    aulas, horarios, matriculas, inscripciones_taller,
    mensualidades, pagos, convocatorias, postulaciones, grupos_competencia, noticias,
):
    app.include_router(modulo.router, prefix="/api/v1")
# El instructor da el visto bueno a las matrículas de sus grupos
app.include_router(matriculas.router_instructor, prefix="/api/v1")
for router_catalogo in catalogos_simples.routers:
    app.include_router(router_catalogo, prefix="/api/v1")

# Sitio público (sin sesión) y sus módulos del panel
app.include_router(publico.router, prefix="/api/v1")
for router_sitio in sitio_admin.routers:
    app.include_router(router_sitio, prefix="/api/v1")
app.include_router(reportes.router, prefix="/api/v1")

# Portal del estudiante (login por correo y su información)
app.include_router(portal_estudiante.router, prefix="/api/v1")


@app.get("/api/v1/salud", tags=["Sistema"])
def salud():
    return {"estado": "ok"}
