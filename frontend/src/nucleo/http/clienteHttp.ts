import { env } from "@/nucleo/config/env"
import { tokenStore } from "@/nucleo/auth/tokenStore"

export interface ErrorApi {
  codigo: string
  mensaje: string
  detalles?: unknown
}

type RenovadorToken = () => Promise<string | null>
type ManejadorSesionVencida = () => void

let renovarToken: RenovadorToken | null = null
let manejarSesionVencida: ManejadorSesionVencida | null = null

export function configurarIntercepcionAuth(
  renovador: RenovadorToken,
  alVencer: ManejadorSesionVencida,
) {
  renovarToken = renovador
  manejarSesionVencida = alVencer
}

async function solicitar<T>(
  ruta: string,
  opciones: RequestInit = {},
  permitirReintento = true,
): Promise<T> {
  const headers = new Headers(opciones.headers)
  const token = tokenStore.obtener()

  if (opciones.body && !(opciones.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }
  if (token) headers.set("Authorization", `Bearer ${token}`)

  const respuesta = await fetch(`${env.apiUrl}${ruta}`, {
    ...opciones,
    headers,
    credentials: "include",
  })

  if (respuesta.status === 401 && permitirReintento && renovarToken) {
    const tokenRenovado = await renovarToken()
    if (tokenRenovado) return solicitar<T>(ruta, opciones, false)
    manejarSesionVencida?.()
  }

  if (!respuesta.ok) {
    const error = (await respuesta.json().catch(() => null)) as ErrorApi | null
    throw {
      codigo: error?.codigo ?? "error_http",
      mensaje: error?.mensaje ?? "No fue posible completar la solicitud.",
      detalles: error?.detalles,
    } satisfies ErrorApi
  }

  if (respuesta.status === 204) return undefined as T
  return respuesta.json() as Promise<T>
}

export const clienteHttp = {
  get: <T>(ruta: string) => solicitar<T>(ruta),
  post: <T>(ruta: string, cuerpo?: unknown) =>
    solicitar<T>(ruta, {
      method: "POST",
      body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
    }),
  postSinReintento: <T>(ruta: string, cuerpo?: unknown) =>
    solicitar<T>(
      ruta,
      {
        method: "POST",
        body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo),
      },
      false,
    ),
  put: <T>(ruta: string, cuerpo: unknown) =>
    solicitar<T>(ruta, { method: "PUT", body: JSON.stringify(cuerpo) }),
  patch: <T>(ruta: string, cuerpo: unknown) =>
    solicitar<T>(ruta, { method: "PATCH", body: JSON.stringify(cuerpo) }),
  delete: <T>(ruta: string) => solicitar<T>(ruta, { method: "DELETE" }),
}
