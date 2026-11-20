import sys
from pathlib import Path

# Vercel ejecuta este archivo desde backend/api: se agrega backend/ a la ruta
# para que Python encuentre el paquete "app"
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.main import app  # noqa: E402

__all__ = ["app"]
