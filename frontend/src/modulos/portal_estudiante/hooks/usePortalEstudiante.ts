import { useCallback, useEffect, useState } from "react"
import type { ErrorApi } from "@/nucleo/http/clienteHttp"
import { portalEstudianteServicio } from "../servicios/portalEstudianteServicio"
import type {
  Clase,
  Convocatorias,
  Finanzas,
  Noticia,
  Perfil,
  Talleres,
} from "../dtos/portalEstudianteDto"

export interface DatosPortal {
  perfil: Perfil
  clases: { vigentes: Clase[]; historial: Clase[] }
  finanzas: Finanzas
  talleres: Talleres
  convocatorias: Convocatorias
  noticias: Noticia[]
}

/** Carga toda la información del estudiante en paralelo. */
export function usePortalEstudiante() {
  const [datos, setDatos] = useState<DatosPortal | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState("")

  const cargar = useCallback(async () => {
    setError("")
    try {
      const [perfil, clases, finanzas, talleres, convocatorias, noticias] = await Promise.all([
        portalEstudianteServicio.perfil(),
        portalEstudianteServicio.clases(),
        portalEstudianteServicio.finanzas(),
        portalEstudianteServicio.talleres(),
        portalEstudianteServicio.convocatorias(),
        portalEstudianteServicio.noticias(),
      ])
      setDatos({ perfil, clases, finanzas, talleres, convocatorias, noticias })
    } catch (e) {
      setError((e as ErrorApi)?.mensaje ?? "No fue posible cargar tu información.")
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const postularse = useCallback(
    async (idConvocatoria: number) => {
      await portalEstudianteServicio.postularse(idConvocatoria)
      await cargar()
    },
    [cargar],
  )

  return { datos, cargando, error, recargar: cargar, postularse }
}
