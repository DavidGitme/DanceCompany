import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"

/*
 * Tema claro/oscuro compartido por la landing, el login y todas las vistas internas.
 * La preferencia se recuerda en el navegador; si no hay, se usa el modo oscuro.
 */

const CLAVE = "danceflow-tema"

interface ValorTema {
  isDark: boolean
  alternarTema: () => void
}

const TemaContext = createContext<ValorTema | null>(null)

function temaInicial(): boolean {
  try {
    const guardado = window.localStorage.getItem(CLAVE)
    if (guardado === "claro") return false
    if (guardado === "oscuro") return true
  } catch {
    // Sin acceso al almacenamiento: se usa el predeterminado
  }
  return true
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [isDark, setIsDark] = useState(temaInicial)

  useEffect(() => {
    try {
      window.localStorage.setItem(CLAVE, isDark ? "oscuro" : "claro")
    } catch {
      // La preferencia solo dura la sesión
    }
    // Controles nativos (fechas, selects, scroll) con el mismo esquema
    document.documentElement.style.colorScheme = isDark ? "dark" : "light"
  }, [isDark])

  const alternarTema = useCallback(() => setIsDark((valor) => !valor), [])
  const valor = useMemo(() => ({ isDark, alternarTema }), [isDark, alternarTema])
  return <TemaContext.Provider value={valor}>{children}</TemaContext.Provider>
}

export function useTema(): ValorTema {
  const valor = useContext(TemaContext)
  if (!valor) throw new Error("useTema debe usarse dentro de TemaProvider")
  return valor
}
