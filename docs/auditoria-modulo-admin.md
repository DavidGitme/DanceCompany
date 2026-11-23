# Auditoría del módulo de administración y de las sedes de la landing

Fecha: 23/11/2026 · Rama base: `main` (07813ad)

## 1. Navegación y pantallas actuales

| Grupo del menú | Pantalla | Componente | Origen de los datos |
| --- | --- | --- | --- |
| Dashboard | Dashboard | `app/admin/Dashboard.tsx` | Cifras fijas de ejemplo (`defaultDashboardData`) y datos simulados |
| Gestión Académica | Instructores, Niveles, Grupos, Sedes | `DanceFlowScreen.tsx` | Arreglos locales (`initialRows`); nada se guarda |
| Oferta | Estilos, Talleres | `DanceFlowScreen.tsx` | Arreglos locales |
| Aulas y Agendamiento | Aulas, Horarios de grupo | `AulasScreen`, `HorariosGrupoScreen` | `AdministrationProvider` (simulado) |
| Matrícula | Estudiantes / Matrículas / Inscripciones | `DanceFlowScreen` / `MatriculasScreen` / `InscripcionesTallerScreen` | Simulado |
| Mensualidades y Pagos | Mensualidades, Pagos, Métodos de pago, Estado de cuenta | `modulos/pagos/paginas/*` | Simulado |
| Convocatorias | Convocatorias, Postulaciones | `modulos/reportes/paginas/*` | Simulado |
| Noticias | Noticias | `modulos/landing/paginas/NoticiasScreen` | Simulado |
| Usuarios y Seguridad | Personas, Acudientes, Roles y Permisos, Estados | `modulos/seguridad/paginas/*` | Semillas locales |
| Usuarios y Seguridad | Usuarios | `UsuariosScreen.tsx` | **API real** (`/usuarios`, `/personas`, `/roles`, `/estados`) |

Conclusión: de las 24 opciones del menú, solo **Usuarios** guarda en la base de datos. El resto muestra datos inventados
y sus botones de crear, editar, inactivar o eliminar cambian solo la memoria del navegador.
El backend ya expone todas las rutas necesarias (ver `docs/api.md`).

## 2. Patrones de la landing que se reutilizan

- Tipografía: Anton (`.display`, `font-display`) para títulos en mayúscula; Barlow Condensed
  (`font-condensed`, mayúsculas, `tracking-wider`) para etiquetas, botones y menú; Inter para el texto.
- Color: tokens semánticos de `estilos/index.css` (`bg-page`, `bg-surface`, `text-accent`, `border-border`,
  `text-on-accent`) con modo claro y oscuro; violeta grisáceo de baja saturación.
- Componentes: botones en píldora (`rounded-full`, mayúsculas condensadas, `hover:-translate-y-0.5`),
  tarjetas con borde fino `border-border`, rótulos tipo `(01) Sección` en `text-accent`.
- Iconos: SVG en línea estilo Heroicons Outline, trazo 1.5 px.
- Movimiento: `Reveal` y máscaras con `cubic-bezier(0.2, 0.7, 0.2, 1)`; ya respeta `prefers-reduced-motion`.

## 3. Inventario de imágenes e iconos de sedes (landing)

| Sede | Imagen / icono actual | Problema | Fuente | Corrección propuesta |
| --- | --- | --- | --- | --- |
| Bello | Unsplash `photo-1783824246318-…` | La URL responde con error de cliente (4xx): la tarjeta queda vacía | `Sedes.tsx` | No hay foto real de la sede en el repo. Se quita la URL rota y se muestra un fondo de marca con el nombre de la sede; queda una ruta clara para poner la foto real |
| Copacabana | Unsplash `photo-1524594152303-…` | Foto genérica de stock, no es la sede; sin respaldo si falla | `Sedes.tsx` | Igual que Bello: sin foto real, se usa el fondo de marca; si se agrega la foto real, se muestra con respaldo ante error |
| Ambas | Sin iconos en Dirección y Horario | Etiquetas solo de texto, sin ayuda visual | `Sedes.tsx` | Iconos de ubicación y reloj (mismo estilo Heroicons de la landing) |
| Ambas | Botón “Ver sede →” | No hace nada (sin `onClick` ni enlace) | `Sedes.tsx` | Enlace real a Google Maps con la dirección publicada |
| Ambas | `alt="Sede BELLO"` | Texto alternativo poco descriptivo | `Sedes.tsx` | `alt` descriptivo; la imagen decorativa del fondo queda oculta a lectores |

