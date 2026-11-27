import { recursoApi } from "@/compartido/api/recursos"
import type { DefinicionRecurso, Opcion, Valores } from "@/compartido/ui/PantallaRecurso"
import StatusBadge from "@/compartido/ui/StatusBadge"
import {
  ProgresoRequisitos,
  cuposLibres,
  etiquetaEstado,
  formatoFechaHora,
  type EstadoMatriculaDto,
  type GrupoParaMatriculaDto,
  type MatriculaDto,
} from "@/modulos/matriculas"

/*
 * Definición de cada módulo conectado a la API. Los campos, límites y reglas
 * siguen los DTO del backend (backend/app/aplicacion/dtos) y las tablas de Neon.
 */

/* ─── Tipos de respuesta de la API ─── */

interface ConEstado {
  idEstado: number
  estado: string
}
export interface Sede extends ConEstado { idSede: number; nombre: string; direccion: string | null; gruposActivos: number; estudiantesActivos: number }
export interface Estilo extends ConEstado { idEstilo: number; nombre: string; gruposActivos: number }
export interface Nivel extends ConEstado { idNivel: number; nombre: string; orden: number; edadMin: number | null; edadMax: number | null; gruposActivos: number }
export interface Taller extends ConEstado { idTaller: number; descripcion: string; valor: string | number }
interface PersonaApi {
  idPersona: number
  nombre: string
  idTipoDocumento: number
  tipoDocumento: string
  documento: string | null
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
}
export interface Instructor extends PersonaApi, ConEstado {
  idInstructor: number
  descripcion: string | null
  sedes: { idSede: number; nombre: string }[]
  gruposActivos: number
  tieneCuenta: boolean
}
export interface Estudiante extends PersonaApi, ConEstado {
  idEstudiante: number
  idSede: number
  sede: string
  grupos: { idGrupo: number; nombre: string }[]
}
export interface Grupo extends ConEstado {
  idGrupo: number
  nombre: string
  idNivel: number
  nivel: string
  idEstilo: number
  estilo: string
  idInstructor: number
  instructor: string
  idSede: number
  sede: string
  idAula: number
  idTipoGrupo: number
  tipoGrupo: string
  capacidad: number
  matriculados: number
}
export interface Aula extends ConEstado { idAula: number; capacidad: number; idSede: number; sede: string; gruposActivos: number }
export interface MetodoPago { idMetodo: number; nombre: string; registrosAsociados: number }

/* ─── Utilidades ─── */

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
export const formatoPesos = (valor: string | number) => pesos.format(Number(valor))

const texto = (v: Valores, clave: string) => String(v[clave] ?? "").trim()
const numero = (v: Valores, clave: string) => Number(texto(v, clave))
// Solo envía los campos opcionales que tienen valor
const opcional = (v: Valores, clave: string) => (texto(v, clave) ? texto(v, clave) : undefined)
const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

const opcionesDe = async <T,>(ruta: string, valor: keyof T, etiqueta: (item: T) => string): Promise<Opcion[]> =>
  (await recursoApi.opciones<T>(ruta)).map((item) => ({ valor: String(item[valor]), etiqueta: etiqueta(item) }))

// Catálogos de la base (tipo_documento y parentesco), en orden de la API
export const opcionesCatalogo = async (ruta: string): Promise<Opcion[]> =>
  (await recursoApi.opciones<{ id: number; nombre: string }>(ruta)).map((c) => ({
    valor: String(c.id),
    etiqueta: c.nombre,
  }))

const fuentesComunes = {
  sedes: () => opcionesDe<{ idSede: number; nombre: string }>("/sedes/disponibles", "idSede", (s) => s.nombre),
  niveles: () => opcionesDe<{ idNivel: number; nombre: string }>("/niveles/disponibles", "idNivel", (n) => n.nombre),
  estilos: () => opcionesDe<{ idEstilo: number; nombre: string }>("/estilos/disponibles", "idEstilo", (e) => e.nombre),
  tiposDocumento: () => opcionesCatalogo("/catalogos/tipos-documento"),
}

/* ─── Datos personales compartidos por instructores y estudiantes ─── */

const camposPersona = [
  { clave: "nombre", etiqueta: "Nombre completo", requerido: true, min: 2, max: 100, seccion: "Datos personales", nombrePersona: true },
  { clave: "idTipoDocumento", etiqueta: "Tipo de documento", tipo: "seleccion", fuente: "tiposDocumento", requerido: true, ancho: "mitad" },
  { clave: "documento", etiqueta: "Número de documento", requerido: true, min: 5, max: 20, ancho: "mitad" },
  { clave: "telefono", etiqueta: "Teléfono", tipo: "tel", max: 10, ancho: "mitad", placeholder: "3001234567", ayuda: "10 dígitos, sin espacios." },
  { clave: "email", etiqueta: "Correo electrónico", tipo: "email", max: 100, ancho: "mitad" },
  { clave: "fecha_nacimiento", etiqueta: "Fecha de nacimiento", tipo: "fecha", ancho: "mitad" },
] as const

const personaAFormulario = (p: PersonaApi): Valores => ({
  nombre: p.nombre,
  idTipoDocumento: String(p.idTipoDocumento),
  documento: p.documento ?? "",
  telefono: p.telefono ?? "",
  email: p.email ?? "",
  fecha_nacimiento: p.fecha_nacimiento ?? "",
})

const personaASolicitud = (v: Valores) => ({
  nombre: texto(v, "nombre"),
  idTipoDocumento: numero(v, "idTipoDocumento"),
  documento: texto(v, "documento"),
  telefono: opcional(v, "telefono"),
  email: opcional(v, "email"),
  fecha_nacimiento: opcional(v, "fecha_nacimiento"),
})

const validarFecha = (v: Valores): Record<string, string> =>
  texto(v, "fecha_nacimiento") && new Date(texto(v, "fecha_nacimiento")) > new Date()
    ? { fecha_nacimiento: "La fecha de nacimiento no puede ser futura." }
    : {}

// Teléfono colombiano: exactamente 10 dígitos (el backend aplica la misma regla)
// Se cuentan dígitos: si pasa de 10 el mensaje lo dice
export const errorTelefono = (valor: string): string | undefined => {
  const digitos = valor.replace(/\D/g, "")
  if (!valor) return undefined
  if (digitos.length > 10) return `El teléfono admite máximo 10 dígitos (tiene ${digitos.length}).`
  return /^\d{10}$/.test(valor.replace(/[\s-]/g, "")) ? undefined : "El teléfono debe tener exactamente 10 dígitos."
}

// Cédula, tarjeta de identidad y registro civil: solo números (el pasaporte admite letras)
export const errorDocumento = (valor: string, tipo: string | undefined): string | undefined => {
  const limpio = valor.replace(/[\s.-]/g, "")
  if (!limpio) return undefined
  if (!/^[A-Za-z0-9]+$/.test(limpio)) return "Usa solo letras y números."
  if (!/pasaporte/i.test(tipo ?? "") && !/^\d+$/.test(limpio)) return "Este tipo de documento solo admite números."
  if (limpio.length < 5 || limpio.length > 20) return "El documento debe tener entre 5 y 20 caracteres."
  return undefined
}

const validarNacimiento = (v: Valores, opciones: Record<string, Opcion[]> = {}): Record<string, string> => {
  const errores: Record<string, string> = { ...validarFecha(v) }
  const telefono = errorTelefono(texto(v, "telefono"))
  if (telefono) errores.telefono = telefono
  const tipo = opciones.tiposDocumento?.find((o) => o.valor === texto(v, "idTipoDocumento"))?.etiqueta
  const documento = errorDocumento(texto(v, "documento"), tipo)
  if (documento) errores.documento = documento
  return errores
}

const avisoGrupos = (n: number) => (n > 0 ? `Tiene ${plural(n, "grupo activo", "grupos activos")}; revisa esos grupos antes de continuar.` : undefined)

/* ─── Definiciones ─── */

