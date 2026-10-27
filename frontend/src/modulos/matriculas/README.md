# Módulo Matriculas

Contiene las páginas, componentes, hooks, servicios, DTO y datos mock propios de **matriculas**.

## Reglas

- Las llamadas REST viven únicamente en `servicios/`.
- Los contratos y mappers viven en `dtos/`.
- Los datos de demostración viven en `datos/`.
- Otros módulos solo pueden importar desde `index.ts`.
- No coloque aquí componentes reutilizables por toda la aplicación.

Nombres: componentes en PascalCase, hooks `useXxx`, servicios `xxxServicio.ts` y DTO `xxxDto.ts`.
