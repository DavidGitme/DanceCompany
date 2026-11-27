import { tr } from "@/nucleo/i18n/IdiomaContext"
interface PaginacionProps {
  total: number
  pagina: number
  tamano: number
  totalPaginas: number
  onPagina: (n: number) => void
  onTamano?: (n: number) => void
  opciones?: number[]
}

const paginasVisibles = (actual: number, total: number): (number | "...")[] => {
  const base = [...new Set([1, total, actual - 1, actual, actual + 1])]
    .filter((n) => n >= 1 && n <= total)
    .sort((a, b) => a - b)
  const out: (number | "...")[] = []
  base.forEach((n, i) => {
    if (i > 0 && n - base[i - 1] > 1) out.push("...")
    out.push(n)
  })
  return out
}

const btn =
  "min-w-9 h-9 px-3 rounded-full border font-condensed text-sm font-semibold uppercase tracking-wider transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-35"

export default function Paginacion({
  total,
  pagina,
  tamano,
  totalPaginas,
  onPagina,
  onTamano,
  opciones = [5, 10, 20, 50],
}: PaginacionProps) {
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1
  const hasta = Math.min(pagina * tamano, total)

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
      <div className="flex items-center gap-4">
        <span className="font-condensed text-xs uppercase tracking-wider text-text-soft">
          {tr(total === 1 ? "({desde}–{hasta}) de {total} registro" : "({desde}–{hasta}) de {total} registros", { desde, hasta, total })}
        </span>
        {onTamano && (
          <label className="flex items-center gap-2 font-condensed text-xs uppercase tracking-wider text-text-soft">
            {tr("Filas")}
            <select
              value={tamano}
              onChange={(e) => onTamano(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface-alt px-2 py-1 text-text"
            >
              {opciones.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
      {/* La página actual siempre visible, aunque solo haya una */}
      <span className="font-condensed text-xs font-semibold uppercase tracking-wider text-text" aria-live="polite">
        {tr("Página {pagina} de {paginas}", { pagina: Math.min(pagina, Math.max(1, totalPaginas)), paginas: Math.max(1, totalPaginas) })}
      </span>
      {totalPaginas > 1 && (
        <nav aria-label={tr("Paginación")} className="flex items-center gap-1.5">
          <button
            type="button"
            className={`${btn} border-border text-text-soft hover:border-accent hover:text-text`}
            disabled={pagina === 1}
            onClick={() => onPagina(pagina - 1)}
          >
            {tr("Anterior")}
          </button>
          {paginasVisibles(pagina, totalPaginas).map((p, i) =>
            p === "..." ? (
              <span key={`e-${i}`} className="px-1 text-text-muted" aria-hidden="true">
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === pagina ? "page" : undefined}
                onClick={() => onPagina(p)}
                className={`${btn} ${
                  p === pagina
                    ? "border-accent bg-accent text-on-accent"
                    : "border-border text-text-soft hover:border-accent hover:text-text"
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            className={`${btn} border-border text-text-soft hover:border-accent hover:text-text`}
            disabled={pagina === totalPaginas}
            onClick={() => onPagina(pagina + 1)}
          >
            {tr("Siguiente")}
          </button>
        </nav>
      )}
      </div>
    </div>
  )
}