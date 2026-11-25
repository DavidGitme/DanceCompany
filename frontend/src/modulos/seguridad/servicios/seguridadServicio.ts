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

  // Recorre todas las páginas (la API entrega máximo 100 por página): así el total
  // y la paginación en pantalla coinciden con la base aunque haya más de 100 registros
  async listarTodo<T>(recurso: RecursoSeguridad): Promise<T[]> {
    const tamano = 100
    const primera = await seguridadServicio.listar<T>(recurso, 1, tamano)
    const datos = [...primera.datos]
    const paginas = Math.ceil(primera.total / tamano)
    for (let pagina = 2; pagina <= paginas; pagina += 1) {
      datos.push(...(await seguridadServicio.listar<T>(recurso, pagina, tamano)).datos)
    }
    return datos
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