export const sedes: DefinicionRecurso<Sede> = {
  id: "sedes",
  titulo: "Sedes",
  singular: "sede",
  genero: "f",
  grupo: "Catálogos",
  descripcion: "Lugares donde la academia dicta clases. Se usan en estudiantes, instructores, aulas y grupos.",
  ruta: "/sedes",
  idClave: "idSede",
  nombreFila: (s) => s.nombre,
  conEstado: true,
  buscarPlaceholder: "Buscar por nombre o dirección…",
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "direccion", etiqueta: "Dirección", render: (s) => s.direccion ?? "—" },
    { clave: "gruposActivos", etiqueta: "Grupos activos", alinear: "derecha" },
    { clave: "estudiantesActivos", etiqueta: "Estudiantes activos", alinear: "derecha" },
  ],
  campos: [
    { clave: "nombre", etiqueta: "Nombre", requerido: true, max: 30, placeholder: "Ej. Bello" },
    { clave: "direccion", etiqueta: "Dirección", max: 50, placeholder: "Ej. Cra 45 #12-30" },
  ],
  aFormulario: (s) => ({ nombre: s.nombre, direccion: s.direccion ?? "" }),
  aSolicitud: (v) => ({ nombre: texto(v, "nombre"), direccion: opcional(v, "direccion") }),
  avisoInactivar: (s) => avisoGrupos(s.gruposActivos),
}

export const estilos: DefinicionRecurso<Estilo> = {
  id: "estilos",
  titulo: "Estilos",
  singular: "estilo",
  genero: "m",
  grupo: "Catálogos",
  descripcion: "Estilos de baile que se ofrecen en los grupos.",
  ruta: "/estilos",
  idClave: "idEstilo",
  nombreFila: (e) => e.nombre,
  conEstado: true,
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "gruposActivos", etiqueta: "Grupos activos", alinear: "derecha" },
  ],
  campos: [{ clave: "nombre", etiqueta: "Nombre", requerido: true, max: 50, placeholder: "Ej. Hip Hop" }],
  aFormulario: (e) => ({ nombre: e.nombre }),
  aSolicitud: (v) => ({ nombre: texto(v, "nombre") }),
  avisoInactivar: (e) => avisoGrupos(e.gruposActivos),
}

export const niveles: DefinicionRecurso<Nivel> = {
  id: "niveles",
  titulo: "Niveles",
  singular: "nivel",
  genero: "m",
  grupo: "Catálogos",
  descripcion: "Secuencia de aprendizaje y rango de edad que acepta cada nivel al matricular.",
  ruta: "/niveles",
  idClave: "idNivel",
  nombreFila: (n) => n.nombre,
  conEstado: true,
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "orden", etiqueta: "Orden", alinear: "derecha" },
    { clave: "edades", etiqueta: "Edades", render: (n) => (n.edadMin !== null && n.edadMax !== null ? `${n.edadMin} a ${n.edadMax} años` : "—") },
    { clave: "gruposActivos", etiqueta: "Grupos activos", alinear: "derecha" },
  ],
  campos: [
    { clave: "nombre", etiqueta: "Nombre", requerido: true, max: 30, placeholder: "Ej. Básico" },
    { clave: "orden", etiqueta: "Orden", tipo: "numero", requerido: true, min: 1, ancho: "mitad", ayuda: "1 es el nivel más básico. No se puede repetir." },
    { clave: "edadMin", etiqueta: "Edad mínima", tipo: "numero", requerido: true, min: 0, max: 99, ancho: "mitad" },
    { clave: "edadMax", etiqueta: "Edad máxima", tipo: "numero", requerido: true, min: 0, max: 99, ancho: "mitad" },
  ],
  aFormulario: (n) => ({ nombre: n.nombre, orden: String(n.orden), edadMin: String(n.edadMin ?? ""), edadMax: String(n.edadMax ?? "") }),
  aSolicitud: (v) => ({ nombre: texto(v, "nombre"), orden: numero(v, "orden"), edadMin: numero(v, "edadMin"), edadMax: numero(v, "edadMax") }),
  validar: (v): Record<string, string> =>
    numero(v, "edadMax") <= numero(v, "edadMin") ? { edadMax: "La edad máxima debe ser mayor que la mínima." } : {},
  avisoInactivar: (n) => avisoGrupos(n.gruposActivos),
}

export const talleres: DefinicionRecurso<Taller> = {
  id: "talleres",
  titulo: "Talleres",
  singular: "taller",
  genero: "m",
  grupo: "Catálogos",
  descripcion: "Talleres con costo propio a los que se inscriben los estudiantes.",
  ruta: "/talleres",
  idClave: "idTaller",
  nombreFila: (t) => t.descripcion,
  conEstado: true,
  buscarPlaceholder: "Buscar por descripción…",
  columnas: [
    { clave: "descripcion", etiqueta: "Descripción" },
    { clave: "valor", etiqueta: "Valor", alinear: "derecha", render: (t) => formatoPesos(t.valor) },
  ],
  campos: [
    { clave: "descripcion", etiqueta: "Descripción", requerido: true, max: 50, placeholder: "Ej. Taller de maquillaje escénico" },
    { clave: "valor", etiqueta: "Valor (COP)", tipo: "numero", requerido: true, min: 0, ancho: "mitad", ayuda: "En pesos colombianos, sin puntos." },
  ],
  aFormulario: (t) => ({ descripcion: t.descripcion, valor: String(Number(t.valor)) }),
  aSolicitud: (v) => ({ descripcion: texto(v, "descripcion"), valor: numero(v, "valor") }),
}

export const instructores: DefinicionRecurso<Instructor> = {
  id: "instructores",
  titulo: "Instructores",
  singular: "instructor",
  genero: "m",
  grupo: "Gestión humana",
  descripcion: "Registra al instructor y sus sedes. Su cuenta se crea después con «Invitar».",
  ruta: "/instructores",
  idClave: "idInstructor",
  nombreFila: (i) => i.nombre,
  conEstado: true,
  buscarPlaceholder: "Buscar por nombre o documento…",
  filtros: [{ clave: "sede", etiqueta: "Sede", fuente: "sedes" }],
  fuentes: fuentesComunes,
  valoresIniciales: { idTipoDocumento: "1", sedes: [] },
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "documento", etiqueta: "Documento", render: (i) => i.documento ?? "—" },
    { clave: "sedes", etiqueta: "Sedes", render: (i) => i.sedes.map((s) => s.nombre).join(", ") || "—" },
    { clave: "gruposActivos", etiqueta: "Grupos activos", alinear: "derecha" },
    { clave: "tieneCuenta", etiqueta: "Acceso al portal", render: (i) => (i.tieneCuenta ? "Sí" : "No") },
  ],
  campos: [
    ...camposPersona,
    { clave: "descripcion", etiqueta: "Descripción / especialidad", tipo: "area", max: 100, seccion: "Datos del instructor" },
    { clave: "sedes", etiqueta: "Sedes asignadas", tipo: "multiple", fuente: "sedes", requerido: true },
  ],
  aFormulario: (i) => ({ ...personaAFormulario(i), descripcion: i.descripcion ?? "", sedes: i.sedes.map((s) => String(s.idSede)) }),
  aSolicitud: (v) => ({
    ...personaASolicitud(v),
    descripcion: opcional(v, "descripcion"),
    sedes: (v.sedes as string[]).map(Number),
  }),
  validar: validarNacimiento,
  avisoInactivar: (i) => avisoGrupos(i.gruposActivos),
}

