import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useId, useRef } from "react"

interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  blockedMessage?: string
  // "peligro" para acciones destructivas o que quitan acceso
  tone?: "normal" | "peligro"
  loading?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  blockedMessage,
  tone = "normal",
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  const tituloId = useId()
  const mensajeId = useId()
  const volverRef = useRef<HTMLButtonElement>(null)
  // Referencias para no reiniciar el efecto en cada render del padre
  const cerrarRef = useRef(onClose)
  const cargandoRef = useRef(loading)
  cerrarRef.current = onClose
  cargandoRef.current = loading

  // Foco en "Volver" (la opción segura), Escape para cerrar y foco de vuelta al salir
  useEffect(() => {
    if (!open) return
    const anterior = document.activeElement as HTMLElement | null
    volverRef.current?.focus()
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !cargandoRef.current) cerrarRef.current()
    }
    document.addEventListener("keydown", alTeclear)
    return () => {
      document.removeEventListener("keydown", alTeclear)
      anterior?.focus?.()
    }
  }, [open])

  if (!open) return null
  const botonConfirmar =
    tone === "peligro"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-accent text-on-accent hover:bg-accent-strong"

  return (
    <div
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4 backdrop-blur-sm animar-fondo"
      onMouseDown={(event) => event.target === event.currentTarget && !loading && onClose()}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={mensajeId}
        className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl animar-entrada"
      >
        <div className="border-b border-border px-6 py-5">
          <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-accent">{tr("Confirmar acción")}</p>
          <h2 id={tituloId} className="mt-1 font-display text-2xl uppercase text-text">{title}</h2>
        </div>
        <div className="p-6">
          <p id={mensajeId} className="font-body text-sm leading-6 text-text-soft">{message}</p>
          {blockedMessage && (
            <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 font-body text-sm text-red-500 dark:text-red-300">
              {blockedMessage}
            </p>
          )}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <button
              ref={volverRef}
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-full border border-border px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-text-soft transition-colors hover:border-accent hover:text-text disabled:opacity-50"
            >
              {tr("Volver")}
            </button>
            <button
              type="button"
              disabled={Boolean(blockedMessage) || loading}
              onClick={onConfirm}
              aria-busy={loading}
              className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${botonConfirmar}`}
            >
              {loading && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
              {loading ? tr("Procesando…") : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
