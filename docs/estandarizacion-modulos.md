# Estandarización de módulos, sitio público y finanzas

Fecha: 26/11/2026 · Rama: `feature/estandarizacion-modulos` (desde `develop` 90a8177)

## 1. Antes de aplicar en Neon

1. Crear una rama de respaldo en Neon.
2. Ejecutar `backend/bd/07_sitio_publico.sql` (no borra ni cambia datos; se puede repetir).
3. Configurar SMTP en el backend (Vercel): sin correo no salen la confirmación de la
   preinscripción ni las invitaciones de instructores.

Mientras no se ejecute la migración 07, el sitio muestra los planes y la preinscripción como
no disponibles y el panel responde error en Planes, Periodos, Preinscripciones y Solicitudes.

## 2. Qué cambió, por módulo

| Módulo | Cambio | Conectado a |
| --- | --- | --- |
| Componente de listados (`PantallaRecurso`) | Validación en vivo (al escribir y al salir del campo); «Ver» de solo lectura en todos los módulos; paginador con «Página X de Y»; editar oculto si el módulo no tiene formulario; campos de solo lectura | Rutas de cada módulo |
| Nombres de personas | No aceptan números (formulario y backend: `NombrePersona` en los DTO y `error_nombre_persona` en el dominio) | Inscripción, edición del estudiante y acudiente, instructores, datos personales, sitio público |
| Dashboard | Sin botones de crear; «Pagos» → «Últimos pagos»; nuevo bloque «Mensualidades e ingresos» con selector de mes, cifras, gráfico de 6 meses y tabla | `GET /reportes/finanzas` |
| Menú | «Inicio» → «Dashboard» (es la misma vista); grupo «Personas» → «Gestión humana» (Instructores); Estudiantes pasa a «Matrícula y pagos»; Seguridad › «Personas» → «Datos personales» | — |
| Usuarios | Mismo listado que los demás módulos; búsqueda por nombre, documento, correo, tipo de documento, rol, estado y sede; filtros de estado y rol; «Ver» solo lectura; estado y roles en «Editar», que muestra el tipo de documento | `GET /usuarios?buscar&estado&rol`, `GET /usuarios/candidatos` |
| Cuentas de empleados | Se quitó la creación con clave escrita por el administrador. En Instructores, «Invitar» crea la cuenta y envía un enlace de 48 h para que el instructor cree su contraseña. Usuarios ya no crea cuentas de instructores (backend 409) | `POST /instructores/{id}/invitacion` |
| Roles y privilegios | Encabezado estándar con una instrucción corta; el superadministrador crea roles y los activa o inactiva | `POST /roles`, `PUT /roles/{id}`, `DELETE /roles/{id}` |
| Login | Cuenta inactiva con clave correcta: mensaje que explica qué hacer. Con clave incorrecta sigue el mensaje genérico | `IniciarSesion`, `IniciarSesionEstudiante` |
| Portal del estudiante | Aviso de mensualidades vencidas con el total en todas las vistas y botón «Pagar lo adeudado»; en Mis pagos, detalle de lo vencido y cómo pagar; historial del pago más reciente al más antiguo | `GET /portal-estudiante/finanzas` |
| Ficha del estudiante («Ver») | Solo lectura (sin botón Editar) | — |
| `DetailWidget` (pantallas demo) | Solo lectura: sin Editar ni Inactivar | — |
| Sitio · Planes | Tarjetas comparables (valor total, duración, equivalente mensual, forma de pago); se quitó la nota de abajo | `GET /publico/planes` |
| Sitio · Sedes | Foto por sede (provisional, marcada «Foto de referencia»); horario desde la base | `GET /publico/sedes` |
| Sitio · Solicita tu espacio | Formulario por secciones, validación en vivo, aulas con franjas libres y ocupadas que se recargan al cambiar sede, fecha o aula; guarda la solicitud | `GET /publico/disponibilidad`, `POST /publico/solicitudes-espacio` |
| Sitio · Preinscripción | Solo con periodo abierto; botón «¿Cómo funciona?»; acudiente si es menor; términos con texto completo; confirmación de correo | `GET /publico/preinscripcion`, `POST /publico/preinscripciones`, `POST /publico/preinscripciones/confirmar` |
| Panel · nuevos | Planes (Catálogos), Periodos de matrícula y Preinscripciones (Matrícula y pagos), Solicitudes de espacio (Clases) | `/planes`, `/periodos-matricula`, `/preinscripciones`, `/solicitudes-espacio` |

## 3. Reglas implementadas

- **Superadministrador vs administrador.** Ya estaba en el código: superadministrador = rol
  Administrador **sin sede** (`usuarios.idSede` NULL); administrador de sede = con sede.
  Solo el superadministrador crea, renombra o inactiva roles, permisos y estados
  (`proteger_cuentas_admin`). El de sede ajusta privilegios de roles que no son
  Administrador y solo asigna Instructor, Estudiante o Acudiente. Ahora el menú lo muestra
  («Superadministrador» / «Administrador · Sede X»). Los roles del sistema no se renombran y
  Administrador no se inactiva.
- **Renombrar un rol no toca sus privilegios.** Antes, `PUT /roles/{id}` reemplazaba
  `roles_permisos` y dejaba los privilegios en «todo permitido» (valores por defecto).
- **Disponibilidad de aulas.** Ocupado = bloques semanales de grupos activos en el aula ese
  día + solicitudes Pendientes o Aprobadas de esa fecha. No se publican nombres de grupos ni
  de personas. Al aprobar, el backend vuelve a revisar la franja.
