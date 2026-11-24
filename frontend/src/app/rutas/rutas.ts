export const rutas = {
  inicio: "home",
  login: "login",
  administracion: "admin",
  instructor: "instructor",
} as const

export type RutaAplicacion = (typeof rutas)[keyof typeof rutas]
