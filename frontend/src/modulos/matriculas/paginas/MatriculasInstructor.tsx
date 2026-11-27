import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useState } from "react"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import { mensajeError } from "@/compartido/api/recursos"
import type { MatriculaDetalleDto, RequisitoMatriculaDto } from "../dtos/matriculaDto"
import { matriculaInstructorServicio } from "../servicios/matriculaServicio"
import { ProgresoRequisitos, RequisitosLista } from "../componentes/RequisitosLista"

/*
 * Portal del instructor: matrículas pendientes de sus grupos. El instructor marca el
 * examen de nivel (su visto bueno) y, cuando la sede completó los demás requisitos,
 * puede aprobar la matrícula.
 */

const superficie = "rounded-2xl border border-border bg-surface shadow-lg shadow-black/5"

export default function MatriculasInstructor() {
  const [matriculas, setMatriculas] = useState<MatriculaDetalleDto[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [marcando, setMarcando] = useState<{ matricula: number; requisito: number } | null>(null)
  const [aprobar, setAprobar] = useState<MatriculaDetalleDto | null>(null)
  const [aprobando, setAprobando] = useState(false)
  const [errorAprobar, setErrorAprobar] = useState<string | undefined>()

  const cargar = useCallback(() => {
    setError(null)
    matriculaInstructorServicio
      .pendientes()
      .then(setMatriculas)
      .catch((e) => {
        setMatriculas([])
        setError(mensajeError(e))
      })
  }, [])

  useEffect(() => {
    cargar()
  }, [cargar])

  useEffect(() => {
    if (!aviso) return
    const espera = window.setTimeout(() => setAviso(null), 4500)
    return () => window.clearTimeout(espera)
  }, [aviso])

  const reemplazar = (nueva: MatriculaDetalleDto) =>
    setMatriculas((prev) => (prev ?? []).map((m) => (m.idMatricula === nueva.idMatricula ? nueva : m)))

  const marcar = async (m: MatriculaDetalleDto, r: RequisitoMatriculaDto, cumplido: boolean) => {
    setMarcando({ matricula: m.idMatricula, requisito: r.idRequisito })
    setError(null)
    try {
      reemplazar(await matriculaInstructorServicio.marcarRequisito(m.idMatricula, r.idRequisito, cumplido))
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setMarcando(null)
    }
  }

  const confirmarAprobacion = async () => {
    if (!aprobar) return
    setAprobando(true)
    setErrorAprobar(undefined)
    try {
      await matriculaInstructorServicio.aprobar(aprobar.idMatricula)
      setMatriculas((prev) => (prev ?? []).filter((m) => m.idMatricula !== aprobar.idMatricula))
      setAviso(tr("La matrícula de {nombre} quedó aprobada y activa.", { nombre: aprobar.estudiante }))
      setAprobar(null)
    } catch (e) {
      setErrorAprobar(mensajeError(e))
    } finally {
      setAprobando(false)
    }
  }

  return (
    <div className="space-y-6">
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-24 z-[70] flex justify-end sm:inset-x-auto sm:right-6">
        {aviso && (
          <p role="status" className="pointer-events-auto rounded-2xl border border-emerald-500/30 bg-surface px-5 py-4 text-sm font-semibold text-emerald-700 shadow-2xl dark:text-emerald-300 animar-entrada">
            {aviso}
          </p>
        )}
      </div>

      <div>
        <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-purple-400">{tr("Matrículas")}</p>
        <h1 className="mt-1 font-display text-3xl uppercase text-text sm:text-4xl">{tr("Por aprobar")}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
          {tr("Estudiantes que se están matriculando en tus grupos. Marca el examen de nivel cuando hagas la clase de valoración; con todos los requisitos cumplidos puedes aprobar la matrícula.")}
        </p>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-600 dark:text-red-300">
          {error}
        </p>
      )}

      {matriculas === null ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="esqueleto h-64 rounded-2xl" />)}
        </div>
      ) : matriculas.length === 0 ? (
        <div className={`${superficie} flex flex-col items-center gap-2 px-6 py-14 text-center`}>
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-500">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </span>
          <h2 className="font-display text-xl uppercase text-text">{tr("Todo al día")}</h2>
          <p className="max-w-md text-sm text-text-muted">{tr("No tienes matrículas pendientes de aprobación en tus grupos.")}</p>
        </div>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {matriculas.map((m) => {
            const faltan = m.requisitos.filter((r) => !r.cumplido)
            const cumplidos = m.requisitos.length - faltan.length
            const ocupada = marcando?.matricula === m.idMatricula
            return (
              <li key={m.idMatricula} className={`${superficie} flex flex-col gap-4 p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-body text-base font-semibold text-text">{m.estudiante}</p>
                    <p className="text-xs text-text-muted">
                      {m.grupo} · {m.nivel} · {m.estilo}
                    </p>
                    <p className="text-xs text-text-muted">
                      {tr("Matriculado el {fecha}", {
                        fecha: new Date(`${m.fecha_matricula}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }),
                      })}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-amber-500">
                    {tr("Pendiente")}
                  </span>
                </div>
                <ProgresoRequisitos cumplidos={cumplidos} total={m.requisitos.length} />
                <RequisitosLista
                  requisitos={m.requisitos}
                  bloqueo={(r) => (r.responsable === "instructor" ? undefined : "Lo revisa la administración de la sede.")}
                  marcando={ocupada ? marcando!.requisito : marcando ? -1 : null}
                  onMarcar={(r, cumplido) => marcar(m, r, cumplido)}
                />
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-xs text-text-muted">
                    {faltan.length
                      ? tr("Falta: {lista}", { lista: faltan.map((r) => tr(r.nombre)).join(", ") })
                      : tr("Cumple todos los requisitos.")}
                  </p>
                  <button
                    type="button"
                    disabled={faltan.length > 0 || marcando !== null}
                    onClick={() => {
                      setErrorAprobar(undefined)
                      setAprobar(m)
                    }}
                    className="inline-flex items-center gap-2 rounded-full bg-purple-700 px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-white shadow-lg shadow-purple-700/20 transition-all hover:-translate-y-0.5 hover:bg-purple-600 disabled:pointer-events-none disabled:opacity-40"
                  >
                    {tr("Aprobar matrícula")}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(aprobar)}
        title={tr("Aprobar matrícula")}
        message={aprobar ? tr("La matrícula de {nombre} en {grupo} quedará activa. Ya cumple todos los requisitos.", { nombre: aprobar.estudiante, grupo: aprobar.grupo }) : ""}
        confirmLabel={tr("Aprobar")}
        blockedMessage={errorAprobar}
        loading={aprobando}
        onConfirm={confirmarAprobacion}
        onClose={() => setAprobar(null)}
      />
    </div>
  )
}
