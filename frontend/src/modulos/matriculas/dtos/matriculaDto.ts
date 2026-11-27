// Contrato de /matriculas y /portal-instructor/matriculas (docs/api.md)

// Quién revisa cada requisito
export type ResponsableRequisito = "administrador" | "instructor"

export interface RequisitoMatriculaDto {
  idRequisito: number
  nombre: string
  descripcion: string | null
  responsable: ResponsableRequisito
  cumplido: boolean
  fechaCumplido: string | null
  marcadoPor: string | null
  observacion: string | null
}

export interface MatriculaDto {
  idMatricula: number
  idEstudiante: number
  estudiante: string
  documento: string
  fecha_nacimiento: string | null
  idGrupo: number
  grupo: string
  idSede: number
  sede: string
  nivel: string
  estilo: string
  instructor: string | null
  fecha_matricula: string
  valor_matricula: string | number
  valorPagado: string | number
  saldo: string | number
  mensualidades: number
  requisitosCumplidos: number
  requisitosTotal: number
  fecha_aprobacion: string | null
  aprobadaPor: string | null
  idEstado: number
  estado: string
}

export interface MatriculaDetalleDto extends MatriculaDto {
  requisitos: RequisitoMatriculaDto[]
}

export interface EstadoMatriculaDto {
  idEstado: number
  nombre: string
}

export interface EstudianteParaMatriculaDto {
  idEstudiante: number
  nombre: string
  documento: string | null
  idSede: number
  sede: string
  fecha_nacimiento: string | null
}

export interface GrupoParaMatriculaDto {
  idGrupo: number
  nombre: string
  nivel: string
  estilo: string
  idSede: number
  sede: string
  edadMin: number | null
  edadMax: number | null
  capacidad: number
  ocupados: number
}

export interface MatriculaSolicitudDto {
  idEstudiante: number
  idGrupo: number
  fecha_matricula: string
}

// Estados del sistema: aprobada = Activo (1) y dada de baja = Inactivo (2)
export const MATRICULA_ACTIVA = 1
export const MATRICULA_INACTIVA = 2

// Etiqueta de cada estado en el módulo
export function etiquetaEstado(estado: string): string {
  const nombre = estado.trim().toLowerCase()
  if (nombre === "activo") return "Activa"
  if (nombre === "inactivo") return "Inactiva"
  if (nombre === "pendiente") return "Pendiente"
  return estado
}

export const esPendiente = (m: Pick<MatriculaDto, "idEstado">) =>
  m.idEstado !== MATRICULA_ACTIVA && m.idEstado !== MATRICULA_INACTIVA

export const cuposLibres = (g: GrupoParaMatriculaDto) => Math.max(0, g.capacidad - g.ocupados)
