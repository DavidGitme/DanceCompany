# Módulo Portal del estudiante

Lo que ve un estudiante después de iniciar sesión: inicio, mis clases, mis pagos,
talleres, convocatorias, noticias y mi perfil.

## Cómo entra el estudiante

Usa el mismo formulario de login que todos. Si escribe un **correo** (contiene `@`),
el servicio de autenticación llama a `POST /api/v1/portal-estudiante/login`; con un
documento sigue usando `/auth/login` como siempre. El token trae el rol `estudiante`
y `App.tsx` muestra este portal en lugar del panel de administración.

Cuenta de prueba de los datos iniciales: `julian.rojas@mail.com` / `Dance2026*`.
Requiere `VITE_USAR_MOCK=false` (los datos vienen del backend).

## Reglas

- Las llamadas REST viven únicamente en `servicios/portalEstudianteServicio.ts`.
- Los contratos y mappers viven en `dtos/portalEstudianteDto.ts`.
- Otros módulos solo pueden importar desde `index.ts`.