export const estudiantes: DefinicionRecurso<Estudiante> = {
  id: "estudiantes",
  titulo: "Estudiantes",
  singular: "estudiante",
  genero: "m",
  grupo: "Matrícula y pagos",
  descripcion: "Los estudiantes se registran con la inscripción presencial. Aquí se editan sus datos, acudientes y sede.",
  ruta: "/estudiantes",
  idClave: "idEstudiante",
  nombreFila: (e) => e.nombre,
  conEstado: true,
  // Tiene su propia ficha de solo lectura (con grupos y acudientes)
  sinVer: true,
  buscarPlaceholder: "Buscar por nombre o documento…",
  filtros: [{ clave: "sede", etiqueta: "Sede", fuente: "sedes" }],
  fuentes: fuentesComunes,
  valoresIniciales: { idTipoDocumento: "2" },
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "documento", etiqueta: "Documento", render: (e) => e.documento ?? "—" },
    { clave: "tipoDocumento", etiqueta: "Tipo" },
    { clave: "sede", etiqueta: "Sede" },
    { clave: "grupos", etiqueta: "Grupos", render: (e) => e.grupos.map((g) => g.nombre).join(", ") || "Sin matrícula" },
  ],
  // Teléfono y fecha de nacimiento son obligatorios para el estudiante (el backend también lo exige).
  // Orden: tipo y número de documento, fecha de nacimiento, nombre completo y luego contacto
  campos: [
    ...["idTipoDocumento", "documento", "fecha_nacimiento", "nombre", "telefono", "email"].map((clave, i) => {
      const c = camposPersona.find((campo) => campo.clave === clave)!
      return {
        ...c,
        ...(clave === "telefono" || clave === "fecha_nacimiento" ? { requerido: true } : {}),
        // La sección va en el primer campo
        ...(i === 0 ? { seccion: "Datos personales" } : { seccion: undefined }),
        ...(clave === "nombre" ? { ancho: "mitad" as const } : {}),
      }
    }),
    {
      clave: "idSede", etiqueta: "Sede", tipo: "seleccion", fuente: "sedes", requerido: true,
      seccion: "Datos del estudiante", ancho: "mitad",
      ayuda: "Cambiarla es un traslado: primero inactiva su matrícula activa.",
    },
  ],
  permiteCambiarSede: true,
  aFormulario: (e) => ({ ...personaAFormulario(e), idSede: String(e.idSede) }),
  aSolicitud: (v) => ({ ...personaASolicitud(v), idSede: numero(v, "idSede") }),
  validar: validarNacimiento,
}

export const grupos: DefinicionRecurso<Grupo> = {
  id: "grupos",
  titulo: "Grupos",
  singular: "grupo",
  genero: "m",
  grupo: "Clases",
  descripcion: "Cada grupo une nivel, estilo, instructor, sede y aula. Solo acepta registros activos.",
  ruta: "/grupos",
  idClave: "idGrupo",
  nombreFila: (g) => g.nombre,
  conEstado: true,
  buscarPlaceholder: "Buscar por nombre del grupo…",
  filtros: [
    { clave: "sede", etiqueta: "Sede", fuente: "sedes" },
    { clave: "nivel", etiqueta: "Nivel", fuente: "niveles" },
    { clave: "estilo", etiqueta: "Estilo", fuente: "estilos" },
    { clave: "instructor", etiqueta: "Instructor", fuente: "instructores" },
  ],
  fuentes: {
    ...fuentesComunes,
    instructores: () => opcionesDe<{ idInstructor: number; nombre: string }>("/instructores/disponibles", "idInstructor", (i) => i.nombre),
    tiposGrupo: () => opcionesDe<{ idTipoGrupo: number; nombre: string }>("/grupos/tipos", "idTipoGrupo", (t) => t.nombre),
    aulasSede: async (v) =>
      (await recursoApi.opciones<{ idAula: number; capacidad: number }>("/grupos/aulas", { sede: texto(v, "idSede") })).map((a) => ({
        valor: String(a.idAula),
        etiqueta: `Aula ${a.idAula} · ${a.capacidad} cupos`,
        extra: { capacidad: a.capacidad },
      })),
    // Solo instructores activos asignados a la sede elegida (regla del backend)
    instructoresSede: async (v) =>
      (await recursoApi.listar<Instructor>("/instructores", { sede: texto(v, "idSede"), estado: 1, tamano: 100 })).datos.map((i) => ({
        valor: String(i.idInstructor),
        etiqueta: i.nombre,
      })),
  },
  columnas: [
    { clave: "nombre", etiqueta: "Grupo" },
    { clave: "nivel", etiqueta: "Nivel / estilo", render: (g) => `${g.nivel} · ${g.estilo}` },
    { clave: "instructor", etiqueta: "Instructor" },
    { clave: "sede", etiqueta: "Sede y aula", render: (g) => `${g.sede} · Aula ${g.idAula}` },
    { clave: "cupos", etiqueta: "Cupos", alinear: "derecha", render: (g) => `${g.matriculados} / ${g.capacidad}` },
    { clave: "tipoGrupo", etiqueta: "Tipo" },
  ],
  campos: [
    { clave: "nombre", etiqueta: "Nombre del grupo", requerido: true, max: 50, placeholder: "Ej. Hip Hop Básico (Lun-Mié)" },
    { clave: "idNivel", etiqueta: "Nivel", tipo: "seleccion", fuente: "niveles", requerido: true, ancho: "mitad" },
    { clave: "idEstilo", etiqueta: "Estilo", tipo: "seleccion", fuente: "estilos", requerido: true, ancho: "mitad" },
    { clave: "idTipoGrupo", etiqueta: "Tipo de grupo", tipo: "seleccion", fuente: "tiposGrupo", requerido: true, ancho: "mitad" },
    { clave: "idSede", etiqueta: "Sede", tipo: "seleccion", fuente: "sedes", requerido: true, ancho: "mitad", seccion: "Lugar y responsable" },
    { clave: "idAula", etiqueta: "Aula", tipo: "seleccion", fuente: "aulasSede", dependeDe: "idSede", requerido: true, ancho: "mitad" },
    { clave: "idInstructor", etiqueta: "Instructor", tipo: "seleccion", fuente: "instructoresSede", dependeDe: "idSede", requerido: true, ancho: "mitad", ayuda: "Solo aparecen instructores asignados a la sede." },
    { clave: "capacidad", etiqueta: "Capacidad", tipo: "numero", requerido: true, min: 1, max: 200, ancho: "mitad", ayuda: "No puede superar la capacidad del aula." },
  ],
  aFormulario: (g) => ({
    nombre: g.nombre,
    idNivel: String(g.idNivel),
    idEstilo: String(g.idEstilo),
    idTipoGrupo: String(g.idTipoGrupo),
    idSede: String(g.idSede),
    idAula: String(g.idAula),
    idInstructor: String(g.idInstructor),
    capacidad: String(g.capacidad),
  }),
  aSolicitud: (v) => ({
    nombre: texto(v, "nombre"),
    idNivel: numero(v, "idNivel"),
    idEstilo: numero(v, "idEstilo"),
    idTipoGrupo: numero(v, "idTipoGrupo"),
    idSede: numero(v, "idSede"),
    idAula: numero(v, "idAula"),
    idInstructor: numero(v, "idInstructor"),
    capacidad: numero(v, "capacidad"),
  }),
  validar: (v, opciones): Record<string, string> => {
    const aula = opciones.aulasSede?.find((a) => a.valor === texto(v, "idAula"))
    const maximo = Number(aula?.extra?.capacidad)
    return maximo && numero(v, "capacidad") > maximo ? { capacidad: `El aula tiene ${maximo} cupos.` } : {}
  },
}

export const aulas: DefinicionRecurso<Aula> = {
  id: "aulas",
  titulo: "Aulas",
  singular: "aula",
  genero: "f",
  grupo: "Clases",
  descripcion: "Salones de cada sede. La capacidad limita los cupos de los grupos que la usan.",
  ruta: "/aulas",
  idClave: "idAula",
  nombreFila: (a) => `Aula ${a.idAula} (${a.sede})`,
  conEstado: true,
  buscarPlaceholder: "Buscar por sede…",
  filtros: [{ clave: "sede", etiqueta: "Sede", fuente: "sedes" }],
  fuentes: fuentesComunes,
  columnas: [
    { clave: "idAula", etiqueta: "Aula", render: (a) => `Aula ${a.idAula}` },
    { clave: "sede", etiqueta: "Sede" },
    { clave: "capacidad", etiqueta: "Capacidad", alinear: "derecha", render: (a) => plural(a.capacidad, "cupo", "cupos") },
    { clave: "gruposActivos", etiqueta: "Grupos activos", alinear: "derecha" },
  ],
  campos: [
    { clave: "idSede", etiqueta: "Sede", tipo: "seleccion", fuente: "sedes", requerido: true, ancho: "mitad" },
    { clave: "capacidad", etiqueta: "Capacidad", tipo: "numero", requerido: true, min: 1, max: 200, ancho: "mitad", ayuda: "Personas que caben en el aula." },
  ],
  aFormulario: (a) => ({ idSede: String(a.idSede), capacidad: String(a.capacidad) }),
  aSolicitud: (v) => ({ idSede: numero(v, "idSede"), capacidad: numero(v, "capacidad") }),
  avisoInactivar: (a) => avisoGrupos(a.gruposActivos),
}

