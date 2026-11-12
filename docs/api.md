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

## Módulos académicos

`sedes`, `estilos`, `niveles`, `talleres`, `instructores`, `estudiantes` y `grupos`
comparten el mismo contrato:

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/<modulo>` | Lista paginada. Filtros: `estado`, `buscar` (sin mayúsculas ni tildes), `pagina`, `tamano`. |
| GET | `/<modulo>/disponibles` | Solo activos, sin paginar, para selectores. |
| GET | `/<modulo>/{id}` | Detalle. `404` con mensaje del módulo (ej. "Estilo no encontrado"). |
| POST | `/<modulo>` | Crea el registro activo. `201`, o `409` si el nombre ya existe. |
| PUT | `/<modulo>/{id}` | Edita. Los campos que no se envían conservan su valor. `409` si choca con otro registro. |
| PATCH | `/<modulo>/{id}/estado` | Recibe `{ "idEstado": 2 }`. No hay borrado físico. |

Filtros adicionales:

- `instructores`: `sede`.
- `estudiantes`: `sede`, `grupo`.
- `grupos`: `sede`, `nivel`, `estilo`, `instructor`; apoyo para el formulario en
  `GET /grupos/tipos` y `GET /grupos/aulas?sede=`.

Reglas principales:

- Nombre único sin distinguir mayúsculas ni tildes en estilos, sedes, niveles y
  grupos (por sede). Niveles valida además `orden` único y `edadMax > edadMin`.
- Estilos, sedes, niveles e instructores devuelven `gruposActivos` para advertir
  antes de inactivarlos.
- Un grupo solo acepta nivel, estilo, sede, instructor y aula activos; el aula debe
  ser de la sede, la capacidad no puede superar la del aula y el instructor debe
  estar asignado a la sede.
- Un instructor no puede quitar una sede donde tiene grupos activos.

Permisos: cada módulo exige el permiso con su mismo nombre. `/estilos/disponibles`,
`/niveles/disponibles`, `/sedes/disponibles` y `/talleres/disponibles` solo piden
sesión, porque los usa la Oferta académica de estudiantes y acudientes.

Códigos de error: `400` regla de negocio, `404` no encontrado, `409` duplicado,
`422` datos con formato inválido.

## Módulos preparados

`/matriculas`, `/pagos` y `/reportes` todavía devuelven una lista vacía.

FastAPI genera el contrato completo en `/docs`.
