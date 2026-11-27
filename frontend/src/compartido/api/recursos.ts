import { clienteHttp, type ErrorApi } from "@/nucleo/http/clienteHttp"
import type { RespuestaLista } from "@/compartido/tipos/entities"

// Contrato común de los módulos (docs/api.md): lista paginada, detalle,
// creación, edición parcial, cambio de estado o borrado lógico.

export type ParametrosLista = Record<string, string | number | undefined | null>

const consulta = (parametros: ParametrosLista) => {
  const busqueda = new URLSearchParams()
  Object.entries(parametros).forEach(([clave, valor]) => {
    if (valor !== undefined && valor !== null && String(valor).trim() !== "") {
      busqueda.set(clave, String(valor).trim())
    }
  })
  const texto = busqueda.toString()
  return texto ? `?${texto}` : ""
}

export const recursoApi = {
  listar: <T>(ruta: string, parametros: ParametrosLista = {}) =>
    clienteHttp.get<RespuestaLista<T>>(`${ruta}${consulta(parametros)}`),
  opciones: <T>(ruta: string, parametros: ParametrosLista = {}) =>
    clienteHttp.get<T[]>(`${ruta}${consulta(parametros)}`),
  crear: <T>(ruta: string, cuerpo: unknown) => clienteHttp.post<T>(ruta, cuerpo),
  actualizar: <T>(ruta: string, id: number | string, cuerpo: unknown) =>
    clienteHttp.put<T>(`${ruta}/${encodeURIComponent(String(id))}`, cuerpo),
  cambiarEstado: <T>(ruta: string, id: number | string, idEstado: number) =>
    clienteHttp.patch<T>(`${ruta}/${encodeURIComponent(String(id))}/estado`, { idEstado }),
  eliminar: (ruta: string, id: number | string) => clienteHttp.delete<void>(`${ruta}/${encodeURIComponent(String(id))}`),
}

// Mensaje legible de un error de la API (o de red)
export function mensajeError(error: unknown): string {
  // fetch lanza TypeError cuando no hay red o el servidor no responde
  if (error instanceof TypeError) {
    return "No hay conexión con el servidor. Revisa tu conexión e inténtalo de nuevo."
  }
  return (error as ErrorApi | undefined)?.mensaje ?? "No fue posible completar la operación."
}

interface DetalleValidacion {
  type?: string
  loc?: unknown[]
  msg?: string
  ctx?: Record<string, unknown>
}

// Pydantic responde en inglés: se traducen los casos que usan estos formularios
const traducir = ({ type, msg, ctx }: DetalleValidacion) => {
  switch (type) {
    case "missing":
      return "Este campo es obligatorio."
    case "string_too_short":
      return Number(ctx?.min_length) > 1
        ? `Escribe al menos ${ctx?.min_length} caracteres.`
        : "Este campo es obligatorio."
    case "string_too_long":
      return `Máximo ${ctx?.max_length} caracteres.`
    case "greater_than":
      return `Debe ser mayor que ${ctx?.gt}.`
    case "greater_than_equal":
      return `Debe ser mayor o igual a ${ctx?.ge}.`
    case "less_than_equal":
      return `Debe ser menor o igual a ${ctx?.le}.`
    case "int_parsing":
    case "decimal_parsing":
      return "Escribe un número válido."
    case "date_from_datetime_parsing":
    case "date_parsing":
      return "Escribe una fecha válida."
    case "value_error":
      // Las reglas del backend llegan como "Value error, <mensaje en español>"
      return msg?.includes("email") ? "Escribe un correo válido." : (msg?.replace(/^Value error,\s*/, "") ?? "Valor no válido.")
    default:
      return msg ?? "Valor no válido."
  }
}

// Errores de validación 422 de FastAPI → { campo: mensaje }
export function erroresDeCampo(error: unknown): Record<string, string> {
  const detalles = (error as ErrorApi | undefined)?.detalles
  if (!Array.isArray(detalles)) return {}
  const errores: Record<string, string> = {}
  detalles.forEach((detalle: DetalleValidacion) => {
    const campo = detalle.loc?.[detalle.loc.length - 1]
    if (typeof campo === "string") errores[campo] = traducir(detalle)
  })
  return errores
}
