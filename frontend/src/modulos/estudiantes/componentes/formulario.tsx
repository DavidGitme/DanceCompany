import { errorNombrePersona } from "@/compartido/ui/PantallaRecurso"
import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react"
import { Icono, claseBotonIcono, hoverNeutro } from "@/compartido/ui/PantallaRecurso"

/* Piezas de formulario del panel: mismo estilo que PantallaRecurso */

export const claseEtiqueta =
  "mb-1.5 block font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft"

// Reglas que repiten las del backend (dominio/reglas.py) para avisar antes de enviar
export const TIPOS_SOLO_NUMEROS = ["cedula de ciudadania", "tarjeta de identidad", "registro civil"]
const EDADES_POR_TIPO: Record<string, [number, number | null]> = {
  "registro civil": [0, 6],
  "tarjeta de identidad": [7, 17],
  "cedula de ciudadania": [18, null],
}

export const sinTildes = (texto: string) =>
  texto.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()

export function edadEn(fechaNacimiento: string, hoy = new Date()): number | null {
  if (!fechaNacimiento) return null
  const nacimiento = new Date(`${fechaNacimiento}T00:00:00`)
  if (Number.isNaN(nacimiento.getTime())) return null
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const cumplio =
    hoy.getMonth() > nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() >= nacimiento.getDate())
  if (!cumplio) edad -= 1
  return edad
}

export function errorDocumento(tipo: string, documento: string): string | undefined {
  const limpio = documento.replace(/[\s.-]/g, "")
  if (!limpio) return tr("Este campo es obligatorio.")
  if (limpio.length < 5 || limpio.length > 20) return tr("Debe tener entre 5 y 20 caracteres.")
  if (TIPOS_SOLO_NUMEROS.includes(sinTildes(tipo)) && !/^\d+$/.test(limpio)) return "Este tipo de documento solo admite números."
  if (!/^[A-Za-z0-9]+$/.test(limpio)) return tr("Solo letras y números.")
  return undefined
}

export function errorTipoParaEdad(tipo: string, edad: number | null): string | undefined {
  const rango = EDADES_POR_TIPO[sinTildes(tipo)]
  if (!rango || edad === null) return undefined
  const [minima, maxima] = rango
  if (edad < minima || (maxima !== null && edad > maxima)) {
    return `Con ${edad} años no corresponde ${tipo.toLowerCase()} (es de ${minima}${maxima !== null ? ` a ${maxima}` : " en adelante"} años).`
  }
  return undefined
}

// Teléfono colombiano (dominio/reglas.py: TELEFONO_DIGITOS)
// Nombre de una persona: sin números (el backend aplica la misma regla)
export function errorNombre(nombre: string): string | undefined {
  if (nombre.trim().length < 2) return "Escribe el nombre completo."
  return errorNombrePersona(nombre)
}

export const TELEFONO_DIGITOS = 10
// Mayoría de edad del proyecto (dominio/reglas.py: EDAD_ADULTO)
export const EDAD_ADULTO = 18
export const esMenorDeEdad = (fechaNacimiento: string | null | undefined) => {
  const edad = edadEn(fechaNacimiento ?? "")
  return edad !== null && edad >= 0 && edad < EDAD_ADULTO
}

export function errorTelefono(telefono: string, requerido = true): string | undefined {
  const digitos = telefono.replace(/\D/g, "")
  if (!telefono.trim()) return requerido ? tr("Este campo es obligatorio.") : undefined
  if (/[^\d\s+-]/.test(telefono)) return tr("Escribe solo números.")
  // Se cuentan los dígitos (no los espacios ni guiones) para avisar si pasa del límite
  if (digitos.length > TELEFONO_DIGITOS)
    return tr("El teléfono admite máximo {max} dígitos (tiene {n}).", { max: TELEFONO_DIGITOS, n: digitos.length })
  if (digitos.length !== TELEFONO_DIGITOS) return tr("El teléfono debe tener exactamente 10 dígitos.")
  return undefined
}

export const correoValido = (correo: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim())

interface CampoProps {
  id: string
  etiqueta: string
  requerido?: boolean
  error?: string
  ayuda?: string
  ancho?: "mitad" | "completo"
  children: (props: { id: string; "aria-invalid"?: boolean; "aria-describedby"?: string }) => ReactNode
}

export function Campo({ id, etiqueta, requerido, error, ayuda, ancho = "mitad", children }: CampoProps) {
  const describe = [ayuda ? `${id}-ayuda` : "", error ? `${id}-error` : ""].filter(Boolean).join(" ") || undefined
  return (
    <div className={ancho === "mitad" ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className={claseEtiqueta}>
        {tr(etiqueta)}
        {requerido && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
      </label>
      {children({ id, "aria-invalid": error ? true : undefined, "aria-describedby": describe })}
      {ayuda && <p id={`${id}-ayuda`} className="mt-1 font-body text-xs text-text-muted">{tr(ayuda)}</p>}
      {error && <p id={`${id}-error`} className="mt-1 font-body text-xs font-medium text-red-600 dark:text-red-300">{error}</p>}
    </div>
  )
}

export function Seccion({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 border-b border-border pb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent sm:col-span-2">
      {children}
    </p>
  )
}

export function MensajeError({ mensaje }: { mensaje: string | null }) {
  if (!mensaje) return null
  return (
    <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 font-body text-sm text-red-600 dark:text-red-300">
      <Icono nombre="alerta" clase="h-5 w-5 shrink-0" />
      {mensaje}
    </p>
  )
}

interface DialogoProps {
  antetitulo: string
  titulo: string
  ocupado?: boolean
  onCerrar: () => void
  onEnviar?: (evento: FormEvent) => void
  pie?: ReactNode
  children: ReactNode
}

// Diálogo modal accesible: foco inicial, Escape para cerrar y foco atrapado
export function Dialogo({ antetitulo, titulo, ocupado = false, onCerrar, onEnviar, pie, children }: DialogoProps) {
  const tituloId = useId()
  const ref = useRef<HTMLFormElement>(null)
  const cerrarRef = useRef(onCerrar)
  const ocupadoRef = useRef(ocupado)
  cerrarRef.current = onCerrar
  ocupadoRef.current = ocupado

  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const dialogo = ref.current
    dialogo?.querySelector<HTMLElement>("input, select, textarea, button")?.focus()
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !ocupadoRef.current) cerrarRef.current()
      if (evento.key !== "Tab" || !dialogo) return
      const enfocables = Array.from(
        dialogo.querySelectorAll<HTMLElement>("button, input, select, textarea, [href]"),
      ).filter((el) => !el.hasAttribute("disabled"))
      if (!enfocables.length) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener("keydown", alTeclear)
    return () => {
      document.removeEventListener("keydown", alTeclear)
      anterior?.focus?.()
    }
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animar-fondo"
      onMouseDown={(e) => e.target === e.currentTarget && !ocupado && onCerrar()}
    >
      <form
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          onEnviar?.(e)
        }}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl animar-entrada"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-accent">{antetitulo}</p>
            <h2 id={tituloId} className="mt-1 font-display text-2xl uppercase leading-none text-text">{titulo}</h2>
          </div>
          <button type="button" onClick={onCerrar} disabled={ocupado} className={`${claseBotonIcono} ${hoverNeutro}`} aria-label={tr("Cerrar")}>
            <Icono nombre="cerrar" clase="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {pie && (
          <footer className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">{pie}</footer>
        )}
      </form>
    </div>
  )
}
