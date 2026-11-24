import { recursoApi } from "@/compartido/api/recursos"
import type { DefinicionRecurso, Opcion, Valores } from "@/compartido/ui/PantallaRecurso"

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
  { clave: "nombre", etiqueta: "Nombre completo", requerido: true, min: 2, max: 100, seccion: "Datos personales" },
  { clave: "idTipoDocumento", etiqueta: "Tipo de documento", tipo: "seleccion", fuente: "tiposDocumento", requerido: true, ancho: "mitad" },
  { clave: "documento", etiqueta: "Número de documento", requerido: true, min: 5, max: 20, ancho: "mitad" },
  { clave: "telefono", etiqueta: "Teléfono", tipo: "tel", min: 7, max: 20, ancho: "mitad" },
  { clave: "email", etiqueta: "Correo electrónico", tipo: "email", ancho: "mitad" },
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

const validarNacimiento = (v: Valores): Record<string, string> =>
  texto(v, "fecha_nacimiento") && new Date(texto(v, "fecha_nacimiento")) > new Date()
    ? { fecha_nacimiento: "La fecha de nacimiento no puede ser futura." }
    : {}

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
    { clave: "descripcion", etiqueta: "Descripción", tipo: "area", requerido: true, max: 200 },
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
  grupo: "Personas",
  descripcion: "Datos del instructor y sedes donde puede dictar grupos.",
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
  grupo: "Personas",
  descripcion: "Los estudiantes se registran con la inscripción presencial. Aquí se editan sus datos, acudientes y sede.",
  ruta: "/estudiantes",
  idClave: "idEstudiante",
  nombreFila: (e) => e.nombre,
  conEstado: true,
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
  // Teléfono y fecha de nacimiento son obligatorios para el estudiante (el backend también lo exige)
  campos: [
    ...camposPersona.map((c) =>
      c.clave === "telefono" || c.clave === "fecha_nacimiento" ? { ...c, requerido: true } : c,
    ),
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
