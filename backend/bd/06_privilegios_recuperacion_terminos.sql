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
