/* Contratos de /api/v1/portal-estudiante y sus mappers a modelos de la vista.
   El backend envía el dinero como texto decimal ("150000.00"): aquí se convierte a número. */

// ---------- DTO (lo que responde la API) ----------
export interface AcudienteDto {
  idAcudiente: number
  nombre: string
  documento: string
  parentesco: string
}

export interface PerfilDto {
  idEstudiante: number
  nombre: string
  tipoDocumento: string
  documento: string
  email: string | null
  telefono: string | null
  fecha_nacimiento: string | null
  edad: number | null
  sede: string
  direccionSede: string | null
  estado: string
  acudientes: AcudienteDto[]
}

export interface BloqueHorarioDto {
  dia_semana: string
  hora_inicio: string
  hora_fin: string
}

export interface ClaseDto {
  idMatricula: number
  idGrupo: number
  grupo: string
  nivel: string
  estilo: string
  instructor: string
  sede: string
  idAula: number
  fecha_matricula: string
  estado: string
  horarios: BloqueHorarioDto[]
}

export interface ClasesDto {
  vigentes: ClaseDto[]
  historial: ClaseDto[]
}

export interface FinanzasDto {
  resumen: {
    saldoPendiente: string
    totalPagado: string
    mensualidadesPendientes: number
    proximoVencimiento: string | null
  }
  matriculas: {
    idMatricula: number
    grupo: string
    valor_matricula: string
    valorPagado: string
    saldo: string
    estado: string
  }[]
  mensualidades: {
    idMensualidad: number
    grupo: string
    periodo: string
    valor_pagar: string
    fecha_limite: string
    valorPagado: string
    saldo: string
    estado: string
  }[]
  pagos: {
    idPago: number
    concepto: string
    monto: string
    fecha_pago: string
    metodo: string
    pagador: string
  }[]
}

export interface TalleresDto {
  inscritos: {
    idInscripcion: number
    idTaller: number
    taller: string
    fecha_inscripcion: string
    monto: string
    metodo: string
  }[]
  disponibles: { idTaller: number; descripcion: string; valor: string }[]
}

export interface ConvocatoriasDto {
  abiertas: {
    idConvocatoria: number
    nombre: string
    tipoConvocatoria: string
    descripcion: string | null
    fecha_inicio: string
    fecha_fin: string | null
    yaPostulado: boolean
  }[]
  postulaciones: {
    idPostulacion: number
    convocatoria: string
    vigencia: string
    estado: string
    beneficio: string | null
  }[]
}

export interface NoticiaPublicaDto {
  idNoticia: number
  titulo: string
  contenido: string
  imagen_url: string | null
  tipoNoticia: string
  fecha_publicacion: string
  fecha_expiracion: string | null
}

// ---------- Modelos (lo que usan las páginas) ----------
export type Perfil = PerfilDto
export type BloqueHorario = { dia: string; inicio: string; fin: string }

export interface Clase {
  idMatricula: number
  grupo: string
  nivel: string
  estilo: string
  instructor: string
  sede: string
  aula: number
  fechaMatricula: string
  estado: string
  horarios: BloqueHorario[]
}

export interface Finanzas {
  saldoPendiente: number
  totalPagado: number
  mensualidadesPendientes: number
  proximoVencimiento: string | null
  matriculas: { id: number; grupo: string; valor: number; pagado: number; saldo: number; estado: string }[]
  mensualidades: {
    id: number
    grupo: string
    periodo: string
    valor: number
    fechaLimite: string
    pagado: number
    saldo: number
    estado: string
  }[]
  pagos: { id: number; concepto: string; monto: number; fecha: string; metodo: string; pagador: string }[]
}

export interface Talleres {
  inscritos: { id: number; taller: string; fecha: string; monto: number; metodo: string }[]
  disponibles: { id: number; descripcion: string; valor: number }[]
}

