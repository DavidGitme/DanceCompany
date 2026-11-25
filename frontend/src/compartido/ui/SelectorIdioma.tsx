import { useIdioma } from "@/nucleo/i18n/useIdioma"
import type { Idioma } from "@/nucleo/i18n/IdiomaContext"

const OPCIONES: { valor: Idioma; etiqueta: string; nombre: string }[] = [
  { valor: "es", etiqueta: "ES", nombre: "Español" },
  { valor: "en", etiqueta: "EN", nombre: "English" },
]

/** Selector de idioma ES | EN. Hereda el color del texto que lo rodea. */
export default function SelectorIdioma({ className = "" }: { className?: string }) {
  const { idioma, cambiarIdioma, t } = useIdioma()
  return (
    <div
      role="group"
      aria-label={t("Idioma")}
      className={`inline-flex h-9 shrink-0 items-center rounded-full border border-current/30 p-0.5 font-condensed text-xs font-bold tracking-widest ${className}`}
    >
      {OPCIONES.map((o) => {
        const activo = idioma === o.valor
        return (
          <button
            key={o.valor}
            type="button"
            lang={o.valor}
            aria-pressed={activo}
            aria-label={o.nombre}
            title={o.nombre}
            onClick={() => cambiarIdioma(o.valor)}
            className={[
              "h-full rounded-full px-2.5 transition-colors duration-200",
              activo ? "bg-purple-700 text-white" : "opacity-70 hover:opacity-100",
            ].join(" ")}
          >
            {o.etiqueta}
          </button>
        )
      })}
    </div>
  )
}
