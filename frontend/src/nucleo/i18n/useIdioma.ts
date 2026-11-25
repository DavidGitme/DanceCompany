import { useContext } from "react"
import { IdiomaContext, type ContextoIdioma } from "./IdiomaContext"

// Fuera del proveedor (por ejemplo, en pruebas) se queda en español
const respaldo: ContextoIdioma = {
  idioma: "es",
  cambiarIdioma: () => undefined,
  t: (texto, variables) =>
    variables ? texto.replace(/\{(\w+)\}/g, (_, c: string) => String(variables[c] ?? `{${c}}`)) : texto,
}

export function useIdioma(): ContextoIdioma {
  return useContext(IdiomaContext) ?? respaldo
}
