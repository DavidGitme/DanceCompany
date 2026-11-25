-- DanceFlow - Privilegios por modulo, recuperacion de contraseña y terminos (PostgreSQL / Neon)
-- Para bases creadas ANTES de este cambio. No borra ni modifica datos existentes
-- y se puede ejecutar varias veces.
--
-- Antes de ejecutarlo en Neon: crear una rama (branch) de respaldo desde el panel.

-- 1. Privilegios de cada rol en cada modulo. Las asignaciones que ya existen quedan
--    con todos los privilegios, asi que nadie pierde acceso al aplicar la migracion.
--    Despues se ajustan desde Seguridad > Roles y permisos.
ALTER TABLE roles_permisos ADD COLUMN IF NOT EXISTS puede_ver      BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles_permisos ADD COLUMN IF NOT EXISTS puede_crear    BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles_permisos ADD COLUMN IF NOT EXISTS puede_editar   BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE roles_permisos ADD COLUMN IF NOT EXISTS puede_eliminar BOOLEAN NOT NULL DEFAULT TRUE;

-- 1b. Los roles que no son Administrador quedan solo con "ver" en sus modulos actuales
--     (Instructor > reportes y Acudiente > pagos en los datos iniciales). Es mas restrictivo
--     que antes y evita que esas cuentas creen, editen o borren sin que nadie lo decida.
--     Si la academia quiere darles mas, lo marca en Roles y privilegios.
--     Solo corre la primera vez (antes de que exista usuarios.terminos_version, que crea el
--     paso 3): al repetir el script no deshace lo que la academia haya marcado despues.
UPDATE roles_permisos rp
SET puede_crear = FALSE, puede_editar = FALSE, puede_eliminar = FALSE
FROM roles r
WHERE r.idRol = rp.idRol
  AND lower(trim(r.nombre)) <> 'administrador'
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_name = 'usuarios' AND column_name = 'terminos_version');

-- 2. Enlaces de un solo uso para crear o recuperar la contraseña (solo el hash).
CREATE TABLE IF NOT EXISTS recuperacion_clave (
    idRecuperacion SERIAL PRIMARY KEY,
    documento      VARCHAR(20) NOT NULL REFERENCES usuarios(documento),
    token_hash     VARCHAR(64) NOT NULL UNIQUE,
    expira         TIMESTAMP NOT NULL,
    usado          BOOLEAN NOT NULL DEFAULT FALSE,
    creado         TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP
);

-- 3. Aceptacion de terminos y condiciones de cada cuenta.
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS terminos_version VARCHAR(10);
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS terminos_fecha   TIMESTAMP;

-- 4. Revisar el resultado.
SELECT r.nombre AS rol, pe.descripcion AS modulo,
       rp.puede_ver, rp.puede_crear, rp.puede_editar, rp.puede_eliminar
FROM roles_permisos rp
JOIN roles r     ON r.idRol = rp.idRol
JOIN permisos pe ON pe.idPermiso = rp.idPermiso
ORDER BY r.idRol, pe.idPermiso;
