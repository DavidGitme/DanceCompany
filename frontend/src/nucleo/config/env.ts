const leerBooleano = (valor: string | undefined, predeterminado: boolean) => {
  if (valor === undefined) return predeterminado
  return valor.toLowerCase() === "true"
}

export const env = {
  apiUrl: (import.meta.env.VITE_API_URL ?? "/api/v1").replace(/\/$/, ""),
  // Sin la variable, los datos de prueba solo se usan en desarrollo; en un build de producción se usa la API real
  usarMock: leerBooleano(import.meta.env.VITE_USAR_MOCK, import.meta.env.DEV),
} as const
