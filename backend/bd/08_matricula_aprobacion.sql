-- DanceFlow - Proceso de matrícula: requisitos y aprobación (PostgreSQL / Neon).
-- Para bases creadas ANTES de este cambio. No borra ni cambia datos existentes y se
-- puede ejecutar varias veces.
--
-- Antes de ejecutarlo en Neon: crear una rama (branch) de respaldo desde el panel.
--
-- Mientras no se ejecute, el backend sigue funcionando como antes: las matrículas nuevas
-- quedan activas de una vez y la columna de requisitos aparece vacía.

-- 1. Estado de la matrícula mientras se cumplen los requisitos.
--    Aprobada = Activo (1) y dada de baja = Inactivo (2), como el resto del sistema,
--    para que mensualidades, pagos, reportes y portales no cambien.
INSERT INTO estados (nombre, categoria, descripcion, orden) VALUES
('Pendiente', 'matricula', 'Matrícula en proceso: faltan requisitos o la aprobación', 1)
ON CONFLICT (nombre, categoria) DO NOTHING;

-- 2. Quién y cuándo aprobó cada matrícula. Las matrículas que ya existían se dan por
--    aprobadas en su fecha de matrícula (solo la primera vez que se crea la columna).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = current_schema() AND table_name = 'matricula'
           AND column_name = 'fecha_aprobacion'
    ) THEN
        ALTER TABLE matricula ADD COLUMN fecha_aprobacion TIMESTAMPTZ;
        ALTER TABLE matricula ADD COLUMN aprobada_por VARCHAR(20);
        UPDATE matricula SET fecha_aprobacion = fecha_matricula;
    END IF;
END $$;

-- 3. Requisitos que debe cumplir cada matrícula antes de aprobarse.
--    responsable: quién lo revisa ('administrador' o 'instructor' del grupo).
--    Se agregan o se inactivan aquí, sin cambiar el código.
CREATE TABLE IF NOT EXISTS requisito_matricula (
    idRequisito  SERIAL PRIMARY KEY,
    nombre       VARCHAR(60) NOT NULL UNIQUE,
    descripcion  VARCHAR(150),
    responsable  VARCHAR(20) NOT NULL DEFAULT 'administrador'
                 CHECK (responsable IN ('administrador', 'instructor')),
    orden        INT NOT NULL,
    idEstado     INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

INSERT INTO requisito_matricula (nombre, descripcion, responsable, orden) VALUES
('Documento de identidad', 'Se revisó el documento del estudiante (y el del acudiente si es menor).', 'administrador', 1),
('Certificado médico',     'Entregó el certificado de aptitud física o la afiliación a salud vigente.', 'administrador', 2),
('Examen de nivel',        'El instructor del grupo hizo la clase de valoración y dio el visto bueno.', 'instructor',   3),
('Pago de la matrícula',   'Se recibió el pago de la matrícula.',                                    'administrador', 4)
ON CONFLICT (nombre) DO NOTHING;

-- 4. Requisitos cumplidos por cada matrícula (una fila = cumplido).
CREATE TABLE IF NOT EXISTS matricula_requisito (
    idMatricula       INT NOT NULL REFERENCES matricula(idMatricula),
    idRequisito       INT NOT NULL REFERENCES requisito_matricula(idRequisito),
    fecha_cumplido    TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    documento_usuario VARCHAR(20),
    observacion       VARCHAR(150),
    PRIMARY KEY (idMatricula, idRequisito)
);
