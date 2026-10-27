# Guía de contribución

## Ramas

- `main`: producción.
- `develop`: integración.
- `feature/<modulo>-<tarea>`: funcionalidad nueva.
- `hotfix/<descripcion>`: corrección urgente.

Ejemplos: `feature/seguridad-roles`, `feature/pagos-conciliacion`.

## Commits

Use Conventional Commits con mensajes en español:

```text
feat(seguridad): agrega asignación de permisos
fix(pagos): evita duplicar mensualidades
docs(api): documenta renovación de sesión
```

## Lista de verificación del PR

- [ ] La rama parte de `develop`.
- [ ] El cambio está limitado a su módulo.
- [ ] No se incluyeron secretos ni archivos `.env`.
- [ ] Los DTO no exponen entidades ni hashes de clave.
- [ ] `pnpm build` finaliza correctamente.
- [ ] Las pruebas de backend relevantes finalizan correctamente.
- [ ] La documentación se actualizó cuando cambió un contrato.
