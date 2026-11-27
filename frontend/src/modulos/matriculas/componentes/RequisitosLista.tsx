import { tr } from "@/nucleo/i18n/IdiomaContext"
import type { RequisitoMatriculaDto } from "../dtos/matriculaDto"

/* Piezas que comparten el panel del administrador y el portal del instructor */

export const formatoFechaHora = (valor: string | null) =>
  valor
    ? new Date(valor).toLocaleString("es-CO", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "—"

// Barra de avance: «3 de 4» requisitos
export function ProgresoRequisitos({ cumplidos, total, compacto = false }: { cumplidos: number; total: number; compacto?: boolean }) {
  if (!total) return <span className="text-text-muted">—</span>
  const porcentaje = Math.round((cumplidos / total) * 100)
  const completo = cumplidos >= total
  return (
    <span className={`inline-flex items-center gap-2 ${compacto ? "" : "w-full"}`}>
      <span
        className={`relative h-1.5 overflow-hidden rounded-full bg-surface-alt ${compacto ? "w-16" : "w-full min-w-20"}`}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={cumplidos}
        aria-label={tr("{n} de {total} requisitos cumplidos", { n: cumplidos, total })}
      >
        <span
          className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-500 ease-out motion-reduce:transition-none ${completo ? "bg-emerald-500" : "bg-amber-500"}`}
          style={{ width: `${porcentaje}%` }}
        />
      </span>
      <span className={`shrink-0 font-condensed text-xs font-semibold tabular-nums ${completo ? "text-emerald-600 dark:text-emerald-400" : "text-text-soft"}`}>
        {cumplidos}/{total}
      </span>
    </span>
  )
}

interface ListaProps {
  requisitos: RequisitoMatriculaDto[]
  // Motivo por el que un requisito no se puede cambiar (sin motivo = se puede marcar)
  bloqueo: (requisito: RequisitoMatriculaDto) => string | undefined
  // Requisito que se está guardando
  marcando: number | null
  onMarcar: (requisito: RequisitoMatriculaDto, cumplido: boolean) => void
}

// Lista de requisitos: cada uno se marca o desmarca con un clic
export function RequisitosLista({ requisitos, bloqueo, marcando, onMarcar }: ListaProps) {
  if (!requisitos.length) {
    return <p className="font-body text-sm text-text-muted">{tr("No hay requisitos configurados.")}</p>
  }
  return (
    <ul className="flex flex-col gap-2.5">
      {requisitos.map((r) => {
        const motivo = bloqueo(r)
        const guardando = marcando === r.idRequisito
        const deshabilitado = Boolean(motivo) || marcando !== null
        return (
          <li key={r.idRequisito}>
            <button
              type="button"
              role="checkbox"
              aria-checked={r.cumplido}
              aria-busy={guardando}
              disabled={deshabilitado}
              title={motivo ? tr(motivo) : tr(r.cumplido ? "Desmarcar requisito" : "Marcar como cumplido")}
              onClick={() => onMarcar(r, !r.cumplido)}
              className={`group flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
                r.cumplido
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-border bg-surface hover:border-accent/50 hover:bg-accent/5"
              } ${motivo ? "cursor-not-allowed" : "cursor-pointer"} disabled:opacity-90`}
            >
              <span
                aria-hidden="true"
                className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 ${
                  r.cumplido
                    ? "scale-100 border-emerald-500 bg-emerald-500 text-white"
                    : "border-border text-transparent group-hover:border-accent/60"
                }`}
              >
                {guardando ? (
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent text-accent" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className="h-3.5 w-3.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 12.5l4.5 4.5L19 7.5" />
                  </svg>
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="font-body text-sm font-semibold text-text">{tr(r.nombre)}</span>
                  <span
                    className={`rounded-full border px-2 py-0.5 font-condensed text-[10px] font-semibold uppercase tracking-wider ${
                      r.responsable === "instructor"
                        ? "border-purple-400/30 bg-purple-400/10 text-purple-500 dark:text-purple-300"
                        : "border-border bg-surface-alt text-text-muted"
                    }`}
                  >
                    {tr(r.responsable === "instructor" ? "Instructor" : "Administración")}
                  </span>
                </span>
                {r.descripcion && <span className="mt-0.5 block font-body text-xs text-text-muted">{tr(r.descripcion)}</span>}
                {r.cumplido ? (
                  <span className="mt-1 block font-body text-xs font-medium text-emerald-700 dark:text-emerald-300">
                    {tr("Cumplido")} · {formatoFechaHora(r.fechaCumplido)}
                    {r.marcadoPor ? ` · ${r.marcadoPor}` : ""}
                  </span>
                ) : motivo ? (
                  <span className="mt-1 block font-body text-xs text-text-muted">{tr(motivo)}</span>
                ) : null}
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
