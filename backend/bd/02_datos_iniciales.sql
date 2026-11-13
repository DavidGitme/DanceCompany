-- DanceFlow - Datos iniciales (PostgreSQL / Neon)
-- Ejecutar despues de 01_esquema.sql, sobre una base vacia.
-- Los numeros en comentarios son los id que se generan en ese orden.
--
-- CUENTAS DE PRUEBA (solo desarrollo): todas usan la clave  Dance2026*
-- Administradora de prueba: documento 1000000001 (Laura Gomez).
-- En produccion se cambian todas las claves antes de publicar.

-- ===================== CATALOGOS =====================

INSERT INTO estados (nombre, categoria, descripcion, orden) VALUES
('Activo',     'general',     'Registro activo y disponible',        1),  -- 1
('Inactivo',   'general',     'Registro inactivo o dado de baja',    2),  -- 2
('Pendiente',  'mensualidad', 'Pago de mensualidad pendiente',       1),  -- 3
('Pagada',     'mensualidad', 'Mensualidad pagada',                  2),  -- 4
('Vencida',    'mensualidad', 'Mensualidad vencida sin pago',        3),  -- 5
('Mora',       'mensualidad', 'Mensualidad en mora',                 4),  -- 6
('Postulado',  'postulacion', 'Estudiante postulado a convocatoria', 1),  -- 7
('Aceptado',   'postulacion', 'Estudiante aceptado en convocatoria', 2),  -- 8
('Rechazado',  'postulacion', 'Estudiante no seleccionado',          3),  -- 9
('Disponible', 'noticia',     'Noticia visible en el sitio',         1),  -- 10
('Expirada',   'noticia',     'Noticia fuera de vigencia',           2);  -- 11

INSERT INTO tipo_documento (nombre) VALUES
('Cedula de ciudadania'),   -- 1
('Tarjeta de identidad'),   -- 2
('Cedula de extranjeria'),  -- 3
('Pasaporte');              -- 4

INSERT INTO parentesco (nombre) VALUES
('Madre'), ('Padre'), ('Abuelo/a'), ('Tio/a'), ('Tutor legal');

INSERT INTO tipo_grupo (nombre) VALUES
('Regular'), ('Competencia'), ('Vacacional');

INSERT INTO tipo_convocatoria (nombre) VALUES
('General'), ('Experiencia'), ('Competencia');

INSERT INTO tipo_noticia (nombre) VALUES
('Noticia'), ('Promocion'), ('Oferta'), ('Taller'), ('Uniforme');

INSERT INTO metodo_pago (nombre) VALUES
('Efectivo'), ('Transferencia'), ('Tarjeta de credito');

INSERT INTO nivel (nombre, orden, edad_minima, edad_maxima, idEstado) VALUES
('Basico',     1, 5,  99, 1),
('Intermedio', 2, 8,  99, 1),
('Avanzado',   3, 8,  99, 1),
('Libre',      4, 18, 99, 1);

INSERT INTO estilo (nombre, idEstado) VALUES
('Hip Hop', 1),  -- 1
('Twerk',   1);  -- 2

-- La descripcion es la clave del modulo: minusculas y sin tildes.
INSERT INTO permisos (descripcion) VALUES
('dashboard'),     -- 1
('estudiantes'),   -- 2
('instructores'),  -- 3
('pagos'),         -- 4
('grupos'),        -- 5
('horarios'),      -- 6
('sedes'),         -- 7
('talleres'),      -- 8
('usuarios'),      -- 9
('roles'),         -- 10
('reportes'),      -- 11
('matriculas'),    -- 12
('aulas'),         -- 13
('niveles'),       -- 14
('estilos');       -- 15

INSERT INTO roles (nombre, idEstado) VALUES
('Administrador', 1),  -- 1
('Instructor',    1),  -- 2
('Estudiante',    1),  -- 3
('Acudiente',     1);  -- 4

-- ===================== SEDES Y AULAS =====================

INSERT INTO sede (nombre, direccion, idEstado) VALUES
('Bello',      'Cra 45 #12-30', 1),  -- 1
('Copacabana', 'Cll 10 #56-20', 1);  -- 2

INSERT INTO aula (capacidad, idSede, idEstado) VALUES
(20, 1, 1),  -- 1 Bello
(15, 1, 1),  -- 2 Bello
(25, 2, 1);  -- 3 Copacabana

-- ===================== PERSONAS Y SEGURIDAD =====================