Inconsistencia que **no** se corrige porque falta el dato real: la dirección de la landing
(Calle 33 #48-12, Bello; Carrera 50 #21-80, Copacabana) no coincide con la de la base de datos
(Cra 45 #12-30; Cll 10 #56-20). El equipo debe confirmar cuál es la correcta.

## 4. Problemas encontrados, por gravedad

1. **Crítico:** 24 pantallas de administración no guardan nada en la base de datos pero lo parecen
   (mensajes de “se creó correctamente”).
2. **Crítico:** el Dashboard muestra cifras fijas (estudiantes, ingresos, vencidas) que no existen.
3. **Alto:** formularios con datos que la base no tiene (p. ej. tipo de documento “Registro civil”,
   acudientes dentro del estudiante, convocatoria dentro del grupo).
4. **Alto:** el menú no se adapta a móvil (barra lateral fija de 256 px).
5. **Medio:** “Ver sede” en la landing no funciona; imagen de Bello rota.
6. **Medio:** el menú abre la primera opción al expandir un grupo (clic de más) y no indica la página actual a lectores de pantalla.
7. **Bajo:** 8 errores de TypeScript previos (no rompen el build de Vite).

## 5. Pantalla / acción → API → tabla

| Pantalla | Leer | Crear / editar | Estado o borrado | Tablas |
| --- | --- | --- | --- | --- |
| Sedes | `GET /sedes` | `POST`, `PUT /sedes/{id}` | `PATCH /sedes/{id}/estado` | `sede` |
| Estilos | `GET /estilos` | `POST`, `PUT` | `PATCH …/estado` | `estilo` |
| Niveles | `GET /niveles` | `POST`, `PUT` | `PATCH …/estado` | `nivel` |
| Talleres | `GET /talleres` | `POST`, `PUT` | `PATCH …/estado` | `taller` |
| Instructores | `GET /instructores?sede=` | `POST`, `PUT` (persona + sedes) | `PATCH …/estado` | `persona`, `instructor`, `instructor_sede` |
| Estudiantes | `GET /estudiantes?sede=` | `POST`, `PUT` (persona + sede) | `PATCH …/estado` | `persona`, `estudiante` |
| Grupos | `GET /grupos?sede=&nivel=&estilo=` | `POST`, `PUT` | `PATCH …/estado` | `grupo` (+ `aula`, `instructor_sede`) |
| Aulas | `GET /aulas?sede=` | `POST`, `PUT` | `PATCH …/estado` | `aula` |
| Métodos de pago | `GET /metodos-pago` | `POST`, `PUT` | `DELETE` solo sin pagos | `metodo_pago` |
| Dashboard | `GET /estudiantes`, `/sedes`, `/grupos`, `/instructores`, `/mensualidades`, `/pagos`, `/convocatorias` | — | — | varias |

Todas exigen el permiso del módulo en el backend (`requiere_permiso`); el menú solo oculta opciones.

## 6. Plan

1. Componente común `PantallaRecurso` conectado a la API: búsqueda, filtros, paginación del servidor,
   estados de carga / vacío / error, formulario con validación, confirmación antes de inactivar o eliminar.
2. Definiciones por recurso con los campos reales de la base (sedes, estilos, niveles, talleres,
   instructores, estudiantes, grupos, aulas, métodos de pago).
3. Dashboard con cifras reales de la API.
4. Menú reorganizado por tareas frecuentes, usable en móvil, accesible, con marca “Demo” en las
   pantallas que aún no están conectadas y un aviso dentro de ellas.
5. Sedes de la landing: imagen de respaldo, iconos, enlace a mapas, textos alternativos.

Criterios de aceptación: ninguna pantalla marcada como conectada usa datos locales; cada botón llama a
una ruta real o se marca como demo; `tsc` no suma errores nuevos; `vite build` pasa; las rutas se prueban
contra una base PostgreSQL local con `bd/01_esquema.sql` y `bd/02_datos_iniciales.sql`.

## 7. Resultado (23/11/2026)

- Conectadas a la API con `PantallaRecurso`: Estudiantes, Instructores, Grupos, Aulas, Sedes, Niveles,
  Estilos, Talleres y Métodos de pago. El Dashboard lee cifras reales.
- Siguen con datos simulados y marcadas como **Demo** (menú y aviso en pantalla): Horarios, Matrículas,
  Mensualidades, Pagos, Estado de cuenta, Inscripciones, Noticias, Convocatorias, Postulaciones, Personas,
  Acudientes, Roles y permisos, Estados.
- Verificado contra PostgreSQL 16 local cargado con `bd/01_esquema.sql`, `bd/02_datos_iniciales.sql` y
  `bd/04_permisos_modulos_administrativos.sql`, con el backend local y Chrome sin interfaz (42 comprobaciones).
