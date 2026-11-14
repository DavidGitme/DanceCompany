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

## Módulos administrativos

Usan el mismo formato de lista, los filtros `buscar`, `pagina` y `tamano`, y los
mismos códigos de error que los módulos académicos.

| Ruta | Tabla | Permiso | Estado / borrado |
| --- | --- | --- | --- |
| `/aulas` | `aula` | `aulas` | `PATCH /{id}/estado` (Activo/Inactivo) |
| `/horarios` | `horario` | `horarios` | Sin estado: `DELETE /{id}` |
| `/matriculas` | `matricula` | `matriculas` | `PATCH /{id}/estado` (Activo/Inactivo) |
| `/inscripciones-taller` | `inscripcion_talle` | `talleres` | `DELETE /{id}` anula la inscripción y su pago |
| `/mensualidades` | `mensualidad` | `pagos` | `PATCH /{id}/estado` (Pendiente, Pagada, Vencida, Mora) |
| `/pagos` | `pago` | `pagos` | `DELETE /{id}` anula el pago |
| `/metodos-pago` | `metodo_pago` | `pagos` | `DELETE /{id}` solo si no tiene pagos |
| `/tipos-convocatoria` | `tipo_convocatoria` | `convocatorias` | `DELETE /{id}` solo si no se usa |
| `/convocatorias` | `convocatoria` | `convocatorias` | `DELETE /{id}` solo sin postulados ni grupo de competencia |
| `/postulaciones` | `convocatoria_estudiante` | `convocatorias` | `PATCH /{id}/estado` (Postulado, Aceptado, Rechazado); `DELETE` solo si sigue Postulado |
| `/tipos-noticia` | `tipo_noticia` | `noticias` | `DELETE /{id}` solo si no se usa |
| `/noticias` | `noticia` | `noticias` | `PATCH /{id}/estado` (Disponible, Expirada) |

Todas tienen `GET /`, `GET /{id}`, `POST /` y `PUT /{id}`. En `PUT` los campos que
no se envían conservan su valor. `PATCH /estado` solo acepta estados de la
categoría del módulo (por ejemplo, una mensualidad no acepta `Activo`).

Filtros y rutas de apoyo:

- `aulas`: `estado`, `sede`; `GET /aulas/disponibles?sede=`.
- `horarios`: `grupo`, `sede`, `instructor`, `aula`, `dia` (acepta `miércoles`, `SABADO`...).
  Ordena de lunes a domingo.
- `matriculas`: `estado`, `estudiante`, `grupo`, `sede`; `GET /matriculas/disponibles`.
  Devuelve `valorPagado`, `saldo` y `mensualidades`.
- `inscripciones-taller`: `estudiante`, `taller`; `GET /inscripciones-taller/acudientes?estudiante=`.
- `mensualidades`: `estado`, `matricula`, `estudiante`, `grupo`, `periodo` (`AAAA-MM`);
  `GET /mensualidades/disponibles` (con saldo) y `POST /mensualidades/actualizar-vencidas`.
- `pagos`: `tipo` (`mensualidad`, `matricula`, `taller`), `acudiente`, `metodo`, `estudiante`,
  `mensualidad`, `matricula`, `desde`, `hasta`; `GET /pagos/acudientes?estudiante=`.
- `convocatorias`: `tipo`, `vigencia` (`proxima`, `abierta`, `cerrada`, calculada con las
  fechas); `GET /convocatorias/disponibles` (abiertas).
- `postulaciones`: `estado`, `convocatoria`, `estudiante`.
- `noticias`: `estado`, `tipo`; `POST /noticias/actualizar-expiradas`.
- `GET /noticias/publicas?tipo=&limite=` **no pide sesión**: lo usa la landing.
- `GET /metodos-pago/disponibles`, `/tipos-convocatoria/disponibles` y
  `/tipos-noticia/disponibles` solo piden sesión.

Reglas principales:

- **Aulas**: la sede debe estar activa; un aula con grupos no cambia de sede ni puede
  quedar con menos capacidad que sus grupos activos.
- **Horarios**: `hora_fin > hora_inicio`; el grupo debe estar activo; no se cruza con
  otra clase del mismo grupo ni con otro grupo activo en la misma aula.
- **Matrículas**: estudiante y grupo activos, de la misma sede; la edad del estudiante
  debe estar en el rango del nivel; sin matrícula activa repetida en el grupo y con
  cupo disponible (también al reactivar). Con mensualidades o pagos no cambia de
  estudiante. Sin borrado físico: Inactivo conserva el historial.
- **Mensualidades**: nacen Pendiente; una por matrícula y mes (`fecha_pago` es la fecha
  de cobro del periodo); `fecha_limite >= fecha_pago`. Pasan a Pagada solas cuando los
  pagos cubren el valor y vuelven a Pendiente/Vencida si se anula un pago.
- **Pagos**: se indica `idMensualidad` **o** `idMatricula`. El monto por defecto es el
  saldo; se permiten abonos sin superarlo. Paga un acudiente responsable del
  estudiante; si `idAcudiente` va vacío, paga el propio estudiante (solo mayor de
  edad) y se registra como su propio acudiente. Al editar solo cambian `fecha_pago`
  e `idMetodo`. Los pagos de talleres se anulan desde inscripciones.
- **Inscripciones a talleres**: taller y estudiante activos, sin repetir; crea el pago
  con el valor del taller y las mismas reglas de quién paga.
- **Convocatorias / postulaciones**: `fecha_fin >= fecha_inicio`, nombre único; solo se
  postula a convocatorias abiertas y una vez por estudiante.
- **Noticias**: nacen Disponible; `fecha_expiracion` posterior a la publicación. Una
  noticia vencida no se vuelve a publicar sin ampliar su fecha. Las fechas usan el
  reloj de la base de datos (sin zona, igual que la semilla).

Los permisos `convocatorias` y `noticias` vienen en `02_datos_iniciales.sql`; en una
base ya creada se agregan con `bd/04_permisos_modulos_administrativos.sql`.

## Módulos preparados

`/reportes` todavía devuelve una lista vacía.

FastAPI genera el contrato completo en `/docs`.
