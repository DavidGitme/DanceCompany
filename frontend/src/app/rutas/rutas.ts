export const rutas = {
  inicio: "home",
  login: "login",
  registro: "register",
  administracion: "admin",
} as const

export type RutaAplicacion = (typeof rutas)[keyof typeof rutas]
