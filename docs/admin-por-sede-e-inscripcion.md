# Administrador por sede e inscripción presencial

Fecha: 24/11/2026 · Rama: `feature/admin-sedes-inscripcion` (desde `main` 4eea2f3)
Alcance: solo el área de administrador. Los portales de instructor y estudiante no cambian.

## 1. Requisitos

1. Ya no hay autorregistro público: el administrador inscribe al estudiante en persona.
2. Dos administradores, uno por sede (Bello y Copacabana).
3. Formularios revisados: tipo de documento, campos obligatorios y reglas.
4. Revisión de validaciones, seguridad, botones y reglas del panel.

## 2. Decisiones tomadas

Se tomaron con criterio técnico. Cada una dice cómo cambiarla si el equipo decide otra cosa.

| # | Tema | Decisión | Motivo | Para cambiarla |
| --- | --- | --- | --- | --- |
| D1 | Tipos de documento | CC, TI, CE, Pasaporte y **Registro civil** (nuevo) | Los menores de 7 años no tienen tarjeta de identidad | Agregar o quitar filas en `tipo_documento` |
| D2 | Documento único | Único en todo el sistema, sin importar el tipo | `usuarios` usa el documento como llave: único por tipo obligaría a rediseñar cuentas | — (cambio grande) |
| D3 | Formato del documento | Se quitan espacios, puntos y guiones; CC, TI y RC solo números | Evita duplicados como `1.000.234` y `1000234` | `dominio/reglas.py` |
| D4 | Tipo según la edad | RC 0–6, TI 7–17, CC 18+; CE y pasaporte a cualquier edad (solo estudiantes) | Reglas de la Registraduría | `EDADES_POR_TIPO` en `dominio/reglas.py` |
| D5 | Obligatorios del estudiante | Nombre, tipo y número de documento, teléfono, fecha de nacimiento y sede. Correo opcional | La matrícula ya exigía la edad para el nivel; la academia necesita un contacto | `GestionarEstudiantes.validar` |
| D6 | Acudientes | Menor de 18: al menos 1 (máximo 3), mayor de edad y distinto del estudiante. Se reutiliza a una persona ya registrada | Hermanos con el mismo acudiente; quién paga por un menor | `InscribirEstudiante` |
| D7 | Flujo de inscripción | Un solo paso transaccional: estudiante + acudientes + (opcional) matrícula + (opcional) cuenta | Si algo falla (cupo, edad) no quedan registros a medias | — |
| D8 | Cuenta del estudiante | Opcional al inscribir; clave inicial que da el administrador; exige correo (el portal entra con correo) | El portal del estudiante ya funciona así | — |
| D9 | Alcance de cada admin | Solo su sede en estudiantes, grupos, aulas, horarios, matrículas, mensualidades, pagos, inscripciones a talleres y postulaciones | Requisito de un administrador por sede | `presentacion/dependencias/sede.py` |
| D10 | Datos compartidos | Instructores, estilos, niveles, talleres, métodos de pago, convocatorias y noticias los editan ambos. Sedes: se consultan todas y cada uno edita la suya | Son de toda la academia (un instructor trabaja en las dos sedes) | `alcance_sede(...)` en cada router |
| D11 | Cuentas de administrador | Se crean por script (`crear_cuenta --rol administrador --sede N`); un admin de sede no crea, edita ni inactiva cuentas de administrador | Evita que un admin se dé acceso a la otra sede | `proteger_cuentas_admin` |
| D12 | Roles, permisos y estados | Solo los cambia una cuenta técnica sin sede (`crear_cuenta --sin-sede`) | Un admin de sede podía crear un rol con todos los permisos y dárselo a una cuenta sin sede, que vería las dos sedes | `proteger_cuentas_admin` |
| D12b | Roles que asigna un admin de sede | Solo Instructor, Estudiante y Acudiente | Evita que se asigne un rol con más permisos | `ROLES_ASIGNABLES_POR_SEDE` |
| D12c | Cuentas sin sede que no son administradoras | No entran a ninguna ruta por sede, aunque su rol tenga permisos | Negar por defecto: no hay una sede a la cual limitarlas | `_sede_propia_o_negar` |
| D12d | Personas y cuentas | Cada admin ve las de su sede (estudiantes, instructores con su sede, acudientes de sus estudiantes) y las que no tienen vínculos; nunca las de administradores | Datos personales de la otra sede | `condicion_persona_en_sede` |
| D13 | Traslado de sede | Permitido al editar el estudiante, solo sin matrícula activa (primero se inactiva) | Conserva el historial y evita matrículas en dos sedes | `GestionarEstudiantes.validar` |
| D14 | Estados de matrícula | Se mantienen Activo/Inactivo | Los portales de instructor y estudiante filtran por estado activo; cambiarlo los afectaría | Ver pendientes |
| D15 | Registros existentes | Nada se borra. Los estudiantes viejos sin teléfono o fecha de nacimiento siguen visibles; al editarlos se piden esos datos | No perder datos | — |