- **Solicitud de espacio.** Fecha y hora que no hayan pasado, dentro del horario de la sede,
  sin cruces, personas ≤ capacidad del aula, teléfono de 10 dígitos.
- **Preinscripción.** Periodo activo con hoy entre apertura y cierre; un documento por periodo;
  tipo de documento acorde a la edad; menor de 18 con nombre y teléfono del acudiente;
  términos vigentes aceptados (se guarda la versión); el enlace de confirmación vence en
  48 h, sirve una vez y solo se guarda su hash. No crea persona, estudiante ni cuenta.
- **Periodos de matrícula.** No puede haber dos periodos activos con fechas cruzadas.
- **Límite de envíos públicos.** 5 por minuto por IP (en memoria del proceso).

## 4. De dónde salen los gráficos y cálculos (`/reportes/finanzas`)

Solo de `mensualidad` y `pago`, filtrados a la sede del administrador de sede:

| Cifra | Regla |
| --- | --- |
| Ingresos esperados (mes) | Suma de `valor_pagar` de las mensualidades cuyo `fecha_pago` (mes de cobro) es el mes elegido |
| Recaudado / pendiente (mes) | Lo pagado a esas mismas mensualidades y su saldo |
| Ingresos recibidos (mes) | Todos los pagos con `fecha_pago` en el mes (mensualidad, matrícula o taller) |
| Mensualidades vencidas | Saldo > 0 y fecha límite anterior a hoy, o estado Vencida o Mora (al día de hoy, todos los meses) |
| Estudiantes al día | Estudiantes activos con matrícula activa y sin mensualidades vencidas |

No se calcula un «esperado» con precios de planes: los planes no están ligados a matrículas
en la base, así que no hay forma válida de derivarlo.

## 5. Contradicciones y cómo se resolvieron

| Contradicción | Decisión |
| --- | --- |
| «No hay autorregistro público» vs. preinscripción en línea | La preinscripción es una solicitud: no crea cuenta ni estudiante. La inscripción sigue siendo presencial |
| Precios: la base no tenía planes; cada mensualidad tiene su valor (150.000 a 200.000) | Tabla `plan` con lo que indicó el equipo: mensual 50.000; semestral 300.000 y anual 600.000 (mensual × meses, sin descuento porque no se definió) |
| Beneficios de los planes en la landing (kit, «2 meses gratis», descuentos) | Se quitaron: no estaban respaldados y «2 meses gratis» contradice los precios dados |
| Landing: sedes de lunes a sábado, Copacabana hasta las 20:00; alquiler «7 días»; horarios reales con clases el domingo y hasta las 21:00 | Mandan los datos reales: se aceptan los 7 días y Copacabana cierra a las 21:00 en `sede.hora_cierre` |
| Foto real de cada sede vs. decisión anterior de no mostrar fotos de otro lugar | Foto provisional de un salón de baile (como el resto del sitio), con la etiqueta visible «Foto de referencia». Para la foto real: `src/recursos/sedes/` |
| «Solicita tu espacio» enviaba a WhatsApp con un número de ejemplo (573001234567) | Se guarda en la base y la sede responde desde el panel |
| «Inicio» en el panel | Llevaba al mismo dashboard: se renombró a «Dashboard» en lugar de quitarlo |
| Restringir acceso por mora | No existe una regla real de restricción en el sistema: no se bloquea nada; solo se muestra el saldo y el acceso directo a pagar |
| Pago en línea | No hay pasarela real: «Pagar lo adeudado» muestra el detalle y cómo pagar en la sede |
| PPT como tipo de documento | No existía: la migración 07 agrega «Permiso proteccion temporal» (sin restricción de edad, como CE y pasaporte). Se quita borrando esa fila si el equipo no lo quiere |

## 6. Lo que no se implementó

- **Pago en línea** y simulación conectada: no hay pasarela; las pantallas de Mensualidades,
  Pagos, Estado de cuenta, Inscripciones, Horarios y Noticias siguen en demo (no se tocaron:
  son de otro integrante), salvo la ficha «Ver» de solo lectura y el paginador comunes.
- **Bloqueo por mora**: falta definir la regla de negocio.
- **Reenviar el correo de confirmación** de una preinscripción vencida.
- **Convertir una preinscripción en inscripción** con un clic (hoy se marca Atendida y se
  inscribe con «Inscribir estudiante»).
- **Editar el horario de la sede desde el panel**: está en la base (`hora_apertura`,
  `hora_cierre`) pero el formulario de Sedes todavía no lo tiene.
- **Fotos reales de las sedes** y **precios por sede**: faltan los datos.
- El límite de envíos públicos vive en memoria; en Vercel cada instancia cuenta aparte.

## 7. Verificación

- `pytest backend/pruebas`: 94 pruebas (19 nuevas en `test_sitio_publico.py`, más las de
  cuenta inactiva).
- `pruebas_api/probar_api.py`: 69/69 y `probar_alcance_sede.py`: 34/34 contra PostgreSQL 16
  local con `bd/01`–`07`.
- Alcance por sede de los módulos nuevos: registro de otra sede → 404; `?sede=` ajeno → 403;
  un administrador de sede no crea roles (403).
- Chrome sin interfaz: landing (planes, preinscripción con validación en vivo, solicitud de
  espacio con franjas ocupadas), login de cuenta inactiva, dashboard, usuarios (buscar, ver,
  editar), roles (nuevo rol con validación), instructores, solicitudes (aprobar), ficha del
  estudiante y portal del estudiante con mora.
- `tsc`: 5 errores, los mismos de antes (ninguno nuevo); `vite build` pasa.
