import { clienteHttp } from "@/nucleo/http/clienteHttp"
import { env } from "@/nucleo/config/env"
import type { RespuestaLista } from "@/compartido/tipos/entities"
import {
  estadosSeed,
  permisosSeed,
  personasSeed,
  rolesSeed,
  usuariosSeed,
} from "../datos/seguridad"

type RecursoSeguridad =
  | "estados"
  | "permisos"
  | "personas"
  | "roles"
  | "usuarios"

const semillas: Record<RecursoSeguridad, unknown[]> = {
  estados: estadosSeed,
  permisos: permisosSeed,
  personas: personasSeed,
  roles: rolesSeed,
  usuarios: usuariosSeed.map(({ password_hash: _, persona_id, idUsuario: __, ...usuario }) => ({
    ...usuario,
    documento:
      personasSeed.find((persona) => persona.idPersona === persona_id)?.documento ??
      "",
  })),
}

export const seguridadServicio = {
  async listar<T>(
    recurso: RecursoSeguridad,
    pagina = 1,
    tamano = 20,
  ): Promise<RespuestaLista<T>> {
    if (!env.usarMock) {
      return clienteHttp.get<RespuestaLista<T>>(
        `/${recurso}?pagina=${pagina}&tamano=${tamano}`,
      )
    }
    const inicio = (pagina - 1) * tamano
    const datos = semillas[recurso].slice(inicio, inicio + tamano) as T[]
    return { datos, total: semillas[recurso].length, pagina, tamano }
  },

  async crear<T, S>(recurso: RecursoSeguridad, solicitud: S): Promise<T> {
    if (!env.usarMock) return clienteHttp.post<T>(`/${recurso}`, solicitud)
    return { ...solicitud } as T
  },

  async actualizar<T, S>(
    recurso: RecursoSeguridad,
    id: number | string,
    solicitud: S,
  ): Promise<T> {
    if (!env.usarMock) {
      return clienteHttp.put<T>(`/${recurso}/${id}`, solicitud)
    }
    return { ...solicitud } as T
  },

  async inactivar<T>(
    recurso: RecursoSeguridad,
    id: number | string,
  ): Promise<T> {
    if (!env.usarMock) return clienteHttp.delete<T>(`/${recurso}/${id}`)
    return { idEstado: 2 } as T
  },
}