## 3. Base de datos (no destructiva)

| Archivo | Cambio |
| --- | --- |
| `bd/01_esquema.sql` | `usuarios.idSede INT REFERENCES sede` (NULL = sin restricción) |
| `bd/02_datos_iniciales.sql` | Tipo "Registro civil"; Laura (1000000001) admin de Bello; Diana Restrepo (1000000010) admin de Copacabana |
| `bd/05_admin_por_sede.sql` | Migración para una base existente: agrega la columna y el tipo, lista los administradores y deja comentados los `UPDATE` para asignar sedes |

Para aplicarlo en Neon:

1. Crear una rama de respaldo en Neon.
2. Ejecutar `bd/05_admin_por_sede.sql`.
3. Revisar el resultado del paso 3 del script y descomentar los `UPDATE` con los documentos reales.
4. Crear la segunda cuenta: `python -m app.herramientas.crear_cuenta --documento ... --rol administrador --nombre "..." --sede 2`.

Hasta el paso 3, todo sigue funcionando como antes: un administrador sin sede ve todo.

## 4. Seguridad: método aplicado

Se usó **OWASP ASVS 4.0.3, nivel 1**, priorizando **OWASP Top 10 2021 A01 (control de acceso roto)**,
que es el riesgo de un modelo con dos administradores. No es una certificación de cumplimiento.

| Control ASVS | Qué se hizo | Dónde |
| --- | --- | --- |
| V4.1.1 / V4.1.3 El control de acceso se aplica en el servidor; mínimo privilegio | La sede se valida en el backend en cada ruta del panel; el menú y el formulario solo ocultan | `dependencias/sede.py` |
| V4.2.1 Protección contra IDOR | Registro de otra sede por id → 404; referencias en cuerpo o filtros → 403; listas filtradas solas | `alcance_sede`, `filtro_sede` |
| V4.1.5 / V4.3 Administración protegida | Cuentas y rol de administrador, roles, permisos y estados fuera del alcance de un admin de sede | `proteger_cuentas_admin` |
| V5.1.3 / V5.1.4 Validación de entrada en el servidor | DTO Pydantic (longitudes, tipos) + reglas de dominio (documento, teléfono, edad, acudientes) | `inscripcion_dto.py`, `reglas.py` |
| V5.1.1 Normalización | Documento, teléfono y correo se normalizan antes de comparar duplicados | `gestionar_persona_rol.py` |
| V1.11 / V11.1 Lógica de negocio en orden y atómica | La inscripción es una transacción: todo o nada (verificado) | `inscribir_estudiante.py` |
| V7.4.1 Errores genéricos | Mensajes sin detalles internos; 404 para cualquier registro de otra sede (ruta, filtro o cuerpo) | `middlewares/errores.py`, `sede.py` |
| V5.1.3 Mismo valor que procesa la aplicación | Los ids se convierten con el validador de Pydantic antes de revisar la sede (`"2"`, `2.0`, `+2`) | `como_entero` |
| V2.1 Contraseñas | Clave inicial ≥ 8 caracteres, hash Argon2 (ya existía) | `HasherArgon2` |
| V2.2.1 Anti-automatización | Se mantiene el límite de 5 logins por minuto por IP | `limite_intentos.py` |

