# Portal del instructor

Este espacio contiene la interfaz independiente que utiliza el instructor al iniciar sesión.

## Alcance

- Inicio con resumen de grupos y estudiantes asignados.
- Consulta de grupos, ritmos, niveles, sedes, salones y horarios.
- Consulta de estudiantes asignados y estado/historial de mensualidades.
- Consulta y edición visual del perfil.

Los componentes visuales específicos del portal permanecen dentro de `componentes/`. El portal es de solo consulta para la información académica y financiera de estudiantes. No administra estudiantes, grupos, pagos ni transacciones. Los datos actuales provienen de `modulos/instructores/datos/instructorMock.ts` y se reemplazarán por servicios conectados a FastAPI.

La gestión administrativa de instructores permanece en `modulos/instructores/`.
