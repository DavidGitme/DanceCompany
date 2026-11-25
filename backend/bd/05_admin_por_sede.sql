-- DanceFlow - Un administrador por sede y registro civil (PostgreSQL / Neon)
-- Para bases creadas ANTES de este cambio. No borra ni modifica datos existentes
-- y se puede ejecutar varias veces.
--
-- Antes de ejecutarlo en Neon: crear una rama (branch) de respaldo desde el panel.

-- 1. Sede que administra cada cuenta. NULL = sin restriccion de sede.
--    Mientras un administrador no tenga sede asignada conserva el acceso a todo,
--    asi que el sistema sigue funcionando igual hasta completar el paso 4.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS idSede INT REFERENCES sede(idSede);

-- 2. Tipo de documento para menores sin tarjeta de identidad.
INSERT INTO tipo_documento (nombre) VALUES ('Registro civil')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Un solo rol por nombre sin importar mayúsculas ("Administrador" = "administrador").
--    Si falla, hay roles repetidos: renombrarlos antes de seguir.
CREATE UNIQUE INDEX IF NOT EXISTS uq_roles_nombre ON roles (lower(trim(nombre)));

-- 4. Revisar los administradores actuales y las sedes antes de asignar.
SELECT u.documento, p.nombre, u.idSede
FROM usuarios u
JOIN persona p ON p.documento = u.documento
JOIN usuarios_roles ur ON ur.documento = u.documento
JOIN roles r ON r.idRol = ur.idRol
WHERE r.nombre = 'Administrador';

SELECT idSede, nombre FROM sede ORDER BY idSede;

-- 5. Asignar la sede a cada administrador (cambiar los documentos por los reales).
--    Se deja comentado para no asignar una sede equivocada por accidente.
-- UPDATE usuarios SET idSede = 1 WHERE documento = 'DOCUMENTO_ADMIN_BELLO';
-- UPDATE usuarios SET idSede = 2 WHERE documento = 'DOCUMENTO_ADMIN_COPACABANA';
--
-- La cuenta del segundo administrador se crea con:
--   python -m app.herramientas.crear_cuenta --documento ... --rol administrador --nombre "..." --sede 2
