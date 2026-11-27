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

La respuesta del login, del refresh y de `/auth/me` incluye `idSede` y `sede`: la sede
que administra la cuenta (`usuarios.idSede`), o `null` si no tiene una.

## Un administrador por sede

Cada sede (Bello y Copacabana) tiene su administrador. La sede viaja en el token
(`"sede"`) y el backend la aplica en todas las rutas del panel
(`presentacion/dependencias/sede.py`):

| Caso | Respuesta |
| --- | --- |
| Lista sin `?sede=` | Se filtra sola por la sede de la cuenta. |
| `?sede=` o `idSede` en el cuerpo de otra sede | `403` (las sedes son públicas) |
| Registro de otra sede por ruta (`/{id}`), filtro (`?estudiante=`, `?grupo=`...) o cuerpo (`idGrupo`, `idEstudiante`, `idAula`, `idMatricula`, `idMensualidad`) | `404` (no revela que existe) |
| `POST /sedes` | `403` |
| Personas y usuarios | Solo los de su sede (estudiantes, instructores con su sede, acudientes de sus estudiantes) o sin vínculos; nunca administradores |
| Roles asignables al crear o editar cuentas | Solo Instructor, Estudiante y Acudiente (`403` con otro) |
| Escribir en `/roles`, `/permisos` o `/estados` | `403`: solo la cuenta técnica |
| Cuenta sin sede que no es administradora (rol con permisos del módulo) | `403` en todas las rutas por sede |

Los ids se leen igual que FastAPI (`"2"`, `2.0` y `+2` valen 2), así el control revisa el
mismo valor que llega al caso de uso. Las pruebas de ataque están en
`pruebas_api/probar_alcance_sede.py`.

Recursos por sede: estudiantes, grupos, aulas, horarios, matrículas, mensualidades,
pagos, inscripciones a talleres y postulaciones. Se comparten entre sedes: sedes
(lectura), instructores, estilos, niveles, talleres, métodos de pago, convocatorias y
noticias. Con los instructores, cada administrador solo agrega o quita su propia sede.

Las cuentas de administrador se crean con
`python -m app.herramientas.crear_cuenta --rol administrador --sede <idSede> ...`; la cuenta
técnica (roles, permisos y estados de toda la academia) con `--sin-sede`.
Una cuenta de administrador sin sede (`idSede` NULL) conserva el acceso a todo; así
funciona una base migrada hasta que se asignen las sedes (`bd/05_admin_por_sede.sql`).

## Inscripción presencial

No hay autorregistro público. El administrador inscribe al estudiante en la sede:

| Método | Ruta | Descripción |
| --- | --- | --- |
| POST | `/inscripciones` | Crea persona, estudiante, acudientes y, si se envían, matrícula y cuenta. Todo o nada. |
| GET | `/inscripciones/personas?documento=` | Busca a una persona para reutilizarla como acudiente. Devuelve solo id, nombre y documento; no encuentra administradores ni estudiantes de otra sede. |
| GET | `/estudiantes/{id}/acudientes` | Acudientes del estudiante. |
| POST | `/estudiantes/{id}/acudientes` | Agrega un acudiente (`idPersona` existente o `persona` nueva, más `idParentesco`). |
| PUT | `/estudiantes/{id}/acudientes/{idAcudiente}` | Edita nombre, teléfono, correo y parentesco del acudiente (el documento no cambia). |
| DELETE | `/estudiantes/{id}/acudientes/{idAcudiente}` | Quita el vínculo. Bloqueado (409) si el estudiante es menor de edad. |
| GET | `/catalogos/tipos-documento` | Tipos de documento (requiere sesión). |
| GET | `/catalogos/parentescos` | Parentescos (requiere sesión). |

`POST /estudiantes` ya no existe: los estudiantes nuevos entran por `/inscripciones`.

Reglas (las valida el backend; el formulario las repite para avisar antes):

- Obligatorios: nombre, tipo y número de documento, teléfono, fecha de nacimiento y sede.
  El correo es opcional, salvo si se crea la cuenta (el estudiante entra con su correo).
- Documento: se quitan espacios, puntos y guiones. Cédula, tarjeta de identidad y
  registro civil solo admiten números. Es único en todo el sistema (es la llave de `usuarios`).
- Tipo según la edad: registro civil de 0 a 6 años, tarjeta de identidad de 7 a 17 y
  cédula desde los 18. Cédula de extranjería y pasaporte, a cualquier edad.
- Teléfono: exactamente 10 dígitos (máximo 10; si trae más, el error lo dice). Correo en minúscula.
- Menor de edad (menos de 18 años según la fecha de nacimiento): el acudiente es obligatorio al
  inscribir y al editar, y no se puede quitar mientras siga siendo menor.
- Acudiente compartido: si el documento del acudiente nuevo ya existe, se reutiliza esa persona
  (por ejemplo, la madre de dos hermanos). Así el mismo correo sirve para varios estudiantes.
  El índice `uq_persona_email` sigue exigiendo un correo por persona: dos personas distintas
  no pueden compartirlo.
- Menor de 18 años: al menos un acudiente (máximo 3), mayor de edad y distinto del estudiante.
- Matrícula opcional (`idGrupo`): mismas reglas de `/matriculas` (sede, edad del nivel y
  cupo). El valor no se envía (precio único) y la matrícula queda Pendiente de aprobación.
  «Nueva matrícula» del panel usa esta ruta para registrar a la persona con su matrícula.
- Traslado de sede (`PUT /estudiantes/{id}` con otra `idSede`): solo sin matrícula activa.

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

Todas requieren el permiso `usuarios` (el administrador entra siempre).

Campos según las tablas de Neon:

