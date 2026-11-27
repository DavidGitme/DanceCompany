// Contrato de POST /inscripciones y de los acudientes del estudiante (docs/api.md)

export interface PersonaNuevaDto {
  nombre: string
  idTipoDocumento: number
  documento: string
  telefono: string
  email?: string
  fecha_nacimiento?: string
}

// Una persona ya registrada (idPersona) o los datos de una nueva
export interface AcudienteSolicitudDto {
  idPersona?: number
  persona?: PersonaNuevaDto
  idParentesco: number
}

export interface InscripcionSolicitudDto {
  nombre: string
  idTipoDocumento: number
  documento: string
  telefono: string
  email?: string
  fecha_nacimiento: string
  idSede: number
  acudientes: AcudienteSolicitudDto[]
  // La matrícula tiene precio único y queda pendiente de aprobación
  idGrupo?: number
  // Cuenta del portal: el usuario es el documento. Con clave la entrega la sede;
  // sin clave le llega al estudiante un enlace por correo para crearla
  crearCuenta?: boolean
  clave?: string
}

export interface AcudienteDto {
  idAcudiente: number
  idPersona: number
  nombre: string
  tipoDocumento: string
  documento: string
  telefono: string | null
  email: string | null
  idParentesco: number
  parentesco: string
}

// PUT /estudiantes/{id}/acudientes/{idAcudiente}
export interface AcudienteEdicionDto {
  nombre: string
  telefono: string
  email?: string
  idParentesco: number
}

export interface InscripcionRespuestaDto {
  estudiante: { idEstudiante: number; nombre: string }
  acudientes: AcudienteDto[]
  idMatricula: number | null
  cuentaCreada: boolean
  correoEnviado: boolean | null
  aviso: string | null
}

// La API devuelve lo mínimo para reconocer a la persona (sin contacto)
export interface PersonaEncontradaDto {
  idPersona: number
  nombre: string
  tipoDocumento: string
  documento: string
  esAcudiente: boolean
}
