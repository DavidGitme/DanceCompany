import { clienteHttp } from "@/nucleo/http/clienteHttp"

// Rutas sin sesión del sitio público (backend/app/presentacion/rutas/publico.py)

export interface PlanPublico { idPlan: number; nombre: string; meses: number; valor: string; descripcion: string | null }
export interface SedePublica { idSede: number; nombre: string; direccion: string | null; horaApertura: string | null; horaCierre: string | null }
export interface FranjaOcupada { horaInicio: string; horaFin: string; motivo: string }
export interface AulaDisponible { idAula: number; nombre: string; capacidad: number; ocupado: FranjaOcupada[] }
export interface Disponibilidad {
  idSede: number
  sede: string
  fecha: string
  dia: string
  abierta: boolean
  horaApertura: string | null
  horaCierre: string | null
  aulas: AulaDisponible[]
}
export interface EstadoPreinscripcion {
  abierta: boolean
  periodo: { idPeriodo: number; nombre: string; fecha_inicio: string; fecha_fin: string } | null
  terminosVersion: string
}

export const sitioPublico = {
  planes: () => clienteHttp.get<PlanPublico[]>("/publico/planes"),
  sedes: () => clienteHttp.get<SedePublica[]>("/publico/sedes"),
  estilos: () => clienteHttp.get<{ idEstilo: number; nombre: string }[]>("/publico/estilos"),
  tiposDocumento: () => clienteHttp.get<{ id: number; nombre: string }[]>("/publico/tipos-documento"),
  disponibilidad: (sede: number, fecha: string) =>
    clienteHttp.get<Disponibilidad>(`/publico/disponibilidad?sede=${sede}&fecha=${fecha}`),
  solicitarEspacio: (cuerpo: unknown) =>
    clienteHttp.post<{ idSolicitud: number; estado: string; correoEnviado: boolean }>("/publico/solicitudes-espacio", cuerpo),
  estadoPreinscripcion: () => clienteHttp.get<EstadoPreinscripcion>("/publico/preinscripcion"),
  preinscribir: (cuerpo: unknown) =>
    clienteHttp.post<{ idPreinscripcion: number; estado: string; correoEnviado: boolean; email: string }>("/publico/preinscripciones", cuerpo),
  confirmarPreinscripcion: (token: string) =>
    clienteHttp.post<{ mensaje: string }>("/publico/preinscripciones/confirmar", { token }),
}

// Minutos desde medianoche ("18:30" -> 1110) y de vuelta
export const aMinutos = (hora: string) => {
  const [h, m] = hora.split(":").map(Number)
  return h * 60 + m
}
export const aHora = (minutos: number) =>
  `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`

export const pesosCop = (valor: number | string) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(valor))