- **Personas** (`persona`): `idTipoDocumento` es obligatorio en la base (por defecto `1`);
  `telefono`, `email` y `fecha_nacimiento` son opcionales.
- **Usuarios** (`usuarios`): la llave es el `documento` de una persona que ya existe; si no
  existe responde `400`. No hay columna `username`: la respuesta lo devuelve igual al documento.
- **Estados**: `orden` es opcional al crear (queda de último en su categoría) y la
  descripción es opcional. Estados y permisos no se inactivan (`DELETE` responde `400`).

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
| `/matriculas` | `matricula` | `matriculas` | Nace Pendiente; `PUT /{id}/aprobacion` la activa; `PATCH /{id}/estado` (Activo/Inactivo) |
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
- `matriculas`: `estado`, `estudiante`, `grupo`, `sede`; `GET /matriculas/disponibles` (activas).
  Devuelve `valorPagado`, `saldo`, `mensualidades`, `requisitosCumplidos`, `requisitosTotal`,
  `fecha_aprobacion` y `aprobadaPor`. Apoyo: `GET /matriculas/configuracion` (precio único y si
  la base tiene `bd/08`), `GET /matriculas/estados`, `GET /matriculas/requisitos`,
  `GET /matriculas/opciones/estudiantes?sede=` y `GET /matriculas/opciones/grupos?sede=`
  (rango de edad del nivel, capacidad y cupos ocupados).
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
  debe estar en el rango del nivel; sin matrícula activa o pendiente repetida en el grupo
  y con cupo disponible (las pendientes ya ocupan cupo; también al reactivar). Fecha a
  máximo un año antes o después de hoy. Precio único `VALOR_MATRICULA` (60.000), no se
  edita. Con mensualidades o pagos no cambia de estudiante; una inactiva no se edita.
  Sin borrado físico: Inactivo conserva el historial.
- **Proceso de matrícula** (`bd/08_matricula_aprobacion.sql`): nace **Pendiente**
  (estado de la categoría `matricula`). Los requisitos (`requisito_matricula`) se marcan con
  `PUT /matriculas/{id}/requisitos/{idRequisito}` `{ "cumplido": true }` y se consultan con
  `GET /matriculas/{id}/requisitos`. `PUT /matriculas/{id}/aprobacion` la deja **Activa**
  solo si cumple todos (`409` con la lista de lo que falta). Una pendiente no se activa con
  `PATCH /estado`; inactivarla cancela el proceso y, al reactivarla, vuelve a Pendiente si
  nunca se aprobó. Sin la migración 08 todo funciona como antes (nace Activa).
- **Portal del instructor**: `GET /portal-instructor/matriculas` (pendientes de sus grupos),
  `PUT /portal-instructor/matriculas/{id}/requisitos/{idRequisito}` (solo los requisitos con
  `responsable = instructor`, como el examen de nivel) y `PUT /portal-instructor/matriculas/{id}/aprobacion`.
  Una matrícula de otro instructor responde `404`.
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

## Portal del instructor

Requiere sesión con rol `instructor`. El instructor se identifica por el documento
del token, así que no se envía ningún id.

| Método | Ruta | Descripción |
| --- | --- | --- |
| GET | `/portal-instructor/perfil` | Nombre, documento, correo, teléfono y especialidad. |
| GET | `/portal-instructor/grupos` | Grupos activos con estilo, nivel, sede, aula, días, horario y cantidad de estudiantes. |
| GET | `/portal-instructor/estudiantes` | Estudiantes de sus grupos con el estado y el historial de mensualidades. |

La cuenta se crea desde administración con `POST /instructores/{id}/cuenta`
(`{ "clave": "..." }`). Crea el usuario con el rol `instructor` y el instructor inicia
sesión con su documento. El frontend lo envía a su portal según el rol que devuelve
el login.

Con `MODO_MOCK=false` el login usa las cuentas reales de Neon (`usuarios` y
`usuarios_roles`, ambas por documento). Los nombres de rol llegan en minúscula.

## Probar la API contra la base de datos

Con el backend corriendo (`MODO_MOCK=false`), desde `backend`:

```powershell
python pruebas_api/probar_api.py                    # solo lectura
python pruebas_api/probar_api.py --escritura        # además crea e inactiva registros "PRUEBA"
python pruebas_api/probar_api.py --url https://.../api/v1   # backend desplegado
```

Usa las cuentas de `bd/02_datos_iniciales.sql` y no necesita instalar nada.

## Módulos preparados

`/reportes` todavía devuelve una lista vacía.

FastAPI genera el contrato completo en `/docs`.

## Sitio público y finanzas (bd/07_sitio_publico.sql)

Sin sesión (`/publico`, los POST con límite de 5 envíos por minuto por IP):

| Método | Ruta | Uso |
| --- | --- | --- |
| GET | `/publico/planes`, `/publico/sedes`, `/publico/estilos`, `/publico/tipos-documento` | Catálogos del sitio |
| GET | `/publico/disponibilidad?sede=&fecha=` | Aulas de la sede y franjas ocupadas ese día |
| POST | `/publico/solicitudes-espacio` | Solicitud de alquiler (queda Pendiente) |
| GET | `/publico/preinscripcion` | Si hay periodo de matrícula abierto |
| POST | `/publico/preinscripciones` | Preinscripción (exige términos) |
| POST | `/publico/preinscripciones/confirmar` | Confirma el correo con el token del enlace |

Panel: `/planes` (pagos), `/periodos-matricula` (matriculas), `/preinscripciones` (matriculas, por sede),
`/solicitudes-espacio` (aulas, por sede), `/reportes/finanzas?periodo=YYYY-MM&meses=6` (pagos, por sede),
`POST /instructores/{id}/invitacion` (reemplaza `POST /instructores/{id}/cuenta`), `GET /usuarios/candidatos`.