export const metodosPago: DefinicionRecurso<MetodoPago> = {
  id: "metodos-pago",
  titulo: "Métodos de pago",
  singular: "método de pago",
  genero: "m",
  grupo: "Catálogos",
  descripcion: "Formas de pago disponibles al registrar pagos. Solo se pueden eliminar si no tienen pagos.",
  ruta: "/metodos-pago",
  idClave: "idMetodo",
  nombreFila: (m) => m.nombre,
  eliminable: true,
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "registrosAsociados", etiqueta: "Pagos registrados", alinear: "derecha" },
  ],
  campos: [{ clave: "nombre", etiqueta: "Nombre", requerido: true, max: 30, placeholder: "Ej. Nequi" }],
  aFormulario: (m) => ({ nombre: m.nombre }),
  aSolicitud: (v) => ({ nombre: texto(v, "nombre") }),
  bloqueoEliminar: (m) =>
    m.registrosAsociados > 0 ? `No se puede eliminar: tiene ${plural(m.registrosAsociados, "pago registrado", "pagos registrados")}.` : undefined,
}


/* ─── Matrículas, convocatorias, postulaciones y grupos de competencia ─── */

// Contrato en modulos/matriculas/dtos (incluye requisitos y aprobación)
export type Matricula = MatriculaDto

export interface Convocatoria {
  idConvocatoria: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string | null
  descripcion: string | null
  idTipoConvocatoria: number
  tipoConvocatoria: string
  vigencia: string
  postulados: number
  aceptados: number
}

export interface Postulacion {
  idPostulacion: number
  idConvocatoria: number
  convocatoria: string
  vigencia: string
  idEstudiante: number
  estudiante: string
  documento: string
  sede: string
  idEstado: number
  estado: string
  beneficio: string | null
}

export interface GrupoCompetencia {
  idGrupoCompetencia: number
  idGrupo: number
  grupo: string
  idSede: number
  sede: string
  idConvocatoria: number
  convocatoria: string
  vigencia: string
  integrantes: number
  estudiantes: { idEstudiante: number; nombre: string; documento: string }[]
}

export interface PersonaSeguridad {
  idPersona: number
  nombre: string
  idTipoDocumento: number | null
  documento: string
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  idEstado: number
}

export interface EstadoCatalogo {
  idEstado: number
  nombre: string
  categoria: string
  descripcion: string | null
  orden: number | null
}

// Estados de una postulación (tabla estados, categoría postulacion)
export const POSTULACION = { postulado: 7, aceptado: 8, rechazado: 9 } as const

