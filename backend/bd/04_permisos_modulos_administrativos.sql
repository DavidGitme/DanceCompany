-- DanceFlow - Permisos de los modulos administrativos (PostgreSQL / Neon)
-- Solo para bases creadas ANTES de que 02_datos_iniciales.sql incluyera estos permisos.
-- Se puede ejecutar varias veces: no duplica nada.
--
-- convocatorias: tipos de convocatoria, convocatorias y postulaciones
-- noticias:      tipos de noticia y noticias

INSERT INTO permisos (descripcion) VALUES
('convocatorias'),
('noticias')
ON CONFLICT (descripcion) DO NOTHING;

-- El Administrador tiene todos los modulos
INSERT INTO roles_permisos (idRol, idPermiso)
SELECT r.idRol, p.idPermiso
FROM roles r
CROSS JOIN permisos p
WHERE r.nombre = 'Administrador'
  AND p.descripcion IN ('convocatorias', 'noticias')
ON CONFLICT DO NOTHING;
