# API REST

Base local: `http://localhost:8000/api/v1`.

## Formatos comunes

Lista:

```json
{ "datos": [], "total": 0, "pagina": 1, "tamano": 20 }
```

Error:

```json
{ "codigo": "no_autorizado", "mensaje": "No tienes permiso para realizar esta acción.", "detalles": null }
```

## Autenticación

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/auth/login` | Recibe `documento` y `clave`; entrega access token y cookie refresh. |
| POST | `/auth/refresh` | Rota la cookie refresh y entrega un access token. |
| POST | `/auth/logout` | Elimina la cookie refresh. |
| GET | `/auth/me` | Devuelve la sesión actual sin datos sensibles. |

El access token dura 20 minutos por defecto y permanece solo en memoria del
frontend. La cookie refresh es `httpOnly`, `Secure` y `SameSite=Strict`.

## Seguridad

`personas`, `usuarios`, `roles`, `permisos` y `estados` implementan:

- `GET /<recurso>`
- `GET /<recurso>/{id}`
- `POST /<recurso>`
- `PUT /<recurso>/{id}`
- `DELETE /<recurso>/{id}` como baja lógica mediante `idEstado`

Relación RBAC:

- `GET /roles/{idRol}/permisos`
- `PUT /roles/{idRol}/permisos`

Todas requieren el permiso `seguridad`.

## Módulos preparados

Existen endpoints de lista protegidos para `/estudiantes`, `/instructores`,
`/grupos`, `/matriculas`, `/pagos`, `/talleres`, `/sedes` y `/reportes`.
Actualmente devuelven una lista vacía y marcan el punto de extensión del caso
de uso y repositorio correspondiente.

FastAPI genera el contrato completo en `/docs`.
