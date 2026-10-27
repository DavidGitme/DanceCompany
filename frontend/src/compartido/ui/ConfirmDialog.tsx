interface ConfirmDialogProps {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  blockedMessage?: string
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmDialog({ open, title, message, confirmLabel, blockedMessage, onConfirm, onClose }: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-60 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="w-full max-w-lg overflow-hidden rounded-3xl border border-border bg-surface shadow-2xl">
        <div className="border-b border-border px-6 py-5">
          <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-purple-400">Confirmar acción</p>
          <h2 className="mt-1 font-display text-2xl uppercase text-text">{title}</h2>
        </div>
        <div className="p-6">
          <p className="font-body text-sm leading-6 text-text-soft">{message}</p>
          {blockedMessage && <p className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 font-body text-sm text-red-400">{blockedMessage}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="rounded-full border border-border px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-text-soft">Volver</button>
            <button type="button" disabled={Boolean(blockedMessage)} onClick={onConfirm} className="rounded-full bg-purple-700 px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-40">{confirmLabel}</button>
          </div>
        </div>
      </div>
    </div>
  )
}
