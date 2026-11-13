-- DanceFlow - Esquema PostgreSQL (Neon)
-- Convertido desde Academia.sql (SQL Server).
-- Solo tablas, llaves e indices: sin procedimientos, vistas ni triggers.
-- Las reglas de negocio viven en el backend.
-- Los nombres se escriben sin comillas: PostgreSQL los guarda en minuscula
-- (idPersona queda como idpersona) y el backend los consulta igual, sin comillas.

-- ===================== CATALOGOS =====================

CREATE TABLE estados (
    idEstado   SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) NOT NULL,
    categoria   VARCHAR(30) NOT NULL,
    descripcion VARCHAR(100),
    orden       INT NOT NULL,
    CONSTRAINT uq_estados UNIQUE (nombre, categoria)
);

CREATE TABLE tipo_documento (
    idTipoDocumento SERIAL PRIMARY KEY,
    nombre            VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE parentesco (
    idParentesco SERIAL PRIMARY KEY,
    nombre        VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE tipo_grupo (
    idtipogrup SERIAL PRIMARY KEY,
    nombre        VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE tipo_convocatoria (
    idTipoconvo SERIAL PRIMARY KEY,
    nombre               VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE tipo_noticia (
    idtiponoticia SERIAL PRIMARY KEY,
    nombre          VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE metodo_pago (
    idMetodo SERIAL PRIMARY KEY,
    nombre    VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE nivel (
    idNivel    SERIAL PRIMARY KEY,
    nombre      VARCHAR(30) NOT NULL UNIQUE,
    orden       INT NOT NULL UNIQUE,
    edad_minima INT,
    edad_maxima INT,
    idEstado   INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

CREATE TABLE estilo (
    idEstilo SERIAL PRIMARY KEY,
    nombre    VARCHAR(50) NOT NULL UNIQUE,
    idEstado INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

-- Un permiso por modulo del menu. La descripcion es la clave que usa el backend.
CREATE TABLE permisos (
    idPermiso  SERIAL PRIMARY KEY,
    descripcion VARCHAR(100) NOT NULL UNIQUE
);

CREATE TABLE roles (
    idRol    SERIAL PRIMARY KEY,
    nombre    VARCHAR(30) NOT NULL UNIQUE,
    idEstado INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

-- ===================== SEDES Y AULAS =====================

CREATE TABLE sede (
    idSede   SERIAL PRIMARY KEY,
    nombre    VARCHAR(30) NOT NULL,
    direccion VARCHAR(50),
    idEstado INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

CREATE TABLE aula (
    idAula   SERIAL PRIMARY KEY,
    capacidad INT NOT NULL,
    idSede   INT NOT NULL REFERENCES sede(idSede),
    idEstado INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

-- ===================== PERSONAS Y SEGURIDAD =====================

CREATE TABLE persona (
    idPersona        SERIAL PRIMARY KEY,
    nombre            VARCHAR(100) NOT NULL,
    idTipoDocumento INT NOT NULL REFERENCES tipo_documento(idTipoDocumento),
    documento         VARCHAR(20) NOT NULL UNIQUE,
    telefono          VARCHAR(20),
    email             VARCHAR(100),
    fecha_nacimiento  DATE,
    idEstado         INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);
-- El correo es opcional: solo se valida que no se repita cuando existe.
CREATE UNIQUE INDEX uq_persona_email ON persona(email) WHERE email IS NOT NULL;

-- La llave es el documento de la persona (nunca cambia).
-- intentos_fallidos y bloqueado_hasta: bloqueo temporal tras varios logins fallidos.
CREATE TABLE usuarios (
    documento         VARCHAR(20) PRIMARY KEY REFERENCES persona(documento),
    password_hash     VARCHAR(255) NOT NULL,
    idEstado         INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado),
    intentos_fallidos INT NOT NULL DEFAULT 0,
    bloqueado_hasta   TIMESTAMP
);

CREATE TABLE usuarios_roles (
    documento VARCHAR(20) NOT NULL REFERENCES usuarios(documento),
    idRol    INT NOT NULL REFERENCES roles(idRol),
    PRIMARY KEY (documento, idRol)
);

CREATE TABLE roles_permisos (
    idRol     INT NOT NULL REFERENCES roles(idRol),
    idPermiso INT NOT NULL REFERENCES permisos(idPermiso),
    PRIMARY KEY (idRol, idPermiso)
);

CREATE TABLE acudiente (
    idAcudiente SERIAL PRIMARY KEY,
    idPersona   INT NOT NULL UNIQUE REFERENCES persona(idPersona),
    idEstado    INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

CREATE TABLE estudiante (
    idEstudiante SERIAL PRIMARY KEY,
    idSede       INT NOT NULL REFERENCES sede(idSede),
    idPersona    INT NOT NULL UNIQUE REFERENCES persona(idPersona),
    idEstado     INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

CREATE TABLE instructor (
    idInstructor SERIAL PRIMARY KEY,
    idPersona    INT NOT NULL UNIQUE REFERENCES persona(idPersona),
    descripcion   VARCHAR(100) NOT NULL,
    idEstado     INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

CREATE TABLE instructor_Sede (
    id_sedeinstru SERIAL PRIMARY KEY,
    idInstructor      INT NOT NULL REFERENCES instructor(idInstructor),
    idSede            INT NOT NULL REFERENCES sede(idSede),
    CONSTRAINT uq_instructor_sede UNIQUE (idInstructor, idSede)
);

CREATE TABLE estudiante_responsable (
    idEstudianteRes SERIAL PRIMARY KEY,
    idEstudiante             INT NOT NULL REFERENCES estudiante(idEstudiante),
    idAcudiente              INT NOT NULL REFERENCES acudiente(idAcudiente),
    idParentesco             INT NOT NULL REFERENCES parentesco(idParentesco),
    CONSTRAINT uq_estudiante_responsable UNIQUE (idEstudiante, idAcudiente)
);

-- ===================== ACADEMICO =====================

CREATE TABLE grupo (
    idGrupo      SERIAL PRIMARY KEY,
    nombre        VARCHAR(50) NOT NULL,
    idNivel      INT NOT NULL REFERENCES nivel(idNivel),
    idEstilo     INT NOT NULL REFERENCES estilo(idEstilo),
    idInstructor INT NOT NULL REFERENCES instructor(idInstructor),
    idSede       INT NOT NULL REFERENCES sede(idSede),
    idAula       INT NOT NULL REFERENCES aula(idAula),
    idtipogrup INT NOT NULL REFERENCES tipo_grupo(idtipogrup),
    capacidad     INT NOT NULL,
    idEstado     INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

-- Bloque semanal fijo: se repite cada semana mientras el grupo siga activo.
CREATE TABLE horario (
    idHorario  SERIAL PRIMARY KEY,
    idGrupo    INT NOT NULL REFERENCES grupo(idGrupo),
    dia_semana  VARCHAR(20) NOT NULL,
    hora_inicio TIME NOT NULL,
    hora_fin    TIME NOT NULL
);

-- idEstado distingue la matricula vigente de las anteriores (cambio de nivel o grupo).
CREATE TABLE matricula (
    idMatricula    SERIAL PRIMARY KEY,
    idEstudiante   INT NOT NULL REFERENCES estudiante(idEstudiante),
    idGrupo        INT NOT NULL REFERENCES grupo(idGrupo),
    fecha_matricula DATE NOT NULL,
    valor_matricula NUMERIC(10,2) NOT NULL,
    idEstado       INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

-- ===================== FINANCIERO =====================

CREATE TABLE mensualidad (
    idMensualidad SERIAL PRIMARY KEY,
    fecha_pago     DATE NOT NULL,
    valor_pagar    NUMERIC(10,2) NOT NULL,
    fecha_limite   DATE NOT NULL,
    idEstado      INT NOT NULL REFERENCES estados(idEstado),
    idMatricula   INT NOT NULL REFERENCES matricula(idMatricula)
);

-- idMensualidad e idMatricula en NULL indican un pago exclusivo de taller.
CREATE TABLE pago (
    idPago        SERIAL PRIMARY KEY,
    monto          NUMERIC(10,2) NOT NULL,
    fecha_pago     DATE NOT NULL DEFAULT CURRENT_DATE,
    idAcudiente   INT NOT NULL REFERENCES acudiente(idAcudiente),
    idMetodo      INT NOT NULL REFERENCES metodo_pago(idMetodo),
    idMensualidad INT REFERENCES mensualidad(idMensualidad),
    idMatricula   INT REFERENCES matricula(idMatricula)
);

CREATE TABLE taller (
    idTaller   SERIAL PRIMARY KEY,
    descripcion VARCHAR(50) NOT NULL,
    valor       NUMERIC(10,2),
    idEstado   INT NOT NULL DEFAULT 1 REFERENCES estados(idEstado)
);

CREATE TABLE inscripcion_talle (
    idInscripcionT SERIAL PRIMARY KEY,
    idEstudiante         INT NOT NULL REFERENCES estudiante(idEstudiante),
    idTaller             INT NOT NULL REFERENCES taller(idTaller),
    fecha_inscripcion     DATE NOT NULL DEFAULT CURRENT_DATE,
    idPago               INT NOT NULL REFERENCES pago(idPago),
    CONSTRAINT uq_inscripcion_talle UNIQUE (idEstudiante, idTaller)
);

-- ===================== CONVOCATORIAS Y COMPETENCIA =====================

CREATE TABLE convocatoria (
    idConvocatoria      SERIAL PRIMARY KEY,
    nombre               VARCHAR(50) NOT NULL,
    fecha_inicio         DATE NOT NULL,
    fecha_fin            DATE,
    descripcion          VARCHAR(300),
    idTipoconvo INT NOT NULL REFERENCES tipo_convocatoria(idTipoconvo)
);

CREATE TABLE convocatoria_estudiante (
    idConvocatoriaEst SERIAL PRIMARY KEY,
    idConvocatoria            INT NOT NULL REFERENCES convocatoria(idConvocatoria),
    idEstudiante              INT NOT NULL REFERENCES estudiante(idEstudiante),
    idEstado                  INT NOT NULL REFERENCES estados(idEstado),
    beneficio                  VARCHAR(50),
    CONSTRAINT uq_convocatoria_estudiante UNIQUE (idConvocatoria, idEstudiante)
);

CREATE TABLE grupo_competencia (
    idgrupocompe SERIAL PRIMARY KEY,
    idGrupo             INT NOT NULL UNIQUE REFERENCES grupo(idGrupo),
    idConvocatoria      INT NOT NULL REFERENCES convocatoria(idConvocatoria)
);

CREATE TABLE grupo_competencia_estudiante (
    idgrupocompe INT NOT NULL REFERENCES grupo_competencia(idgrupocompe),
    idEstudiante        INT NOT NULL REFERENCES estudiante(idEstudiante),
    PRIMARY KEY (idgrupocompe, idEstudiante)
);

-- ===================== NOTICIAS =====================

CREATE TABLE noticia (
    idNoticia        SERIAL PRIMARY KEY,
    titulo            VARCHAR(150) NOT NULL,
    contenido         TEXT NOT NULL,
    imagen_url        VARCHAR(300),
    idtiponoticia   INT NOT NULL REFERENCES tipo_noticia(idtiponoticia),
    fecha_publicacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    fecha_expiracion  TIMESTAMP,
    idEstado         INT NOT NULL REFERENCES estados(idEstado)
);
