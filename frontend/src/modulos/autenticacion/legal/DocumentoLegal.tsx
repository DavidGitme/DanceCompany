import { useEffect, useId, useRef } from "react"
import { ES_BORRADOR, type SeccionLegal } from "./textosLegales"

interface Props {
  titulo: string
  secciones: SeccionLegal[]
  onCerrar: () => void
}

// Ventana de lectura de los términos o la política de cookies
export default function DocumentoLegal({ titulo, secciones, onCerrar }: Props) {
  const tituloId = useId()
  const cerrarRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cerrarRef.current?.focus()
    const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && onCerrar()
    document.addEventListener("keydown", alTeclear)
    return () => document.removeEventListener("keydown", alTeclear)
  }, [onCerrar])

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby={tituloId} className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-3xl border border-border bg-surface shadow-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <h2 id={tituloId} className="font-display text-2xl uppercase text-text">{titulo}</h2>
          <button ref={cerrarRef} type="button" onClick={onCerrar} className="rounded-full px-3 py-1 font-condensed text-sm uppercase tracking-wider text-text-soft hover:text-text">
            Cerrar
          </button>
        </header>
        <div className="overflow-y-auto px-6 py-5 font-body text-sm text-text-soft">
          {ES_BORRADOR && (
            <p className="mb-4 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-amber-800 dark:text-amber-200">
              Borrador pendiente de aprobación por la academia.
            </p>
          )}
          {secciones.map((s) => (
            <section key={s.titulo} className="mb-4">
              <h3 className="mb-1 font-condensed text-sm font-bold uppercase tracking-wider text-text">{s.titulo}</h3>
              {s.parrafos.map((p, i) => <p key={i} className="mb-2 leading-relaxed">{p}</p>)}
            </section>
          ))}
        </div>
      </div>
    </div>
  )
}
