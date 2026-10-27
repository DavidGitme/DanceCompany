let tokenAcceso: string | null = null

export const tokenStore = {
  obtener: () => tokenAcceso,
  guardar: (token: string) => {
    tokenAcceso = token
  },
  limpiar: () => {
    tokenAcceso = null
  },
}
