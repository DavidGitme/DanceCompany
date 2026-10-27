import type { ReactNode } from "react"
import { useAuth } from "./useAuth"
import { requierePermiso } from "./requierePermiso"

interface RutaProtegidaProps {
  children: ReactNode
  permiso?: string
  alNoAutorizado: ReactNode
}

export default function RutaProtegida({
  children,
  permiso,
  alNoAutorizado,
}: RutaProtegidaProps) {
  const { usuario, cargando } = useAuth()

  if (cargando) return null
  if (!usuario || (permiso && !requierePermiso(usuario, permiso))) {
    return alNoAutorizado
  }
  return children
}
