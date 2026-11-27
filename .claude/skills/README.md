# Skills de diseño

Claude Code las carga solas al abrir el repo. Empieza siempre por `danceflow-diseno`: dice cuál usar y qué partes de la marca no se tocan.

| Skill | Para qué | Origen | Licencia |
|---|---|---|---|
| `danceflow-diseno` | Reglas de marca de DanceFlow y qué skill usar | Propia del proyecto | — |
| `web-design` | Páginas nuevas a partir de `DESIGN.md` (spec primero, código después) | [xiaopu-ai/web-design](https://github.com/xiaopu-ai/web-design) @ 22a4f48 | MIT |
| `web-design-guidelines` | Revisión de UI y accesibilidad (Vercel Web Interface Guidelines) | [nexu-io/open-design](https://github.com/nexu-io/open-design) @ 6a74a15 | MIT (Vercel Labs) |
| `redesign-existing-projects` | Rediseñar un módulo sin romper funcionalidad | open-design (original de Leonxlnx/taste-skill) | MIT |
| `impeccable-design-polish` | Pulir una pantalla ya hecha | open-design (inspirada en pbakaus/impeccable) | Apache-2.0 (open-design) |

## Qué se dejó por fuera y por qué

- `web-design/references/design-systems/`: 1 MB de fichas que copian la marca de otras empresas (Apple, Airbnb...). No aplica a DanceFlow y la skill funciona sin ellas.
- Los 67 estilos de [bergside/awesome-design-skills](https://github.com/bergside/awesome-design-skills): cada uno trae sus propias fuentes y colores (por ejemplo Archivo Black y azul `#0077BC` en "bold") y chocarían con la marca. Nuestra identidad ya está en `DESIGN.md`.
- La mayoría de las 170 skills de open-design: son de video, presentaciones, imágenes o solo enlaces a otros repos.
- [gridaco/grida](https://github.com/gridaco/grida) y [rohitg00/awesome-claude-design](https://github.com/rohitg00/awesome-claude-design): son una app de diseño y una lista de recursos, no skills instalables.

## Scripts de `web-design`

`web-design/scripts/` trae un crawler con Playwright y extractores de tokens para analizar sitios de referencia. Son opcionales: necesitan `pip install playwright` y solo se usan si alguien pasa una URL de referencia.
