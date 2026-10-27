import { clienteHttp } from "@/nucleo/http/clienteHttp"
import { env } from "@/nucleo/config/env"
import { sesionAdministradorMock } from "../datos/autenticacionMock"
import {
  dtoAModelo,
  type InicioSesionSolicitudDto,
  type Sesion,
  type TokenRespuestaDto,
  type UsuarioSesionDto,
} from "../dtos/autenticacionDto"

const esperarMock = () => new Promise((resolver) => setTimeout(resolver, 120))

export const autenticacionServicio = {
  async iniciarSesion(solicitud: InicioSesionSolicitudDto): Promise<Sesion> {
    if (env.usarMock) {
      await esperarMock()
      if (!solicitud.documento.trim() || !solicitud.clave.trim()) {
        throw new Error("Documento o clave incorrectos.")
      }
      return dtoAModelo(sesionAdministradorMock)
    }
    return dtoAModelo(
      await clienteHttp.post<TokenRespuestaDto>("/auth/login", solicitud),
    )
  },

  async renovar(): Promise<Sesion | null> {
    if (env.usarMock) return null
    try {
      return dtoAModelo(
        await clienteHttp.postSinReintento<TokenRespuestaDto>("/auth/refresh"),
      )
    } catch {
      return null
    }
  },

  async cerrarSesion(): Promise<void> {
    if (!env.usarMock) await clienteHttp.post<void>("/auth/logout")
  },

  async obtenerUsuario(): Promise<UsuarioSesionDto> {
    if (env.usarMock) return sesionAdministradorMock.usuario
    return clienteHttp.get<UsuarioSesionDto>("/auth/me")
  },
}
