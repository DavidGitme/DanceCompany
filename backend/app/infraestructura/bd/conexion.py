from collections.abc import Iterator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.config.settings import obtener_configuracion

configuracion = obtener_configuracion()
motor = create_engine(
    configuracion.database_url,
    pool_pre_ping=True,
    pool_recycle=300,
)
FabricaSesion = sessionmaker(bind=motor, autoflush=False, expire_on_commit=False)


def obtener_sesion() -> Iterator[Session]:
    sesion = FabricaSesion()
    try:
        yield sesion
    finally:
        sesion.close()
