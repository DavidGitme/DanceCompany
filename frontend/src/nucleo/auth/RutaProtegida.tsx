import type { ReactNode } from "react"
import { useAuth } from "./useAuth"
import { requierePermiso, tieneModulosDelPanel } from "./requierePermiso"

interface RutaProtegidaProps {
  children: ReactNode
  permiso?: string
  // Basta con que el rol vea algún módulo del panel (privilegios por módulo)
  conModulos?: boolean
  alNoAutorizado: ReactNode
}

export default function RutaProtegida({
  children,
  permiso,
  conModulos,
  alNoAutorizado,
}: RutaProtegidaProps) {
  const { usuario, cargando } = useAuth()

  if (cargando) return null
  const autorizado = conModulos ? tieneModulosDelPanel(usuario) : !permiso || requierePermiso(usuario, permiso)
  if (!usuario || !autorizado) {
    return alNoAutorizado
  }
  return children
}
