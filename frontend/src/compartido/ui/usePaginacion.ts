import { useCallback, useEffect, useMemo, useState } from "react"

export function usePaginacion<T>(
  items: T[],
  tamanoInicial = 10,
  reiniciarCon: unknown[] = [],
) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(tamanoInicial)

  // Al cambiar búsqueda o filtros, vuelve a la primera página
  const clave = JSON.stringify(reiniciarCon)
  useEffect(() => setPagina(1), [clave])

  const total = items.length
  const totalPaginas = Math.max(1, Math.ceil(total / tamano))
  const paginaSegura = Math.min(pagina, totalPaginas)

  const visibles = useMemo(
    () => items.slice((paginaSegura - 1) * tamano, paginaSegura * tamano),
    [items, paginaSegura, tamano],
  )

  const cambiarTamano = useCallback((n: number) => {
    setTamano(n)
    setPagina(1)
  }, [])

  return {
    visibles,
    pagina: paginaSegura,
    irA: setPagina,
    /** Props listas para <Paginacion {...pag.controles} /> */
    controles: {
      total,
      pagina: paginaSegura,
      tamano,
      totalPaginas,
      onPagina: setPagina,
      onTamano: cambiarTamano,
    },
  }
}