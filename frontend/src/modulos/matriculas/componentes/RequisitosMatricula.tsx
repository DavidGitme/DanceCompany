import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useState } from "react"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import StatusBadge from "@/compartido/ui/StatusBadge"
import { claseBotonPrincipal, claseBotonSecundario } from "@/compartido/ui/PantallaRecurso"
import { mensajeError } from "@/compartido/api/recursos"
import { Dialogo, MensajeError } from "@/modulos/estudiantes"
import {
  MATRICULA_ACTIVA,
  esPendiente,
  etiquetaEstado,
  type MatriculaDetalleDto,
  type MatriculaDto,
  type RequisitoMatriculaDto,
} from "../dtos/matriculaDto"
import { matriculaServicio } from "../servicios/matriculaServicio"
import { ProgresoRequisitos, RequisitosLista, formatoFechaHora } from "./RequisitosLista"

/*
 * Requisitos y aprobación de una matrícula (panel del administrador).
 * Cada requisito se marca al cumplirse; con todos cumplidos se habilita «Aprobar».
 */

const pesos = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })

interface Props {
  matricula: MatriculaDto
  // Privilegio de editar del módulo: sin él la ficha es de solo lectura
  puedeEditar: boolean
  onCerrar: () => void
  // Se llama después de cada cambio (para recargar la lista); con mensaje al aprobar
  onCambio: (detalle: MatriculaDetalleDto, mensaje?: string) => void
}