**Revisión independiente.** Un agente revisor que no escribió el código atacó la API local
y encontró 3 problemas críticos, 3 altos y 5 medios. Se corrigieron y se dejaron como
pruebas en `pruebas_api/probar_alcance_sede.py` (34 casos, todos bloqueados):

| Hallazgo | Corrección |
| --- | --- |
| C1 Un admin de sede creaba un rol con todos los permisos, se lo daba a una cuenta nueva sin sede y esa cuenta veía las dos sedes y se volvía administradora | Roles, permisos y estados solo con la cuenta técnica; roles asignables limitados; cuentas sin sede que no son admin se niegan por defecto; índice único `lower(trim(nombre))` en roles |
| C2 `"idSede":"2"` o `2.0` saltaban el control (Pydantic los convierte, el control no) | `como_entero` usa el mismo validador de Pydantic |
| C3 `/estudiantes/%2B4` (+4) saltaba el control de ruta y de filtros | Igual que C2; ya no hay salidas tempranas |
| A1 Personas y Usuarios mostraban y dejaban editar datos de la otra sede | Listas y registros limitados a la sede |
| A2 La búsqueda de acudiente mostraba teléfono y si era estudiante de la otra sede; se podía vincular a un admin | Devuelve solo id, nombre y documento; no encuentra admins ni estudiantes de otra sede |
| A3 Se podía editar a un instructor que solo trabaja en la otra sede | Solo se le puede agregar la sede propia |
| M1 Actualizar vencidas afectaba las dos sedes | Limitado a la sede |
| M3 403 vs 404 revelaba si un registro de otra sede existía | 404 en todos los casos |
| M4 Personas y login no normalizaban el documento | Normalizados (el login acepta "1.000.000.010") |
| B1 Un cuerpo sin Content-Type no se revisaba | Se lee siempre |
| B2 Un filtro de sede guardado de otra sesión causaba 403 | Con sede fija no se envía |

**Riesgos que siguen abiertos:**

- Un admin puede inactivar a un instructor que también trabaja en la otra sede.
- Inactivar una cuenta no revoca su token: sigue válido hasta que vence (20 minutos).
- Un admin puede trasladar a un estudiante suyo a la otra sede (D13) sin aprobación de la otra administradora.
- No hay bitácora de quién cambió qué (ASVS V7.1). Recomendado antes de producción.
- El cambio de sede de una cuenta aplica al renovar el token (máximo 20 minutos).
- La clave inicial del estudiante no se obliga a cambiar en el primer ingreso.
- El límite de intentos de login está en memoria del proceso: en Vercel cada instancia lleva su propia cuenta.
- `/docs` (OpenAPI) es público en producción.

## 5. Inventario de acciones del panel

Resultado: **Se mantiene**, **Cambiado**, **Nuevo**, **Quitado** o **Demo** (datos simulados, se conecta en el Sprint IV).

