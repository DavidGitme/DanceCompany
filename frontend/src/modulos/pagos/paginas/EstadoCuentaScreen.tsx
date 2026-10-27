import { useMemo, useState } from "react"
import StatusBadge from "@/compartido/ui/StatusBadge"
import { estudianteMock, grupoMock, nombreAcudiente, nombreEstudiante, personaEstudiante, sedeMock } from "../datos/administracion"
import { useAdministration } from "../datos/ContextoAdministracion"

const money = (value: number) => `$${value.toLocaleString("es-CO")}`

export default function EstadoCuentaScreen() {
  const { data } = useAdministration()
  const [studentId, setStudentId] = useState("")
  const [guardianId, setGuardianId] = useState("")
  const student = Number(studentId)
  const matriculas = useMemo(() => data.matriculas.filter((item) => item.idEstudiante === student), [data.matriculas, student])
  const mensualidades = data.mensualidades.filter((item) => matriculas.some((matricula) => matricula.idMatricula === item.idMatricula))
  const pagos = data.pagos.filter((item) => item.idEstudiante === student || matriculas.some((matricula) => matricula.idMatricula === item.idMatricula || mensualidades.some((mensualidad) => mensualidad.idMensualidad === item.idMensualidad)))
  const paid = mensualidades.filter((item) => item.idEstado === 4).reduce((sum, item) => sum + item.valor_pagar, 0)
  const overdueRows = mensualidades.filter((item) => item.idEstado !== 4 && new Date(`${item.fecha_limite}T23:59`) < new Date())
  const overdue = overdueRows.reduce((sum, item) => sum + item.valor_pagar, 0)
  const pending = mensualidades.filter((item) => item.idEstado !== 4).reduce((sum, item) => sum + item.valor_pagar, 0) - overdue
  const nextDeadline = mensualidades.filter((item) => item.idEstado !== 4 && new Date(item.fecha_limite) >= new Date()).sort((a, b) => a.fecha_limite.localeCompare(b.fecha_limite))[0]?.fecha_limite
  const activeEnrollment = matriculas.find((item) => item.idEstado === 6)

  return (
    <div className="space-y-6">
      <div>
        <span className="font-condensed text-xs uppercase tracking-widest text-purple-400">Mensualidades y pagos</span>
        <h1 className="mt-1 font-display text-3xl uppercase text-text">Estado de cuenta</h1>
      </div>
      <div className="grid gap-4 rounded-2xl border border-border bg-surface p-5 md:grid-cols-2">
        <label className="flex flex-col gap-1.5"><span className="font-condensed text-xs uppercase tracking-wider text-text-muted">Estudiante</span>
          <select value={studentId} onChange={(event) => setStudentId(event.target.value)} className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-text">
            <option value="">Buscar por nombre o documento...</option>
            {estudianteMock.map((item) => <option key={item.idEstudiante} value={item.idEstudiante}>{nombreEstudiante(item.idEstudiante)} · {personaEstudiante(item.idEstudiante)?.documento}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1.5"><span className="font-condensed text-xs uppercase tracking-wider text-text-muted">Acudiente (opcional)</span>
          <select value={guardianId} onChange={(event) => setGuardianId(event.target.value)} className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-text">
            <option value="">Todos</option>
            {[1, 2].map((id) => <option key={id} value={id}>{nombreAcudiente(id)}</option>)}
          </select>
        </label>
      </div>

      {!studentId ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface py-20 text-center font-body text-sm text-text-muted">Selecciona un estudiante para ver su estado de cuenta</div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            {[["Total pagado", money(paid), "text-emerald-400"], ["Total pendiente", money(pending), "text-amber-400"], ["Total vencido", money(overdue), "text-red-400"], ["Próxima fecha límite", nextDeadline ?? "Sin pendientes", "text-purple-400"]].map(([label, value, tone]) => <div key={label} className="rounded-2xl border border-border bg-surface p-5"><p className="font-condensed text-xs uppercase tracking-wider text-text-muted">{label}</p><p className={`mt-2 font-display text-2xl ${tone}`}>{value}</p></div>)}
          </div>

          <section className="rounded-2xl border border-border bg-surface p-5">
            <h2 className="font-condensed text-sm font-semibold uppercase tracking-wider text-purple-400">Matrícula vigente</h2>
            {activeEnrollment ? <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-text-soft"><span>{grupoMock.find((g) => g.idGrupo === activeEnrollment.idGrupo)?.nombre}</span><span>{sedeMock.find((s) => s.idSede === grupoMock.find((g) => g.idGrupo === activeEnrollment.idGrupo)?.idSede)?.nombre}</span><span>{activeEnrollment.fecha_matricula}</span><span>{money(activeEnrollment.valor_matricula)}</span><StatusBadge status="Activa" /></div> : <p className="mt-3 text-sm text-text-muted">Sin matrícula vigente</p>}
          </section>

          <AccountTable title="Mensualidades" headers={["Periodo", "Valor", "Fecha límite", "Estado", "Fecha de pago"]} rows={mensualidades.map((item) => [item.periodo, money(item.valor_pagar), item.fecha_limite, <StatusBadge status={item.idEstado === 4 ? "Pagada" : new Date(item.fecha_limite) < new Date() ? "Vencida" : "Pendiente"} />, item.fecha_pago ?? "—"])} />
          <AccountTable title="Pagos" headers={["Fecha", "Concepto", "Método", "Monto", "Pagador"]} rows={pagos.filter((item) => !guardianId || item.idAcudiente === Number(guardianId)).map((item) => [item.fecha_pago, item.idMensualidad ? "Mensualidad" : item.idMatricula ? "Matrícula" : "Taller", data.metodos.find((method) => method.idmetodo === item.idMetodo)?.nombre ?? "—", money(item.monto), item.idAcudiente ? nombreAcudiente(item.idAcudiente) : nombreEstudiante(item.idEstudiante)])} />
        </>
      )}
    </div>
  )
}

function AccountTable({ title, headers, rows }: { title: string; headers: string[]; rows: React.ReactNode[][] }) {
  return <section className="overflow-hidden rounded-2xl border border-border bg-surface"><h2 className="border-b border-border px-5 py-4 font-condensed text-sm font-semibold uppercase tracking-wider text-purple-400">{title}</h2><div className="overflow-x-auto"><table className="w-full"><thead><tr>{headers.map((header) => <th key={header} className="px-4 py-3 text-left font-condensed text-xs uppercase tracking-wider text-text-muted">{header}</th>)}</tr></thead><tbody>{rows.length ? rows.map((row, index) => <tr key={index} className="border-t border-border">{row.map((cell, cellIndex) => <td key={cellIndex} className="px-4 py-3 text-sm text-text-soft">{cell}</td>)}</tr>) : <tr><td colSpan={headers.length} className="px-4 py-10 text-center text-sm text-text-muted">No hay registros</td></tr>}</tbody></table></div></section>
}