const fecha = (valor: string | null) =>
  valor ? new Date(`${valor}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—"

const fuentesAcademicas = {
  ...fuentesComunes,
  estudiantesActivos: () =>
    opcionesDe<{ idEstudiante: number; nombre: string; documento: string | null }>(
      "/estudiantes/disponibles", "idEstudiante", (e) => `${e.nombre}${e.documento ? ` · ${e.documento}` : ""}`,
    ),
  gruposActivos: () =>
    opcionesDe<{ idGrupo: number; nombre: string; sede: string }>("/grupos/disponibles", "idGrupo", (g) => `${g.nombre} · ${g.sede}`),
  convocatoriasAbiertas: () =>
    opcionesDe<{ idConvocatoria: number; nombre: string; tipoConvocatoria: string }>(
      "/convocatorias/disponibles", "idConvocatoria", (c) => `${c.nombre} (${c.tipoConvocatoria})`,
    ),
  // Todas las convocatorias, para filtrar listas (incluye cerradas)
  convocatorias: async () =>
    (await recursoApi.listar<Convocatoria>("/convocatorias", { tamano: 100 })).datos.map((c) => ({
      valor: String(c.idConvocatoria),
      etiqueta: c.nombre,
    })),
  tiposConvocatoria: () =>
    opcionesDe<{ idTipoConvocatoria: number; nombre: string }>("/tipos-convocatoria/disponibles", "idTipoConvocatoria", (t) => t.nombre),
  vigencias: async () => [
    { valor: "proxima", etiqueta: "Próximas" },
    { valor: "abierta", etiqueta: "Abiertas" },
    { valor: "cerrada", etiqueta: "Cerradas" },
  ],
  estadosPostulacion: async () => [
    { valor: String(POSTULACION.postulado), etiqueta: "Postulado" },
    { valor: String(POSTULACION.aceptado), etiqueta: "Aceptado" },
    { valor: String(POSTULACION.rechazado), etiqueta: "Rechazado" },
  ],
  candidatos: async (v: Valores) =>
    (
      await recursoApi.opciones<{ idEstudiante: number; nombre: string; documento: string }>("/grupos-competencia/candidatos", {
        convocatoria: texto(v, "idConvocatoria"),
        grupo: texto(v, "idGrupo"),
      })
    ).map((e) => ({ valor: String(e.idEstudiante), etiqueta: `${e.nombre} · ${e.documento}` })),
}

// Nombre de cada estado en el filtro de matrículas
const FILTRO_ESTADO_MATRICULA: Record<string, string> = {
  Pendiente: "Pendientes de aprobación",
  Activo: "Activas",
  Inactivo: "Inactivas",
}

// Edad cumplida en una fecha (AAAA-MM-DD)
const edadEnFecha = (nacimiento: string, fechaRef: string) => {
  const [an, mn, dn] = nacimiento.split("-").map(Number)
  const [af, mf, df] = fechaRef.split("-").map(Number)
  return af - an - (mf < mn || (mf === mn && df < dn) ? 1 : 0)
}

/*
 * Matrículas. «Nueva matrícula» abre su propio formulario (modulos/matriculas): primero se
 * matricula y así se registra la persona. El estado tiene tres valores (Pendiente, Activa e
 * Inactiva): el filtro y el interruptor de estado son propios del módulo.
 * Al editar se cambian el grupo y la fecha; el valor es el precio único de la matrícula.
 */
export const matriculas: DefinicionRecurso<Matricula> = {
  id: "matriculas",
  titulo: "Matrículas",
  singular: "matrícula",
  genero: "f",
  grupo: "Matrícula y pagos",
  descripcion: "Matrícula de cada estudiante en su grupo. Valor único de $60.000; se activa al aprobar sus requisitos.",
  ruta: "/matriculas",
  idClave: "idMatricula",
  nombreFila: (m) => `${m.estudiante} en ${m.grupo}`,
  buscarPlaceholder: "Buscar por estudiante, documento o grupo…",
  filtros: [
    { clave: "estado", etiqueta: "Estado", fuente: "estadosMatricula" },
    { clave: "sede", etiqueta: "Sede", fuente: "sedes" },
    { clave: "grupo", etiqueta: "Grupo", fuente: "gruposActivos" },
  ],
  fuentes: {
    ...fuentesAcademicas,
    estadosMatricula: async () =>
      (await recursoApi.opciones<EstadoMatriculaDto>("/matriculas/estados")).map((e) => ({
        valor: String(e.idEstado),
        etiqueta: FILTRO_ESTADO_MATRICULA[e.nombre] ?? e.nombre,
      })),
    // Grupos activos de la sede del estudiante, con cupos y rango de edad del nivel
    gruposDeLaSede: async (v) =>
      (await recursoApi.opciones<GrupoParaMatriculaDto>("/matriculas/opciones/grupos", { sede: texto(v, "idSede") })).map((g) => {
        const actual = String(g.idGrupo) === texto(v, "grupoOriginal")
        const libres = cuposLibres(g)
        return {
          valor: String(g.idGrupo),
          etiqueta: `${g.nombre} · ${g.nivel} · ${g.estilo} · ${actual ? "grupo actual" : libres === 0 ? "sin cupos" : plural(libres, "cupo libre", "cupos libres")}`,
          extra: { libres, edadMin: g.edadMin, edadMax: g.edadMax },
        }
      }),
  },
  textoVacio: "Crea la primera matrícula: al hacerlo se registra al estudiante con su grupo.",
  columnas: [
    { clave: "estudiante", etiqueta: "Estudiante", render: (m) => `${m.estudiante} · ${m.documento}` },
    { clave: "grupo", etiqueta: "Grupo", render: (m) => `${m.grupo} (${m.nivel} · ${m.estilo})` },
    { clave: "sede", etiqueta: "Sede" },
    { clave: "fecha_matricula", etiqueta: "Fecha", render: (m) => fecha(m.fecha_matricula) },
    { clave: "requisitos", etiqueta: "Requisitos", render: (m) => <ProgresoRequisitos cumplidos={m.requisitosCumplidos} total={m.requisitosTotal} compacto /> },
    { clave: "saldo", etiqueta: "Saldo", alinear: "derecha", render: (m) => formatoPesos(m.saldo) },
    { clave: "estado", etiqueta: "Estado", render: (m) => <StatusBadge status={etiquetaEstado(m.estado)} /> },
  ],
  detalle: [
    { clave: "instructor", etiqueta: "Instructor", render: (m) => m.instructor ?? "—" },
    { clave: "valor_matricula", etiqueta: "Valor de la matrícula", render: (m) => formatoPesos(m.valor_matricula) },
    { clave: "valorPagado", etiqueta: "Pagado", render: (m) => formatoPesos(m.valorPagado) },
    { clave: "mensualidades", etiqueta: "Mensualidades" },
    {
      clave: "fecha_aprobacion",
      etiqueta: "Aprobación",
      render: (m) =>
        m.fecha_aprobacion ? `${formatoFechaHora(m.fecha_aprobacion)}${m.aprobadaPor ? ` · ${m.aprobadaPor}` : ""}` : "Sin aprobar",
    },
  ],
  campos: [
    { clave: "estudianteVista", etiqueta: "Estudiante", soloLectura: true, soloEditar: true },
    {
      clave: "idGrupo", etiqueta: "Grupo", tipo: "seleccion", fuente: "gruposDeLaSede", dependeDe: "idSede", requerido: true,
      ayuda: "Solo grupos activos de la sede del estudiante. Se validan el cupo y la edad del nivel.",
    },
    { clave: "fecha_matricula", etiqueta: "Fecha de matrícula", tipo: "fecha", requerido: true, ancho: "mitad" },
    { clave: "valorVista", etiqueta: "Valor de la matrícula", soloLectura: true, soloEditar: true, ancho: "mitad", ayuda: "Precio único de la matrícula." },
  ],
  // Los valores sin campo (sede, grupo y fecha originales, nacimiento) solo sirven para validar
  aFormulario: (m) => ({
    estudianteVista: `${m.estudiante} · ${m.documento}`,
    idSede: String(m.idSede),
    idGrupo: String(m.idGrupo),
    grupoOriginal: String(m.idGrupo),
    fecha_matricula: m.fecha_matricula,
    fechaOriginal: m.fecha_matricula,
    nacimiento: m.fecha_nacimiento ?? "",
    valorVista: formatoPesos(m.valor_matricula),
  }),
  aSolicitud: (v) => ({
    idGrupo: numero(v, "idGrupo"),
    fecha_matricula: texto(v, "fecha_matricula"),
  }),
  // Mismas reglas del backend: fecha a máximo un año de hoy, cupo y edad del nivel
  validar: (v, opciones): Record<string, string> => {
    const errores: Record<string, string> = {}
    const fechaMatricula = texto(v, "fecha_matricula")
    if (fechaMatricula && fechaMatricula !== texto(v, "fechaOriginal")) {
      const dias = (new Date(`${fechaMatricula}T00:00:00`).getTime() - new Date(new Date().toDateString()).getTime()) / 864e5
      if (dias > 366) errores.fecha_matricula = "La fecha no puede ser de más de un año en el futuro."
      else if (dias < -366) errores.fecha_matricula = "La fecha no puede ser de hace más de un año."
    }
    const idGrupo = texto(v, "idGrupo")
    const grupo = opciones.gruposDeLaSede?.find((o) => o.valor === idGrupo)
    if (grupo && idGrupo !== texto(v, "grupoOriginal")) {
      const { libres, edadMin, edadMax } = (grupo.extra ?? {}) as { libres?: number; edadMin?: number | null; edadMax?: number | null }
      const nacimiento = texto(v, "nacimiento")
      const edad = nacimiento && fechaMatricula ? edadEnFecha(nacimiento, fechaMatricula) : null
      if (libres === 0) errores.idGrupo = "El grupo no tiene cupos disponibles."
      else if (edad !== null && ((edadMin != null && edad < edadMin) || (edadMax != null && edad > edadMax))) {
        errores.idGrupo = `Con ${edad} años no puede entrar a este nivel (acepta de ${edadMin ?? "-"} a ${edadMax ?? "-"} años).`
      }
    }
    return errores
  },
}

export const convocatorias: DefinicionRecurso<Convocatoria> = {
  id: "convocatorias",
  titulo: "Convocatorias",
  singular: "convocatoria",
  genero: "f",
  grupo: "Comunicación",
  descripcion: "Becas, audiciones y competencias. La vigencia sale de las fechas: próxima, abierta o cerrada.",
  ruta: "/convocatorias",
  idClave: "idConvocatoria",
  nombreFila: (c) => c.nombre,
  eliminable: true,
  buscarPlaceholder: "Buscar por nombre…",
  filtros: [
    { clave: "tipo", etiqueta: "Tipo", fuente: "tiposConvocatoria" },
    { clave: "vigencia", etiqueta: "Vigencia", fuente: "vigencias" },
  ],
  fuentes: fuentesAcademicas,
  columnas: [
    { clave: "nombre", etiqueta: "Convocatoria" },
    { clave: "tipoConvocatoria", etiqueta: "Tipo" },
    { clave: "fechas", etiqueta: "Fechas", render: (c) => `${fecha(c.fecha_inicio)} – ${c.fecha_fin ? fecha(c.fecha_fin) : "sin cierre"}` },
    { clave: "vigencia", etiqueta: "Vigencia" },
    { clave: "postulados", etiqueta: "Postulados / aceptados", alinear: "derecha", render: (c) => `${c.postulados} / ${c.aceptados}` },
  ],
  campos: [
    { clave: "nombre", etiqueta: "Nombre", requerido: true, min: 3, max: 50 },
    { clave: "idTipoConvocatoria", etiqueta: "Tipo", tipo: "seleccion", fuente: "tiposConvocatoria", requerido: true },
    { clave: "fecha_inicio", etiqueta: "Fecha de inicio", tipo: "fecha", requerido: true, ancho: "mitad" },
    { clave: "fecha_fin", etiqueta: "Fecha de cierre", tipo: "fecha", ancho: "mitad", ayuda: "Vacía = sin fecha de cierre." },
    { clave: "descripcion", etiqueta: "Descripción", tipo: "area", max: 300 },
  ],
  aFormulario: (c) => ({
    nombre: c.nombre,
    idTipoConvocatoria: String(c.idTipoConvocatoria),
    fecha_inicio: c.fecha_inicio,
    fecha_fin: c.fecha_fin ?? "",
    descripcion: c.descripcion ?? "",
  }),
  aSolicitud: (v) => ({
    nombre: texto(v, "nombre"),
    idTipoConvocatoria: numero(v, "idTipoConvocatoria"),
    fecha_inicio: texto(v, "fecha_inicio"),
    fecha_fin: opcional(v, "fecha_fin") ?? null,
    descripcion: opcional(v, "descripcion") ?? null,
  }),
  validar: (v): Record<string, string> =>
    texto(v, "fecha_fin") && texto(v, "fecha_fin") < texto(v, "fecha_inicio")
      ? { fecha_fin: "El cierre no puede ser antes del inicio." }
      : {},
  bloqueoEliminar: (c) =>
    c.postulados > 0 ? `Tiene ${plural(c.postulados, "postulado", "postulados")}: no se puede eliminar.` : undefined,
}

export const postulaciones: DefinicionRecurso<Postulacion> = {
  id: "postulaciones",
  titulo: "Postulaciones",
  singular: "postulación",
  genero: "f",
  grupo: "Comunicación",
  descripcion: "Estudiantes postulados a una convocatoria abierta. Se aceptan o rechazan con los botones de cada fila.",
  ruta: "/postulaciones",
  idClave: "idPostulacion",
  nombreFila: (p) => `${p.estudiante} en ${p.convocatoria}`,
  eliminable: true,
  buscarPlaceholder: "Buscar por estudiante o documento…",
  filtros: [
    { clave: "sede", etiqueta: "Sede", fuente: "sedes" },
    { clave: "convocatoria", etiqueta: "Convocatoria", fuente: "convocatorias" },
    { clave: "estado", etiqueta: "Estado", fuente: "estadosPostulacion" },
  ],
  fuentes: fuentesAcademicas,
  columnas: [
    { clave: "estudiante", etiqueta: "Estudiante", render: (p) => `${p.estudiante} · ${p.documento}` },
    { clave: "convocatoria", etiqueta: "Convocatoria", render: (p) => `${p.convocatoria} (${p.vigencia.toLowerCase()})` },
    { clave: "sede", etiqueta: "Sede" },
    { clave: "estado", etiqueta: "Estado" },
    { clave: "beneficio", etiqueta: "Beneficio", render: (p) => p.beneficio ?? "—" },
  ],
  campos: [
    { clave: "idConvocatoria", etiqueta: "Convocatoria", tipo: "seleccion", fuente: "convocatoriasAbiertas", requerido: true, soloCrear: true, ayuda: "Solo convocatorias abiertas hoy." },
    { clave: "idEstudiante", etiqueta: "Estudiante", tipo: "seleccion", fuente: "estudiantesActivos", requerido: true, soloCrear: true },
    { clave: "beneficio", etiqueta: "Beneficio", max: 50, placeholder: "Ej. Beca del 50 %" },
  ],
  aFormulario: (p) => ({ beneficio: p.beneficio ?? "" }),
  aSolicitud: (v, modo) =>
    modo === "crear"
      ? { idConvocatoria: numero(v, "idConvocatoria"), idEstudiante: numero(v, "idEstudiante"), beneficio: opcional(v, "beneficio") }
      : { beneficio: opcional(v, "beneficio") ?? null },
  bloqueoEliminar: (p) =>
    p.idEstado !== POSTULACION.postulado ? "Solo se puede retirar una postulación que todavía no se ha decidido." : undefined,
}

export const gruposCompetencia: DefinicionRecurso<GrupoCompetencia> = {
  id: "grupos-competencia",
  titulo: "Grupos de competencia",
  singular: "grupo de competencia",
  genero: "m",
  grupo: "Comunicación",
  descripcion: "Grupo que representa a la academia en una convocatoria. Sus integrantes son estudiantes de la sede con la postulación aceptada.",
  ruta: "/grupos-competencia",
  idClave: "idGrupoCompetencia",
  nombreFila: (g) => `${g.grupo} en ${g.convocatoria}`,
  eliminable: true,
  buscarPlaceholder: "Buscar por grupo o convocatoria…",
  filtros: [
    { clave: "sede", etiqueta: "Sede", fuente: "sedes" },
    { clave: "convocatoria", etiqueta: "Convocatoria", fuente: "convocatorias" },
  ],
  fuentes: fuentesAcademicas,
  valoresIniciales: { estudiantes: [] },
  columnas: [
    { clave: "grupo", etiqueta: "Grupo" },
    { clave: "convocatoria", etiqueta: "Convocatoria", render: (g) => `${g.convocatoria} (${g.vigencia.toLowerCase()})` },
    { clave: "sede", etiqueta: "Sede" },
    {
      clave: "integrantes",
      etiqueta: "Integrantes",
      render: (g) => (g.estudiantes.length ? g.estudiantes.map((e) => e.nombre).join(", ") : "Sin integrantes"),
    },
  ],
  campos: [
    { clave: "idConvocatoria", etiqueta: "Convocatoria", tipo: "seleccion", fuente: "convocatorias", requerido: true },
    { clave: "idGrupo", etiqueta: "Grupo", tipo: "seleccion", fuente: "gruposActivos", requerido: true, soloCrear: true, ayuda: "Un grupo compite en una sola convocatoria a la vez." },
    {
      clave: "estudiantes", etiqueta: "Integrantes", tipo: "multiple", fuente: "candidatos", dependeDe: "idConvocatoria,idGrupo",
      ayuda: "Aparecen los estudiantes de la sede del grupo con la postulación aceptada en la convocatoria.",
    },
  ],
  aFormulario: (g) => ({
    idConvocatoria: String(g.idConvocatoria),
    idGrupo: String(g.idGrupo),
    estudiantes: g.estudiantes.map((e) => String(e.idEstudiante)),
  }),
  aSolicitud: (v, modo) => {
    const integrantes = ((v.estudiantes as string[]) ?? []).map(Number)
    return modo === "crear"
      ? { idConvocatoria: numero(v, "idConvocatoria"), idGrupo: numero(v, "idGrupo"), estudiantes: integrantes }
      : { idConvocatoria: numero(v, "idConvocatoria"), estudiantes: integrantes }
  },
}

export const personas: DefinicionRecurso<PersonaSeguridad> = {
  id: "personas",
  titulo: "Datos personales",
  singular: "registro",
  genero: "m",
  grupo: "Seguridad",
  descripcion: "Corrige nombre, documento y contacto. Los registros nacen en la inscripción o en Gestión humana.",
  ruta: "/personas",
  idClave: "idPersona",
  nombreFila: (p) => p.nombre,
  buscarPlaceholder: "Buscar por nombre o documento…",
  fuentes: fuentesComunes,
  textoVacio: "Las personas aparecen al inscribir estudiantes o registrar instructores.",
  columnas: [
    { clave: "nombre", etiqueta: "Nombre" },
    { clave: "documento", etiqueta: "Documento" },
    { clave: "telefono", etiqueta: "Teléfono", render: (p) => p.telefono ?? "—" },
    { clave: "email", etiqueta: "Correo", render: (p) => p.email ?? "—" },
    { clave: "fecha_nacimiento", etiqueta: "Nacimiento", render: (p) => fecha(p.fecha_nacimiento) },
  ],
  campos: [...camposPersona],
  aFormulario: (p) => ({
    nombre: p.nombre,
    idTipoDocumento: String(p.idTipoDocumento ?? 1),
    documento: p.documento,
    telefono: p.telefono ?? "",
    email: p.email ?? "",
    fecha_nacimiento: p.fecha_nacimiento ?? "",
    // Se conserva el estado al guardar (no se edita desde aquí)
    idEstado: String(p.idEstado),
  }),
  aSolicitud: (v) => ({ ...personaASolicitud(v), idEstado: numero(v, "idEstado") || 1 }),
  validar: validarNacimiento,
}

export const estados: DefinicionRecurso<EstadoCatalogo> = {
  id: "estados",
  titulo: "Estados",
  singular: "estado",
  genero: "m",
  grupo: "Seguridad",
  descripcion: "Catálogo de estados que usa el sistema (activo, mensualidades, postulaciones, noticias). Es de solo lectura: las reglas del backend dependen de estos valores.",
  ruta: "/estados",
  idClave: "idEstado",
  nombreFila: (e) => e.nombre,
  sinBusqueda: true,
  columnas: [
    { clave: "nombre", etiqueta: "Estado" },
    { clave: "categoria", etiqueta: "Categoría" },
    { clave: "descripcion", etiqueta: "Descripción", render: (e) => e.descripcion ?? "—" },
  ],
  campos: [],
  aFormulario: () => ({}),
  aSolicitud: () => ({}),
}


/* ─── Usuarios (cuentas de acceso) ─── */

export interface UsuarioCuenta {
  documento: string
  nombre: string | null
  email: string | null
  idTipoDocumento: number | null
  tipoDocumento: string | null
  idEstado: number
  estado: string
  idSede: number | null
  sede: string | null
  roles: number[]
}

export interface RolApi { idRol: number; nombre: string; idEstado: number }

let cacheRoles: Promise<RolApi[]> | null = null
export const rolesApi = (refrescar = false) => {
  if (!cacheRoles || refrescar) {
    cacheRoles = recursoApi.listar<RolApi>("/roles", { tamano: 100 }).then((r) => r.datos).catch((e) => {
      cacheRoles = null
      throw e
    })
  }
  return cacheRoles
}

const etiquetasRoles = (ids: number[], roles: RolApi[]) =>
  ids.map((id) => roles.find((r) => r.idRol === id)?.nombre ?? `#${id}`).join(", ") || "Sin roles"

// Roles que un administrador de sede puede asignar (el backend aplica la misma regla)
const ROLES_DE_SEDE = ["instructor", "estudiante", "acudiente"]

/*
 * Cuentas de acceso. «Ver» es de solo lectura; el estado (activa / inactiva) y los roles
 * se cambian en «Editar». Las cuentas de instructores no se crean aquí: se crean con la
 * invitación de Gestión humana > Instructores.
 */
export function definicionUsuarios(roles: RolApi[], sedeFija: number | null): DefinicionRecurso<UsuarioCuenta> {
  const asignable = (r: RolApi) => r.idEstado === 1 && (!sedeFija || ROLES_DE_SEDE.includes(r.nombre.trim().toLowerCase()))
  const sinInstructor = (r: RolApi) => asignable(r) && !["instructor", "administrador"].includes(r.nombre.trim().toLowerCase())
  return {
    id: "usuarios",
    titulo: "Usuarios",
    singular: "usuario",
    genero: "m",
    grupo: "Seguridad",
    descripcion: "Cuentas de acceso. El usuario inicia sesión con su número de documento.",
    ruta: "/usuarios",
    idClave: "documento",
    nombreFila: (u) => u.nombre ?? u.documento,
    buscarPlaceholder: "Buscar por nombre, documento, correo, tipo, rol, estado o sede…",
    filtros: [
      { clave: "estado", etiqueta: "Estado", fuente: "estadosCuenta" },
      { clave: "rol", etiqueta: "Rol", fuente: "roles" },
    ],
    fuentes: {
      estadosCuenta: async () => [
        { valor: "1", etiqueta: "Activo" },
        { valor: "2", etiqueta: "Inactivo" },
      ],
      roles: async () => roles.map((r) => ({ valor: String(r.idRol), etiqueta: r.nombre })),
      rolesAsignables: async () => roles.filter(asignable).map((r) => ({ valor: String(r.idRol), etiqueta: r.nombre })),
      rolesNuevaCuenta: async () => roles.filter(sinInstructor).map((r) => ({ valor: String(r.idRol), etiqueta: r.nombre })),
      candidatos: async () =>
        (await recursoApi.opciones<{ nombre: string; documento: string; tipoDocumento: string | null }>("/usuarios/candidatos")).map(
          (p) => ({ valor: p.documento, etiqueta: `${p.nombre} · ${p.tipoDocumento ?? "Documento"} ${p.documento}` }),
        ),
    },
    textoVacio: "Las cuentas se crean al inscribir estudiantes o al invitar instructores.",
    columnas: [
      { clave: "nombre", etiqueta: "Persona", render: (u) => u.nombre ?? "—" },
      { clave: "documento", etiqueta: "Documento", render: (u) => `${u.tipoDocumento ?? ""} ${u.documento}`.trim() },
      { clave: "email", etiqueta: "Correo", render: (u) => u.email ?? "—" },
      { clave: "roles", etiqueta: "Roles", render: (u) => etiquetasRoles(u.roles, roles) },
      ...(sedeFija ? [] : [{ clave: "sede", etiqueta: "Sede", render: (u: UsuarioCuenta) => u.sede ?? "Todas" }]),
      { clave: "estado", etiqueta: "Estado", render: (u) => <StatusBadge status={u.estado} /> },
    ],
    campos: [
      { clave: "documento", etiqueta: "Persona", tipo: "seleccion", fuente: "candidatos", requerido: true, soloCrear: true, ayuda: "Personas activas sin cuenta. Los instructores reciben su cuenta con «Invitar» en Gestión humana." },
      { clave: "nombre", etiqueta: "Persona", soloLectura: true, soloEditar: true, ancho: "mitad" },
      { clave: "tipoDocumento", etiqueta: "Tipo de documento", soloLectura: true, soloEditar: true, ancho: "mitad" },
      { clave: "documentoVista", etiqueta: "Número de documento (usuario)", soloLectura: true, soloEditar: true, ancho: "mitad" },
      { clave: "idEstado", etiqueta: "Estado de la cuenta", tipo: "seleccion", fuente: "estadosCuenta", requerido: true, soloEditar: true, ancho: "mitad", ayuda: "Inactiva: la persona no puede iniciar sesión." },
      { clave: "clave", etiqueta: "Contraseña inicial", tipo: "clave", requerido: true, min: 8, max: 128, soloCrear: true, ancho: "mitad", ayuda: "Mínimo 8 caracteres, con letras y números." },
      { clave: "rolesNuevos", etiqueta: "Roles", tipo: "multiple", fuente: "rolesNuevaCuenta", requerido: true, soloCrear: true },
      { clave: "roles", etiqueta: "Roles", tipo: "multiple", fuente: "rolesAsignables", requerido: true, soloEditar: true },
    ],
    valoresIniciales: { rolesNuevos: [] },
    aFormulario: (u) => ({
      nombre: u.nombre ?? "",
      tipoDocumento: u.tipoDocumento ?? "Sin tipo registrado",
      documentoVista: u.documento,
      idEstado: String(u.idEstado),
      roles: u.roles.map(String),
    }),
    aSolicitud: (v, modo) =>
      modo === "crear"
        ? { documento: texto(v, "documento"), clave: String(v.clave ?? ""), idEstado: 1, roles: (v.rolesNuevos as string[]).map(Number) }
        : { idEstado: numero(v, "idEstado"), roles: (v.roles as string[]).map(Number) },
    validar: (v): Record<string, string> => {
      const clave = String(v.clave ?? "")
      return clave && (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) ? { clave: "Usa al menos una letra y un número." } : {}
    },
  }
}

/* ─── Sitio público: planes, periodos, preinscripciones y solicitudes de espacio ─── */

export interface Plan extends ConEstado { idPlan: number; nombre: string; meses: number; valor: string; descripcion: string | null }

export const planes: DefinicionRecurso<Plan> = {
  id: "planes",
  titulo: "Planes",
  singular: "plan",
  genero: "m",
  grupo: "Catálogos",
  descripcion: "Planes de pago que muestra el sitio público. El valor es el total del plan.",
  ruta: "/planes",
  idClave: "idPlan",
  nombreFila: (p) => p.nombre,
  conEstado: true,
  sinBusqueda: true,
  columnas: [
    { clave: "nombre", etiqueta: "Plan" },
    { clave: "meses", etiqueta: "Duración", render: (p) => plural(p.meses, "mes", "meses") },
    { clave: "valor", etiqueta: "Valor total", alinear: "derecha", render: (p) => formatoPesos(p.valor) },
    { clave: "mensual", etiqueta: "Equivale por mes", alinear: "derecha", render: (p) => formatoPesos(Number(p.valor) / p.meses) },
  ],
  detalle: [{ clave: "descripcion", etiqueta: "Descripción", render: (p) => p.descripcion ?? "—" }],
  campos: [
    { clave: "nombre", etiqueta: "Nombre", requerido: true, min: 2, max: 30, ancho: "mitad", placeholder: "Ej. Trimestral" },
    { clave: "meses", etiqueta: "Duración (meses)", tipo: "numero", requerido: true, min: 1, max: 60, ancho: "mitad" },
    { clave: "valor", etiqueta: "Valor total (COP)", tipo: "numero", requerido: true, min: 0, max: 99999999, ancho: "mitad" },
    { clave: "descripcion", etiqueta: "Descripción corta", max: 150, ancho: "mitad" },
  ],
  aFormulario: (p) => ({ nombre: p.nombre, meses: String(p.meses), valor: String(Number(p.valor)), descripcion: p.descripcion ?? "" }),
  aSolicitud: (v) => ({ nombre: texto(v, "nombre"), meses: numero(v, "meses"), valor: numero(v, "valor"), descripcion: opcional(v, "descripcion") ?? null }),
}

export interface Periodo extends ConEstado {
  idPeriodo: number
  nombre: string
  fecha_inicio: string
  fecha_fin: string
  vigencia: string
  preinscripciones: number
}

export const periodos: DefinicionRecurso<Periodo> = {
  id: "periodos",
  titulo: "Periodos de matrícula",
  singular: "periodo",
  genero: "m",
  grupo: "Matrícula y pagos",
  descripcion: "La preinscripción del sitio solo abre dentro de un periodo activo y vigente.",
  ruta: "/periodos-matricula",
  idClave: "idPeriodo",
  nombreFila: (p) => p.nombre,
  conEstado: true,
  buscarPlaceholder: "Buscar por nombre…",
  columnas: [
    { clave: "nombre", etiqueta: "Periodo" },
    { clave: "fecha_inicio", etiqueta: "Abre", render: (p) => fecha(p.fecha_inicio) },
    { clave: "fecha_fin", etiqueta: "Cierra", render: (p) => fecha(p.fecha_fin) },
    { clave: "vigencia", etiqueta: "Vigencia" },
    { clave: "preinscripciones", etiqueta: "Preinscripciones", alinear: "derecha" },
  ],
  campos: [
    { clave: "nombre", etiqueta: "Nombre", requerido: true, min: 3, max: 50, placeholder: "Ej. Matrícula 2027-1" },
    { clave: "fecha_inicio", etiqueta: "Fecha de apertura", tipo: "fecha", requerido: true, ancho: "mitad" },
    { clave: "fecha_fin", etiqueta: "Fecha de cierre", tipo: "fecha", requerido: true, ancho: "mitad" },
  ],
  aFormulario: (p) => ({ nombre: p.nombre, fecha_inicio: p.fecha_inicio, fecha_fin: p.fecha_fin }),
  aSolicitud: (v) => ({ nombre: texto(v, "nombre"), fecha_inicio: texto(v, "fecha_inicio"), fecha_fin: texto(v, "fecha_fin") }),
  validar: (v): Record<string, string> =>
    texto(v, "fecha_inicio") && texto(v, "fecha_fin") && texto(v, "fecha_fin") < texto(v, "fecha_inicio")
      ? { fecha_fin: "La fecha de cierre no puede ser anterior a la de apertura." }
      : {},
}

export interface Preinscripcion {
  idPreinscripcion: number
  periodo: string
  nombre: string
  tipoDocumento: string
  documento: string
  fecha_nacimiento: string
  telefono: string
  email: string
  idSede: number
  sede: string
  estilo: string | null
  plan: string | null
  nombreAcudiente: string | null
  telefonoAcudiente: string | null
  fechaConfirmacion: string | null
  creado: string
  idEstado: number
  estado: string
}

const estadosDe = (ruta: string) => async () =>
  (await recursoApi.opciones<{ idEstado: number; nombre: string }>(ruta)).map((e) => ({ valor: String(e.idEstado), etiqueta: e.nombre }))
const fechaHora = (valor: string | null) =>
  valor ? new Date(valor).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—"

export const preinscripciones: DefinicionRecurso<Preinscripcion> = {
  id: "preinscripciones",
  titulo: "Preinscripciones",
  singular: "preinscripción",
  genero: "f",
  grupo: "Matrícula y pagos",
  descripcion: "Solicitudes del sitio público. La inscripción se completa en la sede con «Inscribir estudiante».",
  ruta: "/preinscripciones",
  idClave: "idPreinscripcion",
  nombreFila: (p) => p.nombre,
  buscarPlaceholder: "Buscar por nombre, documento, correo o teléfono…",
  filtros: [
    { clave: "sede", etiqueta: "Sede", fuente: "sedes" },
    { clave: "estado", etiqueta: "Estado", fuente: "estadosPreinscripcion" },
  ],
  fuentes: { ...fuentesComunes, estadosPreinscripcion: estadosDe("/preinscripciones/estados") },
  textoVacio: "Aparecen cuando alguien se preinscribe en el sitio durante un periodo abierto.",
  columnas: [
    { clave: "nombre", etiqueta: "Aspirante" },
    { clave: "documento", etiqueta: "Documento", render: (p) => `${p.tipoDocumento} ${p.documento}` },
    { clave: "email", etiqueta: "Correo" },
    { clave: "sede", etiqueta: "Sede" },
    { clave: "periodo", etiqueta: "Periodo" },
    { clave: "estado", etiqueta: "Estado", render: (p) => <StatusBadge status={p.estado} /> },
  ],
  detalle: [
    { clave: "fecha_nacimiento", etiqueta: "Nacimiento", render: (p) => fecha(p.fecha_nacimiento) },
    { clave: "telefono", etiqueta: "Teléfono" },
    { clave: "estilo", etiqueta: "Estilo de interés", render: (p) => p.estilo ?? "—" },
    { clave: "plan", etiqueta: "Plan de interés", render: (p) => p.plan ?? "—" },
    { clave: "nombreAcudiente", etiqueta: "Acudiente", render: (p) => (p.nombreAcudiente ? `${p.nombreAcudiente} · ${p.telefonoAcudiente ?? ""}` : "—") },
    { clave: "creado", etiqueta: "Recibida", render: (p) => fechaHora(p.creado) },
    { clave: "fechaConfirmacion", etiqueta: "Correo confirmado", render: (p) => fechaHora(p.fechaConfirmacion) },
  ],
  campos: [],
  aFormulario: () => ({}),
  aSolicitud: () => ({}),
}

export interface SolicitudEspacio {
  idSolicitud: number
  nombre: string
  email: string
  telefono: string
  idAula: number
  idSede: number
  sede: string
  capacidad: number
  fecha: string
  horaInicio: string
  horaFin: string
  personas: number
  mensaje: string | null
  creado: string
  idEstado: number
  estado: string
}

export const solicitudesEspacio: DefinicionRecurso<SolicitudEspacio> = {
  id: "solicitudes-espacio",
  titulo: "Solicitudes de espacio",
  singular: "solicitud",
  genero: "f",
  grupo: "Clases",
  descripcion: "Alquiler de aulas pedido desde el sitio. Al aprobar se revisa de nuevo que la franja siga libre.",
  ruta: "/solicitudes-espacio",
  idClave: "idSolicitud",
  nombreFila: (s) => `${s.nombre} · ${fecha(s.fecha)}`,
  buscarPlaceholder: "Buscar por nombre, correo o teléfono…",
  filtros: [
    { clave: "sede", etiqueta: "Sede", fuente: "sedes" },
    { clave: "estado", etiqueta: "Estado", fuente: "estadosSolicitud" },
  ],
  fuentes: { ...fuentesComunes, estadosSolicitud: estadosDe("/solicitudes-espacio/estados") },
  textoVacio: "Aparecen cuando alguien pide un espacio desde el sitio público.",
  columnas: [
    { clave: "nombre", etiqueta: "Solicitante" },
    { clave: "fecha", etiqueta: "Fecha", render: (s) => fecha(s.fecha) },
    { clave: "horario", etiqueta: "Horario", render: (s) => `${s.horaInicio} – ${s.horaFin}` },
    { clave: "aula", etiqueta: "Aula", render: (s) => `Aula ${s.idAula} · ${s.sede}` },
    { clave: "personas", etiqueta: "Personas", alinear: "derecha" },
    { clave: "estado", etiqueta: "Estado", render: (s) => <StatusBadge status={s.estado} /> },
  ],
  detalle: [
    { clave: "email", etiqueta: "Correo" },
    { clave: "telefono", etiqueta: "Teléfono" },
    { clave: "mensaje", etiqueta: "Mensaje", render: (s) => s.mensaje ?? "—" },
    { clave: "creado", etiqueta: "Recibida", render: (s) => fechaHora(s.creado) },
  ],
  campos: [],
  aFormulario: () => ({}),
  aSolicitud: () => ({}),
}