INSERT INTO persona (nombre, idTipoDocumento, documento, telefono, email, fecha_nacimiento, idEstado) VALUES
('Laura Gomez',     1, '1000000001', '3001111111', 'laura.gomez@academia.com',  '1990-05-10', 1),  -- 1
('Carlos Perez',    1, '1000000002', '3002222222', 'carlos.perez@academia.com', '1988-03-22', 1),  -- 2
('Ana Ramirez',     1, '1000000003', '3003333333', 'ana.ramirez@academia.com',  '1992-07-15', 1),  -- 3
('Sofia Torres',    2, '1000000004', '3004444444', NULL,                        '2016-02-01', 1),  -- 4
('Mateo Torres',    2, '1000000005', '3005555555', NULL,                        '2015-09-12', 1),  -- 5
('Valentina Lopez', 1, '1000000006', '3006666666', 'valentina.lopez@mail.com',  '1985-11-30', 1),  -- 6
('Julian Rojas',    1, '1000000007', '3007777777', 'julian.rojas@mail.com',     '2000-01-20', 1),  -- 7
('David Rios',      1, '1000000008', '3008888888', 'david.rios@academia.com',   '1986-06-05', 1),  -- 8
('Camila Rios',     2, '1000000009', '3009999999', NULL,                        '2014-04-18', 1);  -- 9

-- Hash Argon2 de la clave de prueba Dance2026*. Los menores no tienen cuenta.
INSERT INTO usuarios (documento, password_hash, idEstado) VALUES
('1000000001', '$argon2id$v=19$m=65536,t=3,p=4$CbQ8Ao+XviLzTKhYUeeNQg$ji5rWlcsOOAgdNm4xJgcmqw3bRKL85p9A7iv0OQtOQQ', 1),
('1000000002', '$argon2id$v=19$m=65536,t=3,p=4$+ZZApet6k77KXB+hloyhQw$fNDTC7/3bxQRKN04aL1dLXObTwt6yn6pqAii5HjlDoI', 1),
('1000000003', '$argon2id$v=19$m=65536,t=3,p=4$3E8RYBIW17SwBgIMHoZaaA$O0AEg/jk1VVaQDUGs3hOkxWHRgedFYFb8poTiF/Yjj4', 1),
('1000000006', '$argon2id$v=19$m=65536,t=3,p=4$3DmpC6eO0E1aR5I7YmdTMQ$sq/JTQI3T8i1snyJXGEFTSNwWiw9sUz3yvaK76fq5A4', 1),
('1000000007', '$argon2id$v=19$m=65536,t=3,p=4$fMEbHyJYpKlT29iMS0mxww$WZw5gd0i0zYvTdQT9ij48WUkoc5Lj0GrcvJ/SBOdneA', 1),
('1000000008', '$argon2id$v=19$m=65536,t=3,p=4$K3fHroee021uIPf/w6EZ/w$oYMnQdRcWvFVwDQSwq9bAw2jhd4X3daSIO+mRh8BLJ8', 1);

INSERT INTO usuarios_roles (documento, idRol) VALUES
('1000000001', 1),  -- Laura: Administrador
('1000000002', 2),  -- Carlos: Instructor
('1000000003', 2),  -- Ana: Instructor
('1000000006', 4),  -- Valentina: Acudiente
('1000000007', 3),  -- Julian: Estudiante
('1000000008', 2),  -- David: Instructor
('1000000008', 4);  -- David: tambien Acudiente

-- Administrador: todos los modulos. Instructor: reportes. Acudiente: pagos.
INSERT INTO roles_permisos (idRol, idPermiso)
SELECT 1, idPermiso FROM permisos;

INSERT INTO roles_permisos (idRol, idPermiso) VALUES
(2, 11),
(4, 4);

INSERT INTO acudiente (idPersona, idEstado) VALUES
(6, 1),  -- 1 Valentina
(8, 1);  -- 2 David

INSERT INTO estudiante (idSede, idPersona, idEstado) VALUES
(1, 4, 1),  -- 1 Sofia
(1, 5, 1),  -- 2 Mateo
(2, 7, 1),  -- 3 Julian
(2, 9, 1);  -- 4 Camila

INSERT INTO instructor (idPersona, descripcion, idEstado) VALUES
(2, 'Instructor de Hip Hop, especializado en nivel Basico', 1),                         -- 1 Carlos
(3, 'Instructora de Hip Hop, especializada en nivel Intermedio', 1),                    -- 2 Ana
(8, 'Instructor de Hip Hop nivel Avanzado, preparador de competencias y de Twerk', 1);  -- 3 David

INSERT INTO instructor_Sede (idInstructor, idSede) VALUES
(1, 1), (2, 1), (2, 2), (3, 1), (3, 2);

