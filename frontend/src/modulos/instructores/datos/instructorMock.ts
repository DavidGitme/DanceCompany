export type EstadoMensualidad = "Al día" | "Pendiente" | "Vencida"

export interface GrupoInstructor {
  idGrupo: number
  nombre: string
  estilo: string
  nivel: string
  sede: string
  aula: string
  dias: string
  horario: string
  estudiantes: number
}

export interface MensualidadInstructor {
  periodo: string
  valor: number
  fechaLimite: string
  estado: EstadoMensualidad
}

export interface EstudianteInstructor {
  idEstudiante: number
  nombre: string
  documento: string
  correo: string
  telefono: string
  idGrupo: number
  estado: EstadoMensualidad
  mensualidades: MensualidadInstructor[]
}

export const instructorMock = {
  nombre: "Carlos Vélez",
  documento: "1122334455",
  correo: "cvelez@fanda.co",
  telefono: "300 111 2233",
  especialidad: "Breaking y Hip Hop",
}

export const gruposInstructorMock: GrupoInstructor[] = [
  {
    idGrupo: 1,
    nombre: "Breaking A1",
    estilo: "Breaking",
    nivel: "Avanzado",
    sede: "Bello",
    aula: "Salón Urbano",
    dias: "Lunes y miércoles",
    horario: "7:00 p. m. – 9:00 p. m.",
    estudiantes: 3,
  },
  {
    idGrupo: 2,
    nombre: "Hip Hop Kids B2",
    estilo: "Hip Hop",
    nivel: "Intermedio",
    sede: "Bello",
    aula: "Salón Espejos 1",
    dias: "Martes y jueves",
    horario: "4:00 p. m. – 5:30 p. m.",
    estudiantes: 3,
  },
  {
    idGrupo: 3,
    nombre: "Freestyle Open",
    estilo: "Freestyle",
    nivel: "Todos",
    sede: "Copacabana",
    aula: "Estudio Principal",
    dias: "Viernes",
    horario: "6:30 p. m. – 8:30 p. m.",
    estudiantes: 2,
  },
  {
    idGrupo: 4,
    nombre: "Breaking Inicial",
    estilo: "Breaking",
    nivel: "Básico",
    sede: "Copacabana",
    aula: "Estudio Principal",
    dias: "Sábados",
    horario: "10:00 a. m. – 12:00 m.",
    estudiantes: 2,
  },
]

export const estudiantesInstructorMock: EstudianteInstructor[] = [
  ["Valentina Restrepo", "1234509876", "valentina@mail.com", "314 256 7890", 1, "Al día"],
  ["Santiago Gómez", "1002548761", "santiago@mail.com", "320 987 1234", 2, "Pendiente"],
  ["Camila Herrera", "1036125478", "camila@mail.com", "318 543 2100", 1, "Al día"],
  ["Samuel Ortiz", "1022445899", "samuel@mail.com", "300 554 6677", 1, "Vencida"],
  ["Laura Martínez", "1019987654", "laura@mail.com", "321 654 9870", 3, "Al día"],
  ["Mateo Ríos", "1045887741", "mateo@mail.com", "315 404 2891", 2, "Pendiente"],
  ["Mariana Díaz", "1002649850", "mariana@mail.com", "310 555 0112", 3, "Al día"],
  ["Tomás Mejía", "1025889144", "tomas@mail.com", "300 998 4521", 4, "Vencida"],
  ["Sara Ospina", "1001887766", "sara@mail.com", "315 888 9900", 4, "Al día"],
  ["Juan Esteban López", "1102334455", "juan@mail.com", "301 220 1144", 2, "Al día"],
].map(([nombre, documento, correo, telefono, idGrupo, estado], indice) => ({
  idEstudiante: indice + 1,
  nombre: String(nombre),
  documento: String(documento),
  correo: String(correo),
  telefono: String(telefono),
  idGrupo: Number(idGrupo),
  estado: estado as EstadoMensualidad,
  mensualidades: [
    {
      periodo: "Octubre 2026",
      valor: 120000,
      fechaLimite: "15 oct 2026",
      estado: estado as EstadoMensualidad,
    },
    {
      periodo: "Septiembre 2026",
      valor: 120000,
      fechaLimite: "15 sep 2026",
      estado: "Al día",
    },
    {
      periodo: "Agosto 2026",
      valor: 120000,
      fechaLimite: "15 ago 2026",
      estado: "Al día",
    },
  ],
}))