| Pantalla | Acción | Para qué | Permiso / validación | Resultado |
| --- | --- | --- | --- | --- |
| Inicio | Tarjetas → módulo | Ir al listado | Permiso del módulo | Se mantiene; "Estudiantes activos" dice la sede de la cuenta |
| Inicio | Acceso rápido "Inscribir estudiante" | Abrir la inscripción | `estudiantes` | Cambiado (antes "Registrar estudiante") |
| Estudiantes | Nuevo estudiante | Inscripción presencial | `estudiantes` + sede | Cambiado: abre "Inscribir estudiante" |
| Estudiantes | Ver (ojo) | Ficha con grupos y acudientes; agregar o quitar acudientes | `estudiantes` + sede; menor conserva 1 | Nuevo: es la única tarea que no cubre Editar |
| Estudiantes | Editar | Datos y traslado de sede | Teléfono y nacimiento obligatorios; traslado sin matrícula activa | Cambiado |
| Estudiantes | Activar / Inactivar | Baja lógica | Confirmación | Se mantiene |
| Estudiantes, Grupos, Aulas | Filtro y columna Sede | — | — | Ocultos para un admin de sede (el backend ya filtra) |
| Instructores | Nuevo / Editar / Activar | Personal de la academia | Cada admin solo agrega o quita su sede | Se mantiene |
| Instructores | Crear cuenta | Acceso al portal | `POST /instructores/{id}/cuenta` existe | Falta en la interfaz (recomendado) |
| Grupos, Aulas | Nuevo / Editar / Activar | Oferta de la sede | Sede fija; instructor de la sede | Cambiado: sin selector de sede |
| Sedes | Nueva sede | — | Solo cuenta técnica | Oculto para un admin de sede |
| Sedes | Editar / Activar | Su sede | Solo la propia | Oculto en la sede ajena |
| Niveles, Estilos, Talleres, Métodos de pago | Nuevo / Editar / Activar / Eliminar | Catálogos compartidos | Permiso del módulo | Se mantiene |
| Horarios, Matrículas, Mensualidades, Pagos, Estado de cuenta, Inscripciones, Noticias, Convocatorias, Postulaciones, Personas, Roles y permisos | Ver / Editar / Inactivar | — | — | Demo: los botones no guardan nada (ya marcados) |
| Acudientes (menú) | Ver / Editar / Eliminar | — | Borraba físicamente en memoria | Quitado: se gestionan en la ficha del estudiante |
| Estados | Ver | — | Abría el formulario de edición | Quitado (duplicaba Editar) |
| Usuarios | Nuevo / Ver / Editar / Inactivar | Cuentas de acceso de su sede | Un admin de sede solo asigna Instructor, Estudiante o Acudiente | Cambiado |
| Landing | "Regístrate" (menú, hero, botón flotante) | — | Llevaba al registro público o al alquiler | Cambiado a "Inscríbete": lleva a las sedes |
| Login | "¿No tienes cuenta? Regístrate" | — | Registro público | Quitado: texto que explica la inscripción presencial |
| Login | Google / Facebook | — | No hacían nada (no hay OAuth) | Quitados |

Código muerto eliminado (nadie lo importaba): `DanceFlowScreen.tsx`, `AulasScreen.tsx`, `AcudientesScreen.tsx`,
`registroAcudientes.ts` y `Registro.tsx`.

## 6. Pruebas

- `pytest backend/pruebas`: 59 pruebas (12 nuevas en `test_inscripcion_y_sedes.py`).
- `pruebas_api/probar_api.py --escritura` contra PostgreSQL 16 local con `bd/01`, `02`, `04` y `05`: 83 pruebas, con una sección nueva de alcance por sede (dos administradores).
- `pruebas_api/probar_alcance_sede.py`: 34 ataques de la revisión independiente, todos bloqueados.
- Migración `05` aplicada sobre una base creada con el esquema anterior y repetida dos veces sin error.
- Navegador sin interfaz (Chrome) con el frontend conectado al backend local, 20 comprobaciones: landing, login, inscripción completa, ficha, traslado bloqueado, grupos y sedes con sede fija, vista móvil.
- `vite build` pasa; `tsc` baja de 8 a 6 errores: los 6 son anteriores (no hay ninguno nuevo) y 2 desaparecieron con el código muerto.

## 7. Pendientes

1. Conectar las pantallas Demo; Roles y permisos y Estados en solo lectura para un admin de sede.
2. Botón "Crear cuenta" en Instructores (la API ya existe).
3. Bitácora de cambios del panel.
4. Estados de matrícula (por ejemplo Retirada, Finalizada) si el equipo los necesita; requiere revisar los portales.
5. Confirmar las direcciones reales de las sedes (la landing y la base no coinciden).
