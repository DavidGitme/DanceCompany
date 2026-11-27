import { tr } from "@/nucleo/i18n/IdiomaContext"

/*
 * Interruptor para activar o inactivar una matrícula. Reemplaza el ícono de «apagar»:
 * muestra el estado actual (encendido = activa o en proceso) y al pulsarlo se pide
 * confirmación. Usa los mismos colores que StatusBadge (verde activa, ámbar pendiente).
 */

interface Props {
  encendido: boolean
  // La matrícula está en proceso de aprobación (encendida, en ámbar)
  pendiente?: boolean
  nombre: string
  deshabilitado?: boolean
  onCambiar: () => void
}

export default function InterruptorEstado({ encendido, pendiente = false, nombre, deshabilitado = false, onCambiar }: Props) {
  const pista = tr(encendido ? (pendiente ? "Cancelar el proceso (inactivar)" : "Inactivar") : "Activar")
  const claseColor = encendido
    ? pendiente
      ? "border-amber-500/60 bg-amber-500 shadow-amber-500/30"
      : "border-emerald-500/60 bg-emerald-500 shadow-emerald-500/30"
    : "border-border bg-surface-alt"

  return (
    <span className="grid h-9 w-12 place-items-center">
      <button
        type="button"
        role="switch"
        aria-checked={encendido}
        aria-label={tr(encendido ? "Inactivar {nombre}" : "Activar {nombre}", { nombre })}
        title={pista}
        disabled={deshabilitado}
        onClick={onCambiar}
        className={`group relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border shadow-inner transition-all duration-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-95 motion-reduce:transition-none disabled:cursor-not-allowed disabled:opacity-50 ${claseColor}`}
      >
        <span
          aria-hidden="true"
          className={`pointer-events-none grid h-[18px] w-[18px] place-items-center rounded-full bg-white shadow-md ring-0 transition-transform duration-300 ease-out group-hover:scale-110 motion-reduce:transition-none ${
            encendido ? "translate-x-[21px]" : "translate-x-[2px]"
          }`}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} className={`h-2.5 w-2.5 ${encendido ? (pendiente ? "text-amber-500" : "text-emerald-600") : "text-text-muted"}`}>
            <path strokeLinecap="round" strokeLinejoin="round" d={encendido ? "M5 12.5l4.5 4.5L19 7.5" : "M6 18L18 6M6 6l12 12"} />
          </svg>
        </span>
      </button>
    </span>
  )
}