export default function RequisitosMatricula({ matricula, puedeEditar, onCerrar, onCambio }: Props) {
  const [detalle, setDetalle] = useState<MatriculaDetalleDto | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<number | null>(null)
  const [confirmar, setConfirmar] = useState(false)
  const [aprobando, setAprobando] = useState(false)
  const [errorAprobar, setErrorAprobar] = useState<string | undefined>()

  useEffect(() => {
    let vigente = true
    matriculaServicio
      .detalle(matricula.idMatricula)
      .then((d) => vigente && setDetalle(d))
      .catch((e) => vigente && setError(mensajeError(e)))
    return () => {
      vigente = false
    }
  }, [matricula.idMatricula])

  const datos = detalle ?? { ...matricula, requisitos: [] }
  const pendiente = esPendiente(datos)
  const faltan = datos.requisitos.filter((r) => !r.cumplido)
  const cumplidos = datos.requisitos.length - faltan.length
  const listo = pendiente && detalle !== null && faltan.length === 0

  const bloqueo = (_r: RequisitoMatriculaDto): string | undefined => {
    if (!puedeEditar) return "Tu rol no puede cambiar requisitos."
    if (!pendiente) return datos.idEstado === MATRICULA_ACTIVA ? "La matrícula ya está aprobada." : "La matrícula está inactiva."
    return undefined
  }

  const marcar = async (r: RequisitoMatriculaDto, cumplido: boolean) => {
    setMarcando(r.idRequisito)
    setError(null)
    try {
      const nuevo = await matriculaServicio.marcarRequisito(datos.idMatricula, r.idRequisito, cumplido)
      setDetalle(nuevo)
      onCambio(nuevo)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setMarcando(null)
    }
  }

  const aprobar = async () => {
    setAprobando(true)
    setErrorAprobar(undefined)
    try {
      const nuevo = await matriculaServicio.aprobar(datos.idMatricula)
      setDetalle(nuevo)
      setConfirmar(false)
      onCambio(nuevo, tr("La matrícula de {nombre} quedó aprobada y activa.", { nombre: nuevo.estudiante }))
    } catch (e) {
      setErrorAprobar(mensajeError(e))
    } finally {
      setAprobando(false)
    }
  }

  const resumen: [string, string][] = [
    ["Grupo", `${datos.grupo} (${datos.nivel} · ${datos.estilo})`],
    ["Sede", datos.sede],
    ["Instructor", datos.instructor ?? "—"],
    ["Fecha de matrícula", new Date(`${datos.fecha_matricula}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })],
    ["Valor de la matrícula", pesos.format(Number(datos.valor_matricula))],
    ["Saldo", pesos.format(Number(datos.saldo))],
  ]

  return (
    <>
      <Dialogo
        antetitulo={`${tr("Matrícula")} · ${tr("Requisitos y aprobación")}`}
        titulo={datos.estudiante}
        // Mientras se confirma la aprobación, Escape solo cierra la confirmación
        ocupado={marcando !== null || aprobando || confirmar}
        onCerrar={onCerrar}
        pie={
          <>
            <button type="button" onClick={onCerrar} disabled={marcando !== null || aprobando} className={claseBotonSecundario}>
              {tr("Cerrar")}
            </button>
            {pendiente && puedeEditar && (
              <button
                type="button"
                disabled={!listo || marcando !== null}
                onClick={() => {
                  setErrorAprobar(undefined)
                  setConfirmar(true)
                }}
                title={listo ? tr("Aprobar matrícula") : tr("Marca todos los requisitos para aprobarla.")}
                className={claseBotonPrincipal}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {tr("Aprobar matrícula")}
              </button>
            )}
          </>
        }
      >
        <MensajeError mensaje={error} />

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <StatusBadge status={etiquetaEstado(datos.estado)} />
          <span className="font-body text-xs text-text-muted">{datos.documento}</span>
        </div>

        {/* Estado del proceso */}
        {pendiente ? (
          <p className="mb-5 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 font-body text-sm text-amber-800 dark:text-amber-200">
            {listo
              ? tr("Cumple todos los requisitos: ya puedes aprobar la matrícula.")
              : tr("Pendiente de aprobación. Marca cada requisito cuando se cumpla; con todos cumplidos se aprueba la matrícula.")}
          </p>
        ) : datos.idEstado === MATRICULA_ACTIVA ? (
          <p className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 font-body text-sm text-emerald-800 dark:text-emerald-200">
            {datos.fecha_aprobacion
              ? tr("Aprobada el {fecha}", { fecha: formatoFechaHora(datos.fecha_aprobacion) }) + (datos.aprobadaPor ? ` · ${datos.aprobadaPor}` : "")
              : tr("Matrícula activa.")}
          </p>
        ) : (
          <p className="mb-5 rounded-2xl border border-border bg-surface-alt p-4 font-body text-sm text-text-soft">
            {tr("La matrícula está inactiva. Actívala con el interruptor de la lista para retomar el proceso.")}
          </p>
        )}

        <dl className="mb-6 grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {resumen.map(([etiqueta, valor]) => (
            <div key={etiqueta} className="min-w-0">
              <dt className="font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">{tr(etiqueta)}</dt>
              <dd className="mt-0.5 break-words font-body text-sm text-text">{valor}</dd>
            </div>
          ))}
        </dl>

        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{tr("Requisitos")}</h3>
          {detalle && <ProgresoRequisitos cumplidos={cumplidos} total={datos.requisitos.length} compacto />}
        </div>
        {detalle ? (
          <RequisitosLista requisitos={datos.requisitos} bloqueo={bloqueo} marcando={marcando} onMarcar={marcar} />
        ) : !error ? (
          <div className="flex flex-col gap-2.5" aria-label={tr("Cargando requisitos")}>
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="esqueleto h-16 rounded-2xl" />)}
          </div>
        ) : null}
      </Dialogo>

      <ConfirmDialog
        open={confirmar}
        title={tr("Aprobar matrícula")}
        message={tr("La matrícula de {nombre} en {grupo} quedará activa. Ya cumple todos los requisitos.", { nombre: datos.estudiante, grupo: datos.grupo })}
        confirmLabel={tr("Aprobar")}
        blockedMessage={errorAprobar}
        loading={aprobando}
        onConfirm={aprobar}
        onClose={() => setConfirmar(false)}
      />
    </>
  )
}