-- Julian es adulto y no requiere acudiente.
INSERT INTO estudiante_responsable (idEstudiante, idAcudiente, idParentesco) VALUES
(1, 1, 1),  -- Sofia - Valentina (Madre)
(2, 1, 1),  -- Mateo - Valentina (Madre)
(4, 2, 2);  -- Camila - David (Padre)

-- ===================== ACADEMICO =====================

INSERT INTO grupo (nombre, idNivel, idEstilo, idInstructor, idSede, idAula, idtipogrup, capacidad) VALUES
('Basico Inicio 5-6 anos',                     1, 1, 1, 1, 1, 1, 15),  -- 1
('Basico Ninos 6-9 anos',                      1, 1, 1, 1, 1, 1, 18),  -- 2
('Basico Ninos 6-9 anos (Fin de semana)',      1, 1, 1, 1, 2, 1, 15),  -- 3
('Basico 10-13 anos',                          1, 1, 1, 1, 1, 1, 18),  -- 4
('Basico Juvenil-Adulto +14',                  1, 1, 1, 1, 2, 1, 15),  -- 5
('Intermedio Ninos 8-11 anos (Lun-Mier)',      2, 1, 2, 1, 1, 1, 18),  -- 6
('Intermedio Ninos 8-11 anos (Mar-Jue)',       2, 1, 2, 1, 2, 1, 15),  -- 7
('Intermedio Ninos 8-11 anos (Fin de semana)', 2, 1, 2, 1, 1, 1, 18),  -- 8
('Juvenil-Adultos Intermedio +14',             2, 1, 2, 2, 3, 1, 20),  -- 9
('Intermedio Avanzado +14',                    2, 1, 2, 2, 3, 1, 20),  -- 10
('Intermedio Juvenil 13-16 anos',              2, 1, 2, 1, 1, 1, 18),  -- 11
('Intermedio Juvenil',                         2, 1, 2, 2, 3, 1, 20),  -- 12
('Ninos Avanzados 8-13 anos',                  3, 1, 3, 2, 3, 1, 15),  -- 13
('Avanzados (Lun-Mier)',                       3, 1, 3, 2, 3, 1, 15),  -- 14
('Avanzados (Mar-Jue)',                        3, 1, 3, 1, 1, 1, 18),  -- 15
('Twerk Adultos +18',                          4, 2, 3, 1, 2, 1, 12),  -- 16
('Hip Hop Competencia',                        3, 1, 3, 2, 3, 2, 10);  -- 17

INSERT INTO horario (idGrupo, dia_semana, hora_inicio, hora_fin) VALUES
(1,  'Martes',    '17:00', '18:00'), (1,  'Jueves',    '17:00', '18:00'),
(2,  'Martes',    '19:00', '20:00'), (2,  'Jueves',    '19:00', '20:00'),
(3,  'Sabado',    '11:00', '12:00'), (3,  'Domingo',   '12:00', '13:00'),
(4,  'Lunes',     '19:00', '20:00'), (4,  'Miercoles', '19:00', '20:00'),
(5,  'Lunes',     '19:00', '20:00'), (5,  'Miercoles', '19:00', '20:00'),
(6,  'Lunes',     '18:00', '19:00'), (6,  'Miercoles', '18:00', '19:00'),
(7,  'Martes',    '18:00', '19:00'), (7,  'Jueves',    '18:00', '19:00'),
(8,  'Sabado',    '10:00', '11:00'), (8,  'Domingo',   '10:00', '11:00'),
(9,  'Martes',    '17:00', '18:00'), (9,  'Jueves',    '17:00', '18:00'),
(10, 'Sabado',    '12:00', '13:00'), (10, 'Domingo',   '12:00', '13:00'),
(11, 'Viernes',   '18:00', '19:00'), (11, 'Sabado',    '11:00', '12:00'),
(12, 'Viernes',   '18:00', '19:00'), (12, 'Sabado',    '10:00', '11:00'),
(13, 'Martes',    '20:00', '21:00'), (13, 'Jueves',    '20:00', '21:00'),
(14, 'Lunes',     '20:00', '21:00'), (14, 'Miercoles', '20:00', '21:00'),
(15, 'Martes',    '20:00', '21:00'), (15, 'Jueves',    '20:00', '21:00'),
(16, 'Lunes',     '20:00', '21:00'),
(17, 'Sabado',    '14:00', '16:00');

