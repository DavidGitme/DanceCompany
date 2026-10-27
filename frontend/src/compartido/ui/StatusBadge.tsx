const tones: Record<string, string> = {
  activo: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  activa: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  pagada: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  aprobado: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  aprobada: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  publicada: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  abierta: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  disponible: "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
  pendiente: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  postulado: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  borrador: "border-amber-500/30 bg-amber-500/15 text-amber-400",
  vencida: "border-red-500/30 bg-red-500/15 text-red-400",
  rechazado: "border-red-500/30 bg-red-500/15 text-red-400",
  cancelada: "border-red-500/30 bg-red-500/15 text-red-400",
  expirada: "border-red-500/30 bg-red-500/15 text-red-400",
  inactivo: "border-border bg-surface-alt text-text-muted",
  inactiva: "border-border bg-surface-alt text-text-muted",
  cerrada: "border-border bg-surface-alt text-text-muted",
}

export default function StatusBadge({ status }: { status: string }) {
  const tone = tones[status.toLocaleLowerCase()] ?? "border-purple-400/30 bg-purple-400/10 text-purple-400"
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 font-condensed text-xs font-semibold uppercase tracking-wider ${tone}`}>
      {status}
    </span>
  )
}
