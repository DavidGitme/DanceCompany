# DESIGN.md — DanceFlow (F&A Dance Company)

Especificación visual del frontend. Los valores salen de `frontend/src/estilos/index.css`; si cambias un token allá, actualízalo aquí también.

## 1. Tema visual y atmósfera

Academia de danza urbana (Hip Hop) con sedes en Bello y Copacabana. La marca se ve como un cartel editorial de calle: titulares gigantes en mayúsculas, violeta grisáceo de baja saturación, grano sutil y contornos de texto. En la landing hay más movimiento; en los paneles (admin, instructor, estudiante) el estilo es el mismo pero con más calma y densidad de datos.

Palabras clave: urbano, editorial, contundente, cercano. Una frase: *"cartel de batalla de baile, ordenado como una agenda"*.

## 2. Paleta y roles

Tokens definidos en `@theme` (claro) y sobrescritos en `.dark`. En JSX se usan como clases de Tailwind (`bg-surface`, `text-text-soft`, `border-border`...).

| Token | Claro | Oscuro | Uso |
|---|---|---|---|
| `--color-page` | `#f6f3fa` | `#1a1624` | Fondo general |
| `--color-surface` | `#ffffff` | `#251f31` | Tarjetas, tablas, paneles |
| `--color-surface-alt` | `#efeaf5` | `#201a2b` | Inputs, filas alternas, botón secundario |
| `--color-text` | `#1d1528` | `#f4f0f9` | Texto principal |
| `--color-text-soft` | `#5a4d6b` | `rgba(236,230,245,.8)` | Texto secundario |
| `--color-text-muted` | `#6f6280` | `rgba(236,230,245,.62)` | Ayudas, metadatos |
| `--color-border` | `#ddd4e8` | `rgba(180,162,208,.26)` | Bordes y divisores |
| `--color-accent` | `#5a4577` | `#b4a2d6` | Botón primario, foco, selección, scrollbar |
| `--color-accent-strong` | `#2e2240` | `#ddd2ee` | Hover del primario |
| `--color-on-accent` | `#f5f1f9` | `#1b1326` | Texto sobre acento |
| `--color-blush` | `#7a4f78` | `#e2cfe1` | Acento secundario puntual |
| `--color-mist` | `#4f6c79` | `#8aa4b0` | Acento frío puntual (datos, gráficas) |
| `--color-hero` | `#ffffff` | `#1a1624` | Fondo del hero |

Escala base: `purple-900 #2e2240`, `purple-700 #5a4577`, `purple-400 #a692c4`, `purple-100 #e6dff0`, `purple-50 #f5f1f9`.

Colores de estado: los rojos de Tailwind (`red-600` / `red-700`) solo para acciones destructivas; los estados de registro van con `StatusBadge`.

## 3. Tipografía

```css
@import url('https://fonts.googleapis.com/css2?family=Anton&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@400;600;700;800&display=swap');
@import url('https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800;900&display=swap');
```

| Rol | Fuente | Clase | Notas |
|---|---|---|---|
| Display / titulares | Anton | `.display` o `font-display` | Mayúsculas, `line-height: .9` |
| Hero modo claro | Big Shoulders Display 900 | `.hc-titular` | Solo en el hero |
| Etiquetas, botones, nav, paginación | Barlow Condensed 600–700 | `font-condensed` | Mayúsculas, `tracking-wider` |
| Texto | Inter 400–600 | `font-body` | Párrafos, celdas, formularios |

Prohibido: agregar otras familias, o usar Anton en texto largo o en celdas de tabla.

## 4. Componentes

Base en `frontend/src/compartido/ui/`.

### Botones (`Button.tsx`)
- Forma de píldora (`rounded-full`), Barlow Condensed en mayúsculas.
- Variantes: `primary` (acento → acento fuerte), `secondary` (surface-alt → border), `ghost`, `outline`.
- Hover: `-translate-y-0.5`; pulsado: vuelve a 0; foco: outline de 2px con el acento; deshabilitado: `opacity-50`.
- Tamaños `sm` / `md` / `lg`. Mínimo 44px de alto en móvil para acciones principales.