-- Sofia cambio de Basico a Intermedio: su primera matricula queda Inactiva (2).
INSERT INTO matricula (idEstudiante, idGrupo, fecha_matricula, valor_matricula, idEstado) VALUES
(1, 2,  '2025-02-01', 150000.00, 2),  -- 1 Sofia  - Basico Ninos 6-9 (anterior)
(1, 6,  '2026-02-01', 160000.00, 1),  -- 2 Sofia  - Intermedio Ninos 8-11 (vigente)
(2, 4,  '2026-01-15', 150000.00, 1),  -- 3 Mateo  - Basico 10-13
(3, 9,  '2025-07-01', 180000.00, 1),  -- 4 Julian - Juvenil-Adultos Intermedio +14
(4, 17, '2026-01-10', 200000.00, 1);  -- 5 Camila - Hip Hop Competencia

-- ===================== FINANCIERO =====================

-- idEstado: 3 Pendiente, 4 Pagada, 5 Vencida
INSERT INTO mensualidad (fecha_pago, valor_pagar, fecha_limite, idEstado, idMatricula) VALUES
('2026-03-01', 160000.00, '2026-03-10', 4, 2),  -- 1 Sofia marzo
('2026-04-01', 160000.00, '2026-04-10', 3, 2),  -- 2 Sofia abril
('2026-03-01', 150000.00, '2026-03-10', 4, 3),  -- 3 Mateo marzo
('2026-02-01', 180000.00, '2026-02-10', 5, 4),  -- 4 Julian febrero
('2026-03-01', 200000.00, '2026-03-10', 4, 5);  -- 5 Camila marzo

INSERT INTO taller (descripcion, valor, idEstado) VALUES
('Taller de maquillaje escenico',  50000.00, 1),  -- 1
('Taller de preparacion fisica',   40000.00, 1),  -- 2
('Taller de coreografia navidena',     0.00, 2);  -- 3

INSERT INTO pago (monto, fecha_pago, idAcudiente, idMetodo, idMensualidad, idMatricula) VALUES
(150000.00, '2025-02-01', 1, 2, NULL, 1),     -- 1 matricula Sofia
(160000.00, '2026-03-05', 1, 1, 1,    NULL),  -- 2 mensualidad Sofia
(150000.00, '2026-01-15', 1, 2, NULL, 3),     -- 3 matricula Mateo
(150000.00, '2026-03-06', 1, 1, 3,    NULL),  -- 4 mensualidad Mateo
(200000.00, '2026-01-10', 2, 3, NULL, 5),     -- 5 matricula Camila
(200000.00, '2026-03-07', 2, 3, 5,    NULL),  -- 6 mensualidad Camila
(50000.00,  '2026-02-20', 1, 1, NULL, NULL),  -- 7 taller Sofia
(40000.00,  '2026-02-21', 1, 1, NULL, NULL);  -- 8 taller Mateo

INSERT INTO inscripcion_talle (idEstudiante, idTaller, fecha_inscripcion, idPago) VALUES
(1, 1, '2026-02-20', 7),
(2, 2, '2026-02-21', 8);

-- ===================== CONVOCATORIAS Y COMPETENCIA =====================

INSERT INTO convocatoria (nombre, fecha_inicio, fecha_fin, descripcion, idTipoconvo) VALUES
('Convocatoria General 2026',         '2026-01-05', '2026-01-20', 'Proceso abierto a todos los niveles',    1),  -- 1
('Convocatoria Competencia Nacional', '2026-02-01', NULL,         'Seleccion para representar la academia', 3);  -- 2

-- idEstado: 8 Aceptado, 9 Rechazado
INSERT INTO convocatoria_estudiante (idConvocatoria, idEstudiante, idEstado, beneficio) VALUES
(1, 1, 8, NULL),
(2, 4, 8, 'Matricula gratis'),
(2, 3, 9, NULL);

INSERT INTO grupo_competencia (idGrupo, idConvocatoria) VALUES
(17, 2);

INSERT INTO grupo_competencia_estudiante (idgrupocompe, idEstudiante) VALUES
(1, 4);

-- ===================== NOTICIAS =====================

-- idEstado: 10 Disponible, 11 Expirada
INSERT INTO noticia (titulo, contenido, imagen_url, idtiponoticia, fecha_expiracion, idEstado) VALUES
('Apertura de matriculas 2026',         'Ya estan abiertas las matriculas para el nuevo ciclo.', NULL, 1, NULL,         10),
('Descuento en mensualidad de marzo',   'Paga antes del 10 y obten un 10% de descuento.',        NULL, 2, '2026-03-31', 10),
('Taller de maquillaje escenico',       'Inscripciones abiertas para el taller de maquillaje.',  NULL, 4, NULL,         10),
('Oferta de uniformes temporada pasada','Uniformes de la temporada anterior con descuento.',     NULL, 5, '2026-01-31', 11);
