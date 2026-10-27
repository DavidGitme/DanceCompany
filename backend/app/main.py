from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from app.config.settings import obtener_configuracion
from app.dominio.excepciones.errores import ErrorDominio
from app.presentacion.middlewares.errores import (
    manejar_error_dominio,
    manejar_error_validacion,
)
from app.presentacion.rutas import auth, ejemplos, seguridad

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
app.include_router(auth.router, prefix="/api/v1")
app.include_router(seguridad.router, prefix="/api/v1")
app.include_router(ejemplos.router, prefix="/api/v1")


@app.get("/api/v1/salud", tags=["Sistema"])
def salud():
    return {"estado": "ok"}
