from collections import defaultdict, deque
from time import monotonic

from fastapi import Request

from app.dominio.excepciones.errores import DemasiadosIntentos

intentos: dict[str, deque[float]] = defaultdict(deque)


async def limitar_inicio_sesion(request: Request):
    cliente = request.client.host if request.client else "desconocido"
    ahora = monotonic()
    ventana = intentos[cliente]
    while ventana and ahora - ventana[0] > 60:
        ventana.popleft()
    if len(ventana) >= 5:
        raise DemasiadosIntentos()
    ventana.append(ahora)
