# F&A Dance Company

Monorepo de DanceFlow para la landing pública y la operación de la academia.

## Estructura

- `frontend/`: React 19, TypeScript, Vite y Tailwind CSS v4.
- `backend/`: FastAPI con arquitectura limpia, JWT, RBAC y SQL Server.
- `docs/`: decisiones de arquitectura, API y flujo de Git.

## Inicio rápido

### Frontend

```bash
cp frontend/.env.example frontend/.env
pnpm install
pnpm dev
```

El modo mock está activo por defecto. Para usar la API real, configure
`VITE_USAR_MOCK=false` y `VITE_API_URL`.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

La documentación OpenAPI queda disponible en `http://localhost:8000/docs`.

## Figma Make

Figma Make no puede ejecutar Python. La carpeta `backend/` se genera como
código exportable para GitHub y debe ejecutarse localmente en VS Code o
desplegarse como un proyecto independiente en Vercel. La vista previa de Make
continúa funcionando con `VITE_USAR_MOCK=true`.

## Despliegue en Vercel

Configure dos proyectos desde el mismo repositorio:

1. **Frontend**: directorio raíz `frontend/`, preset Vite.
2. **Backend**: directorio raíz `backend/`, runtime Python.

Las variables necesarias están documentadas en los archivos `.env.example`.
