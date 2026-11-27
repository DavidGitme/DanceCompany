---
name: danceflow-diseno
description: Reglas de diseño de DanceFlow (F&A Dance Company). Úsala SIEMPRE antes de crear, rediseñar o revisar cualquier pantalla, componente o estilo del frontend (landing, panel admin, portal del instructor, portal del estudiante). Define qué skill de diseño usar en cada caso y qué partes de la marca no se pueden cambiar.
---

# Diseño DanceFlow

Esta skill manda sobre las demás skills de diseño del repo. Si otra skill sugiere algo que choca con esto (cambiar fuentes, quitar el violeta, usar lucide, etc.), gana esta.

## Fuente de verdad

1. `DESIGN.md` (raíz del repo): identidad visual, tokens, componentes y reglas.
2. `frontend/src/estilos/index.css`: tokens reales en `@theme` y `.dark`. Si el código y `DESIGN.md` no coinciden, avisa antes de cambiar cualquiera de los dos.
3. `frontend/src/compartido/ui/`: componentes base (Button, CrudTable, FilterBar, SlideOver, ConfirmDialog, StatusBadge, Paginacion, Input). Reutilízalos antes de crear uno nuevo.

## Lo que no se cambia sin preguntar

- Fuentes: Anton (display), Barlow Condensed (etiquetas, botones, nav), Inter (texto). Big Shoulders Display solo en el hero claro.
- Paleta violeta grisácea de baja saturación y sus tokens semánticos (`bg-page`, `bg-surface`, `bg-surface-alt`, `text-text`, `text-text-soft`, `text-text-muted`, `border-border`, `bg-accent`, `text-on-accent`...). El violeta es la marca, no un "tic de IA".
- Modo claro y modo oscuro: todo color nuevo necesita su valor en los dos.
- Iconos: Heroicons Outline (1.5px, 24×24) en SVG inline. No agregar lucide ni otras librerías.
- Textos visibles en español y pasados por `tr()` del i18n.
- No agregar dependencias (GSAP, Three.js, Lenis, Framer Motion...) sin aprobación del equipo.

## Qué skill usar

| Tarea | Skill |
|---|---|
| Página nueva de la landing o rehacer una sección pública | `web-design` (sáltate la fase A: el DESIGN.md ya existe; ve a la fase C) |
| Pulir una pantalla que ya existe | `impeccable-design-polish` |
| Rediseño de un módulo completo sin romper funcionalidad | `redesign-existing-projects` |
| Revisar accesibilidad y buenas prácticas de UI antes de un PR | `web-design-guidelines` |

### Ajustes a esas skills para este proyecto

- `web-design`: el nivel de interacción es L2 en la landing (reveal, máscara en titulares, tarjetas con brillo) y L1 en los paneles. No exigir WebGL, ScrollTrigger ni las "6 animaciones firma" en el panel admin. Imágenes: fotos propias de la academia en `frontend/src/recursos`, nunca Unsplash en producción.
- `redesign-existing-projects`: ignora sus consejos de cambiar Inter, quitar el violeta o cambiar la barra lateral del admin. Sí aplica los de estados (hover, foco, vacío, error, carga), alineación y textos.
- `impeccable-design-polish`: mismo criterio; pulir, no reinventar.

## Paneles (admin, instructor, estudiante)

- Mobile-first. Probar en 375px y en escritorio.
- Estructura de módulo: `PantallaRecurso` → `FilterBar` + `CrudTable` + `Paginacion`; crear/editar en `SlideOver`; borrar o desactivar con `ConfirmDialog` (`tone="peligro"`).
- Estados con `StatusBadge`. Carga con la clase `.esqueleto`, no con spinners.
- Densidad media: estos son paneles de datos, no landing. Nada de efectos decorativos en tablas.

## Antes de terminar

- Contraste AA en claro y oscuro.
- Foco visible (`:focus-visible` ya usa el acento).
- `prefers-reduced-motion` respetado (ya hay bloque en `index.css`; si agregas animaciones, súmalas ahí).
- Sin colores hex sueltos en JSX: usa los tokens.
- `pnpm build` (desde la raíz) sin errores.
