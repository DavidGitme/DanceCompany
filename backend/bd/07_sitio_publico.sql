-- DanceFlow - Sitio público: planes, horario de sedes, solicitudes de espacio y preinscripción
-- (PostgreSQL / Neon). Para bases creadas ANTES de este cambio. No borra ni modifica
-- datos existentes y se puede ejecutar varias veces.
--
-- Antes de ejecutarlo en Neon: crear una rama (branch) de respaldo desde el panel.

-- 1. Estados nuevos (se buscan por nombre y categoría, no por id)
INSERT INTO estados (nombre, categoria, descripcion, orden) VALUES
('Por confirmar', 'preinscripcion', 'Preinscripción sin confirmar el correo',      1),
('Confirmada',    'preinscripcion', 'Correo confirmado, espera atención de la sede', 2),
('Atendida',      'preinscripcion', 'La sede ya contactó o inscribió a la persona',  3),
('Descartada',    'preinscripcion', 'La sede descartó la preinscripción',           4),
('Pendiente',     'solicitud',      'Solicitud de espacio en revisión',             1),
('Aprobada',      'solicitud',      'Solicitud de espacio aprobada',                2),
('Rechazada',     'solicitud',      'Solicitud de espacio rechazada',               3)
ON CONFLICT (nombre, categoria) DO NOTHING;

-- 1b. Tipo de documento PPT (Permiso por Protección Temporal), pedido en el encargo.
--     Sin restricción de edad, como la cédula de extranjería y el pasaporte.
INSERT INTO tipo_documento (nombre) VALUES ('Permiso proteccion temporal')
ON CONFLICT (nombre) DO NOTHING;

-- 2. Planes de pago que se muestran en el sitio. Valor total del plan.
--    Semestral y anual = mensual por el número de meses (sin descuento definido).
CREATE TABLE IF NOT EXISTS plan (
    idPlan      SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) NOT NULL UNIQUE,
    meses       INT NOT NULL CHECK (meses > 0),
    valor       NUMERIC(10,2) NOT NULL CHECK (valor >= 0),
    descripcion VARCHAR(150),
    idEstado    INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

INSERT INTO plan (nombre, meses, valor, descripcion) VALUES
('Mensual',   1,  50000, 'Pago mes a mes'),
('Semestral', 6, 300000, 'Seis meses en un solo pago'),
('Anual',    12, 600000, 'Doce meses en un solo pago')
ON CONFLICT (nombre) DO NOTHING;

-- 3. Franja diaria de atención de cada sede. Apertura tomada del sitio público; el cierre
--    de Copacabana se lleva a las 21:00 porque sus grupos tienen clases hasta esa hora.
ALTER TABLE sede ADD COLUMN IF NOT EXISTS hora_apertura TIME;
ALTER TABLE sede ADD COLUMN IF NOT EXISTS hora_cierre   TIME;
UPDATE sede SET hora_apertura = '07:00', hora_cierre = '21:00'
WHERE lower(nombre) = 'bello' AND hora_apertura IS NULL;
UPDATE sede SET hora_apertura = '08:00', hora_cierre = '21:00'
WHERE lower(nombre) = 'copacabana' AND hora_apertura IS NULL;

-- 4. Solicitudes de alquiler de un aula ("Solicita tu espacio")
CREATE TABLE IF NOT EXISTS solicitud_espacio (
    idSolicitud SERIAL PRIMARY KEY,
    nombre      VARCHAR(100) NOT NULL,
    email       VARCHAR(100) NOT NULL,
    telefono    VARCHAR(20)  NOT NULL,
    idAula      INT NOT NULL REFERENCES aula(idAula),
    fecha       DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL,
    personas    INT NOT NULL CHECK (personas > 0),
    mensaje     VARCHAR(300),
    creado      TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    idEstado    INT NOT NULL REFERENCES estados(idEstado),
    CONSTRAINT ck_solicitud_horas CHECK (hora_fin > hora_inicio)
);
CREATE INDEX IF NOT EXISTS ix_solicitud_aula_fecha ON solicitud_espacio (idAula, fecha);

-- 5. Periodos de matrícula: la preinscripción solo abre dentro de uno activo
CREATE TABLE IF NOT EXISTS periodo_matricula (
    idPeriodo    SERIAL PRIMARY KEY,
    nombre       VARCHAR(50) NOT NULL,
    fecha_inicio DATE NOT NULL,
    fecha_fin    DATE NOT NULL,
    idEstado     INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado),
    CONSTRAINT ck_periodo_fechas CHECK (fecha_fin >= fecha_inicio)
);

-- 6. Preinscripciones. No crean persona, estudiante ni cuenta: la inscripción sigue
--    siendo presencial. Solo se guarda el hash del enlace de confirmación.
CREATE TABLE IF NOT EXISTS preinscripcion (
    idPreinscripcion   SERIAL PRIMARY KEY,
    idPeriodo          INT NOT NULL REFERENCES periodo_matricula(idPeriodo),
    nombre             VARCHAR(100) NOT NULL,
    idTipoDocumento    INT NOT NULL REFERENCES tipo_documento(idTipoDocumento),
    documento          VARCHAR(20) NOT NULL,
    fecha_nacimiento   DATE NOT NULL,
    telefono           VARCHAR(20) NOT NULL,
    email              VARCHAR(100) NOT NULL,
    idSede             INT NOT NULL REFERENCES sede(idSede),
    idEstilo           INT REFERENCES estilo(idEstilo),
    idPlan             INT REFERENCES plan(idPlan),
    nombre_acudiente   VARCHAR(100),
    telefono_acudiente VARCHAR(20),
    terminos_version   VARCHAR(10) NOT NULL,
    token_hash         VARCHAR(64) UNIQUE,
    token_expira       TIMESTAMP,
    fecha_confirmacion TIMESTAMP,
    creado             TIMESTAMP NOT NULL DEFAULT LOCALTIMESTAMP,
    idEstado           INT NOT NULL REFERENCES estados(idEstado),
    CONSTRAINT uq_preinscripcion_periodo UNIQUE (idPeriodo, documento)
);
