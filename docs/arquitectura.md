# Arquitectura

## Vista general

```text
Navegador
   |
   v
frontend/modulos ---> frontend/compartido
       |                    ^
       v                    |
frontend/nucleo/http -------+
       |
       v
backend/presentacion
       |
       v
backend/aplicacion
       |
       v
backend/dominio <--- backend/infraestructura
                         |
                         v
                  SQL Server academia_v2
```

## Reglas de dependencia

Backend:

```text
presentacion -> aplicacion -> dominio
infraestructura -----------^
```

- `dominio` no importa frameworks ni adaptadores.
- `infraestructura` implementa los puertos definidos por `dominio`.
- `presentacion` nunca devuelve entidades ni filas de base de datos.

Frontend:

- `modulos/` puede importar de `compartido/` y `nucleo/`.
- Un módulo solo puede consumir otro módulo mediante su `index.ts`.
- `compartido/` nunca importa desde `modulos/`.
- Solo `servicios/` llama a `clienteHttp`.
- Componentes y páginas consumen modelos; los mappers aíslan los DTO.

## Cómo agregar un módulo nuevo

### Frontend

1. Cree `frontend/src/modulos/<nombre>/`.
2. Añada `componentes`, `paginas`, `hooks`, `servicios`, `dtos` y `datos`.
3. Defina DTO y mappers `dtoAModelo` y `modeloADto`.
4. Centralice REST o mock en `<nombre>Servicio.ts`.
5. Exponga únicamente la API necesaria desde `index.ts`.
6. Agregue el permiso al guard y al menú.
7. Verifique con `pnpm build`.

### Backend

1. Modele reglas y puertos en `dominio`.
2. Cree DTO Pydantic en `aplicacion/dtos`.
3. Añada un caso de uso `verbo_sustantivo.py`.
4. Implemente el puerto en `infraestructura/repositorios`.
5. Exponga rutas plurales bajo `/api/v1`.
6. Proteja cada ruta con `requiere_permiso("<modulo>")`.
7. Añada pruebas por capa y actualice `docs/api.md`.