export interface Convocatorias {
  abiertas: {
    id: number
    nombre: string
    tipo: string
    descripcion: string | null
    fechaInicio: string
    fechaFin: string | null
    yaPostulado: boolean
  }[]
  postulaciones: { id: number; convocatoria: string; vigencia: string; estado: string; beneficio: string | null }[]
}

export interface Noticia {
  id: number
  titulo: string
  contenido: string
  imagen: string | null
  tipo: string
  fecha: string
}

const dinero = (valor: string | number | null | undefined) => Number(valor ?? 0)

export const clasesAModelo = (dto: ClasesDto): { vigentes: Clase[]; historial: Clase[] } => {
  const clase = (c: ClaseDto): Clase => ({
    idMatricula: c.idMatricula,
    grupo: c.grupo,
    nivel: c.nivel,
    estilo: c.estilo,
    instructor: c.instructor,
    sede: c.sede,
    aula: c.idAula,
    fechaMatricula: c.fecha_matricula,
    estado: c.estado,
    horarios: c.horarios.map((h) => ({ dia: h.dia_semana, inicio: h.hora_inicio, fin: h.hora_fin })),
  })
  return { vigentes: dto.vigentes.map(clase), historial: dto.historial.map(clase) }
}

export const finanzasAModelo = (dto: FinanzasDto): Finanzas => ({
  saldoPendiente: dinero(dto.resumen.saldoPendiente),
  totalPagado: dinero(dto.resumen.totalPagado),
  mensualidadesPendientes: dto.resumen.mensualidadesPendientes,
  proximoVencimiento: dto.resumen.proximoVencimiento,
  matriculas: dto.matriculas.map((m) => ({
    id: m.idMatricula,
    grupo: m.grupo,
    valor: dinero(m.valor_matricula),
    pagado: dinero(m.valorPagado),
    saldo: dinero(m.saldo),
    estado: m.estado,
  })),
  mensualidades: dto.mensualidades.map((m) => ({
    id: m.idMensualidad,
    grupo: m.grupo,
    periodo: m.periodo,
    valor: dinero(m.valor_pagar),
    fechaLimite: m.fecha_limite,
    pagado: dinero(m.valorPagado),
    saldo: dinero(m.saldo),
    estado: m.estado,
  })),
  pagos: dto.pagos.map((p) => ({
    id: p.idPago,
    concepto: p.concepto,
    monto: dinero(p.monto),
    fecha: p.fecha_pago,
    metodo: p.metodo,
    pagador: p.pagador,
  })),
})

export const talleresAModelo = (dto: TalleresDto): Talleres => ({
  inscritos: dto.inscritos.map((i) => ({
    id: i.idInscripcion,
    taller: i.taller,
    fecha: i.fecha_inscripcion,
    monto: dinero(i.monto),
    metodo: i.metodo,
  })),
  disponibles: dto.disponibles.map((t) => ({ id: t.idTaller, descripcion: t.descripcion, valor: dinero(t.valor) })),
})

export const convocatoriasAModelo = (dto: ConvocatoriasDto): Convocatorias => ({
  abiertas: dto.abiertas.map((c) => ({
    id: c.idConvocatoria,
    nombre: c.nombre,
    tipo: c.tipoConvocatoria,
    descripcion: c.descripcion,
    fechaInicio: c.fecha_inicio,
    fechaFin: c.fecha_fin,
    yaPostulado: c.yaPostulado,
  })),
  postulaciones: dto.postulaciones.map((p) => ({
    id: p.idPostulacion,
    convocatoria: p.convocatoria,
    vigencia: p.vigencia,
    estado: p.estado,
    beneficio: p.beneficio,
  })),
})

export const noticiaAModelo = (dto: NoticiaPublicaDto): Noticia => ({
  id: dto.idNoticia,
  titulo: dto.titulo,
  contenido: dto.contenido,
  imagen: dto.imagen_url,
  tipo: dto.tipoNoticia,
  fecha: dto.fecha_publicacion,
})
