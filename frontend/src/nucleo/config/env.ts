const leerBooleano = (valor: string | undefined, predeterminado: boolean) => {
  if (valor === undefined) return predeterminado
  return valor.toLowerCase() === "true"
}

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/$/, ""),
  usarMock: leerBooleano(import.meta.env.VITE_USAR_MOCK, true),
} as const
