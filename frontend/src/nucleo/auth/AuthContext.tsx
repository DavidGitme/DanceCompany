import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { autenticacionServicio } from "@/modulos/autenticacion/servicios/autenticacionServicio"
import type {
  InicioSesionSolicitudDto,
  UsuarioSesion,
} from "@/modulos/autenticacion/dtos/autenticacionDto"
import { configurarIntercepcionAuth } from "@/nucleo/http/clienteHttp"
import { tokenStore } from "./tokenStore"

interface AuthContexto {
  usuario: UsuarioSesion | null
  cargando: boolean
  iniciarSesion: (solicitud: InicioSesionSolicitudDto) => Promise<void>
  cerrarSesion: () => Promise<void>
}

export const AuthContext = createContext<AuthContexto | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSesion | null>(null)
  const [cargando, setCargando] = useState(true)

  const limpiarSesion = useCallback(() => {
    tokenStore.limpiar()
    setUsuario(null)
  }, [])

  const renovar = useCallback(async () => {
    const sesion = await autenticacionServicio.renovar()
    if (!sesion) return null
    tokenStore.guardar(sesion.tokenAcceso)
    setUsuario(sesion.usuario)
    return sesion.tokenAcceso
  }, [])

  useEffect(() => {
    configurarIntercepcionAuth(renovar, limpiarSesion)
    renovar().finally(() => setCargando(false))
  }, [limpiarSesion, renovar])

  const iniciarSesion = useCallback(
    async (solicitud: InicioSesionSolicitudDto) => {
      const sesion = await autenticacionServicio.iniciarSesion(solicitud)
      tokenStore.guardar(sesion.tokenAcceso)
      setUsuario(sesion.usuario)
    },
    [],
  )

  const cerrarSesion = useCallback(async () => {
    try {
      await autenticacionServicio.cerrarSesion()
    } finally {
      limpiarSesion()
    }
  }, [limpiarSesion])

  const valor = useMemo(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  )

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}
