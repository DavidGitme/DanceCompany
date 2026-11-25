import { useState } from "react"
import { useAdministration } from "../datos/ContextoAdministracion"

/*
 * SIMULACIÓN de pago de una mensualidad.
 * No es una pasarela real: no pide ni envía datos de tarjetas o cuentas, no llama a ningún
 * servicio externo y no guarda nada en la base de datos. Solo marca la mensualidad como pagada
 * en los datos de ejemplo de esta pantalla para mostrar cómo sería el flujo.
 * Los nombres de los medios son referencias visuales; los íconos son genéricos.
 */

type Medio = { id: string; nombre: string; detalle: string; idMetodo: number; icono: "banco" | "celular" | "tarjeta" }

const MEDIOS: Medio[] = [
  { id: "pse", nombre: "PSE", detalle: "Débito desde cuenta bancaria", idMetodo: 2, icono: "banco" },
  { id: "nequi", nombre: "Nequi", detalle: "Billetera en el celular", idMetodo: 2, icono: "celular" },
  { id: "daviplata", nombre: "Daviplata", detalle: "Billetera en el celular", idMetodo: 2, icono: "celular" },
  { id: "tarjeta", nombre: "Tarjeta", detalle: "Crédito o débito", idMetodo: 3, icono: "tarjeta" },
]

const RUTAS_ICONO: Record<Medio["icono"], string> = {
  banco: "M12 3 3 8h18L12 3zM5 10v7m4.67-7v7m4.66-7v7M19 10v7M3 20h18",
  celular: "M8 3h8a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm3 15h2",
  tarjeta: "M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7zm0 3h18M7 15h3",
}

const hoy = () => new Date().toISOString().slice(0, 10)

export default function SimuladorPago({ mensualidad }: { mensualidad: { idMensualidad: number; idMatricula: number; valor_pagar: number; idEstado: number } }) {
  const { setTable } = useAdministration()
  const [abierto, setAbierto] = useState(false)
  const [medio, setMedio] = useState<Medio | null>(null)
  const [referencia, setReferencia] = useState<string | null>(null)

  if (mensualidad.idEstado === 4 && !referencia) return null

  const confirmar = () => {
    if (!medio) return
    const ref = `SIM-${Date.now().toString().slice(-6)}`
    setTable("mensualidades", (filas) =>
      filas.map((m) => (m.idMensualidad === mensualidad.idMensualidad ? { ...m, idEstado: 4, fecha_pago: hoy() } : m)),
    )
    setTable("pagos", (filas) => [
      ...filas,
      {
        idPago: Math.max(0, ...filas.map((p) => p.idPago)) + 1,
        monto: Number(mensualidad.valor_pagar),
        fecha_pago: hoy(),
        idMetodo: medio.idMetodo,
        idMensualidad: mensualidad.idMensualidad,
        idMatricula: mensualidad.idMatricula,
        idAcudiente: null,
        idEstudiante: null,
      },
    ])
    setReferencia(ref)
  }

  if (referencia) {
    return (
      <p role="status" className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-body text-sm text-emerald-700 dark:text-emerald-300">
        Pago simulado con {medio?.nombre}. Referencia de prueba {referencia}. No se cobró dinero.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {!abierto ? (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="self-start rounded-full bg-purple-700 px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-white hover:bg-purple-600"
        >
          Simular pago
        </button>
      ) : (
        <div className="flex flex-col gap-4 rounded-2xl border border-border bg-surface-alt p-4">
          <p className="rounded-xl border border-amber-500/35 bg-amber-500/10 px-3 py-2 font-body text-xs font-semibold text-amber-800 dark:text-amber-200">
            Simulación: no es un pago real. No se piden ni se envían datos de tarjetas o cuentas.
          </p>
          <p className="font-body text-sm text-text">
            Valor: <strong>${Number(mensualidad.valor_pagar).toLocaleString("es-CO")}</strong>. Elige el medio:
          </p>
          <div role="radiogroup" aria-label="Medio de pago simulado" className="grid gap-2 sm:grid-cols-2">
            {MEDIOS.map((m) => (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={medio?.id === m.id}
                onClick={() => setMedio(m)}
                className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${
                  medio?.id === m.id ? "border-purple-500 bg-purple-500/10" : "border-border hover:border-purple-400"
                }`}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6 flex-shrink-0 text-purple-400" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d={RUTAS_ICONO[m.icono]} />
                </svg>
                <span>
                  <span className="block font-body text-sm font-semibold text-text">{m.nombre}</span>
                  <span className="block font-body text-xs text-text-muted">{m.detalle}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={!medio}
              onClick={confirmar}
              className="rounded-full bg-purple-700 px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              Confirmar pago simulado
            </button>
            <button type="button" onClick={() => { setAbierto(false); setMedio(null) }} className="font-body text-sm text-text-muted hover:text-text">
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
