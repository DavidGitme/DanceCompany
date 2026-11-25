import { useState } from "react"
import { autenticacionServicio } from "../servicios/autenticacionServicio"
import DocumentoLegal from "./DocumentoLegal"
import { TERMINOS, TERMINOS_VERSION } from "./textosLegales"

interface Props {
  nombre: string
  onAceptado: () => void
  onSalir: () => void
}

/*
 * Antes de usar la plataforma, cada cuenta acepta la versión vigente de los términos
 * y el tratamiento de datos. La aceptación (versión y fecha) queda en usuarios.
 */
export default function AceptarTerminos({ nombre, onAceptado, onSalir }: Props) {
  const [leido, setLeido] = useState(false)
  const [marcado, setMarcado] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const aceptar = async () => {
    setGuardando(true)
    setError(null)
    try {
      await autenticacionServicio.aceptarTerminos(TERMINOS_VERSION)
      onAceptado()
    } catch (e) {
      setError((e as { mensaje?: string })?.mensaje ?? "No se pudo guardar la aceptación. Intenta de nuevo.")
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-page px-6">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-surface p-8">
        <p className="font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-accent">Antes de continuar</p>
        <h1 className="mt-2 font-display text-3xl uppercase text-text">Hola, {nombre}</h1>
        <p className="mt-3 font-body text-sm text-text-soft">
          Para usar la plataforma necesitamos que leas y aceptes los términos y condiciones y la autorización de
          tratamiento de datos personales.
        </p>
        <button
          type="button"
          onClick={() => { setAbierto(true); setLeido(true) }}
          className="mt-4 font-condensed text-sm font-semibold uppercase tracking-wider text-accent underline-offset-4 hover:underline"
        >
          Leer términos y tratamiento de datos
        </button>
        <label className="mt-5 flex items-start gap-3 font-body text-sm text-text">
          <input
            type="checkbox"
            checked={marcado}
            disabled={!leido || guardando}
            onChange={(e) => setMarcado(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-[var(--color-accent)]"
            aria-describedby="terminos-ayuda"
          />
          Leí y acepto los términos y condiciones y autorizo el tratamiento de mis datos personales.
        </label>
        {!leido && <p id="terminos-ayuda" className="mt-1 font-body text-xs text-text-muted">Primero ábrelos para poder marcar la casilla.</p>}
        {error && <p role="alert" className="mt-3 font-body text-sm text-red-500">{error}</p>}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={onSalir} disabled={guardando} className="rounded-full border border-border px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-text-soft hover:text-text">
            Cerrar sesión
          </button>
          <button type="button" onClick={aceptar} disabled={!marcado || guardando} aria-busy={guardando} className="rounded-full bg-accent px-5 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider text-on-accent disabled:opacity-50">
            {guardando ? "Guardando…" : "Aceptar y continuar"}
          </button>
        </div>
      </div>
      {abierto && <DocumentoLegal titulo="Términos y tratamiento de datos" secciones={TERMINOS} onCerrar={() => setAbierto(false)} />}
    </main>
  )
}
