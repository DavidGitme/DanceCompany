-- DanceFlow - Verificacion (solo lectura)
-- Ejecutar despues de 01 y 02. Ninguna consulta modifica datos.

-- 1. Debe devolver 34 tablas.
SELECT COUNT(*) AS total_tablas
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- 2. Cantidad de registros por tabla principal.
SELECT 'estados' AS tabla, COUNT(*) FROM estados
UNION ALL SELECT 'permisos',    COUNT(*) FROM permisos
UNION ALL SELECT 'roles',       COUNT(*) FROM roles
UNION ALL SELECT 'persona',     COUNT(*) FROM persona
UNION ALL SELECT 'usuarios',    COUNT(*) FROM usuarios
UNION ALL SELECT 'estudiante',  COUNT(*) FROM estudiante
UNION ALL SELECT 'instructor',  COUNT(*) FROM instructor
UNION ALL SELECT 'grupo',       COUNT(*) FROM grupo
UNION ALL SELECT 'horario',     COUNT(*) FROM horario
UNION ALL SELECT 'matricula',   COUNT(*) FROM matricula
UNION ALL SELECT 'pago',        COUNT(*) FROM pago;

-- 3. Usuarios con sus roles (lo que usara el login).
SELECT u.documento, p.nombre, r.nombre AS rol, e.nombre AS estado
FROM usuarios u
JOIN persona p         ON p.documento = u.documento
JOIN usuarios_roles ur ON ur.documento = u.documento
JOIN roles r           ON r.idRol = ur.idRol
JOIN estados e         ON e.idEstado = u.idEstado
ORDER BY u.documento;

-- 4. Permisos efectivos por usuario (lo que ira dentro del token).
SELECT ur.documento, STRING_AGG(DISTINCT pe.descripcion, ', ') AS permisos
FROM usuarios_roles ur
JOIN roles r           ON r.idRol = ur.idRol AND r.idEstado = 1
JOIN roles_permisos rp ON rp.idRol = r.idRol
JOIN permisos pe       ON pe.idPermiso = rp.idPermiso
GROUP BY ur.documento
ORDER BY ur.documento;

-- 5. Grupo vigente de cada estudiante.
SELECT p.nombre AS estudiante, g.nombre AS grupo, n.nombre AS nivel
FROM matricula m
JOIN estudiante es ON es.idEstudiante = m.idEstudiante
JOIN persona p     ON p.idPersona = es.idPersona
JOIN grupo g       ON g.idGrupo = m.idGrupo
JOIN nivel n       ON n.idNivel = g.idNivel
WHERE m.idEstado = 1
ORDER BY p.nombre;
