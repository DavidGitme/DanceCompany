import { FilterDefinition } from "@/app/admin/tipos"

interface FilterBarProps {
  filters: FilterDefinition[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onClear: () => void
}

export default function FilterBar({ filters, values, onChange, onClear }: FilterBarProps) {
  if (!filters.length) return null
  return (
    <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-border bg-surface p-4">
      {filters.map((filter) => (
        <label key={filter.key} className="flex min-w-36 flex-1 flex-col gap-1.5">
          <span className="font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">{filter.label}</span>
          <select
            value={values[filter.key] ?? ""}
            onChange={(event) => onChange(filter.key, event.target.value)}
            className="rounded-xl border border-border bg-surface-alt px-3 py-2 font-body text-sm text-text outline-none transition focus:border-purple-400"
          >
            <option value="">Todos</option>
            {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      <button type="button" onClick={onClear} className="rounded-full border border-border px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted transition hover:border-purple-400/50 hover:text-text">
        Limpiar filtros
      </button>
    </div>
  )
}