### Tarjetas
- Panel: `bg-surface border border-border rounded-2xl` (contenedores) y `rounded-xl` (elementos internos).
- Landing: `.tarjeta-estilo` (radio 1.75rem, brillo que sigue al cursor, leve inclinación 3D). No usar este efecto en los paneles.

### Navegación
- Admin: `Sidebar.tsx` lateral, con el ítem activo marcado.
- Landing: barra superior; enlace activo diferenciado.

### Tablas y CRUD
- `PantallaRecurso` → `FilterBar` + `CrudTable` + `Paginacion`.
- Crear/editar en `SlideOver`; eliminar o desactivar con `ConfirmDialog tone="peligro"`.
- Carga: `.esqueleto`. Vacío: mensaje y acción para crear el primer registro.

### Badges
- `StatusBadge` para estados (activo, inactivo, pendiente...).

## 5. Layout

- Mobile-first. Breakpoints de Tailwind: `sm` 640, `md` 768, `lg` 1024, `xl` 1280.
- Espaciado en la escala de Tailwind (múltiplos de 4px). Secciones de la landing generosas; paneles más compactos.
- Radios: `rounded-full` (botones, chips), `rounded-xl` (inputs, elementos), `rounded-2xl` (contenedores), `rounded-3xl` solo en piezas destacadas de la landing.
- Cuadrícula decorativa `.grid-lines` (72px) solo en modo oscuro.

## 6. Profundidad y elevación

- Paneles: borde + fondo, casi sin sombra.
- Diálogos y slide-over: `shadow-2xl` con fondo `bg-black/70` y `backdrop-blur-sm`.
- Landing: sombras teñidas de violeta (`rgba(46,34,64,…)`), nunca negro puro.

## 7. Animación e interacción

Nivel **L2** en la landing, **L1** en los paneles. Sin dependencias de animación: todo es CSS + IntersectionObserver (`Reveal.tsx`).

- Entrada: `.reveal` → `.is-visible` (subida de 32px, 0.9s, `cubic-bezier(.2,.7,.2,1)`, retardo con `--d`).
- Titulares: `.mask` / `.mask-inner` (el texto sube desde una máscara).
- Paneles: `.animar-fondo`, `.animar-entrada`, `.animar-panel` (0.2–0.3s).
- Acordeón: `.acordeon-panel` con transición de `grid-template-rows`.
- Decoración: `.grain` (ruido al 6%) y `.stroke-text` (contorno con el acento).
- Cursor violeta personalizado en todo el sitio (ya definido; no duplicar).
- `prefers-reduced-motion`: todas las clases anteriores se desactivan en el bloque final de `index.css`. Toda animación nueva debe sumarse ahí.

## 8. Sí y no

### Sí
- Usar siempre los tokens semánticos; que todo funcione en claro y oscuro.
- Reutilizar los componentes de `compartido/ui` antes de crear otros.
- Textos en español, cortos y directos, pasados por `tr()`.
- Fotos reales de la academia y de sus bailarines.
- Estados completos: hover, foco, pulsado, deshabilitado, carga, vacío y error.
- Iconos Heroicons Outline 1.5px en SVG inline.

### No
- Hex sueltos en JSX (excepto los ya definidos en `index.css`).
- Nuevas fuentes, nuevas librerías de iconos o de animación sin acordarlo con el equipo.
- Efectos de la landing (inclinación 3D, brillo, grano) dentro de tablas o formularios.
- Gradientes violeta-azul brillantes o colores saturados que se salgan de la paleta.
- Spinners genéricos, `window.alert()` o mensajes tipo "¡Ups!".
- Lorem ipsum o nombres de prueba tipo "John Doe": usar datos que parezcan de la academia.

## 9. Responsive

- Probar como mínimo en 375px, 768px y 1280px.
- Sin scroll horizontal en móvil; las tablas anchas van dentro de un contenedor con `overflow-x-auto`.
- Objetivos táctiles de al menos 44×44px.
- El hero cambia de composición a partir de `lg` con relación de aspecto ≥ 5/4 (ver `.hc-*`).
- Sidebar del admin plegable en móvil.
