import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { en } from "./en"

export type Idioma = "es" | "en"

type Variables = Record<string, string | number>

export interface ContextoIdioma {
  idioma: Idioma
  cambiarIdioma: (idioma: Idioma) => void
  /** Traduce un texto escrito en español. Si no hay traducción, devuelve el mismo texto. */
  t: (texto: string, variables?: Variables) => string
}

const CLAVE = "idioma"

function idiomaInicial(): Idioma {
  try {
    const guardado = localStorage.getItem(CLAVE)
    if (guardado === "es" || guardado === "en") return guardado
  } catch {
    // Sin acceso al almacenamiento: se usa español
  }
  return "es"
}

function reemplazar(texto: string, variables?: Variables) {
  if (!variables) return texto
  return texto.replace(/\{(\w+)\}/g, (_, clave: string) => String(variables[clave] ?? `{${clave}}`))
}

export const IdiomaContext = createContext<ContextoIdioma | null>(null)

// Idioma vigente para tr(): lo fija el proveedor en cada render, antes de pintar a los hijos
let idiomaActual: Idioma = "es"

/**
 * Traduce sin hook, para textos de pantallas y componentes compartidos.
 * Toda la aplicación vuelve a pintarse al cambiar el idioma porque App consume el contexto.
 */
export function tr(texto: string, variables?: Variables): string {
  return reemplazar(idiomaActual === "en" ? (en[texto] ?? texto) : texto, variables)
}

export function IdiomaProvider({ children }: { children: ReactNode }) {
  const [idioma, setIdioma] = useState<Idioma>(idiomaInicial)
  idiomaActual = idioma

  useEffect(() => {
    document.documentElement.lang = idioma
  }, [idioma])

  const cambiarIdioma = useCallback((nuevo: Idioma) => {
    setIdioma(nuevo)
    try {
      localStorage.setItem(CLAVE, nuevo)
    } catch {
      // Se mantiene solo durante esta visita
    }
  }, [])

  const t = useCallback(
    (texto: string, variables?: Variables) => reemplazar(idioma === "en" ? (en[texto] ?? texto) : texto, variables),
    [idioma],
  )

  const valor = useMemo(() => ({ idioma, cambiarIdioma, t }), [idioma, cambiarIdioma, t])
  return <IdiomaContext.Provider value={valor}>{children}</IdiomaContext.Provider>
}
