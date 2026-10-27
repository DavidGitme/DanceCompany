import { AdminCrudScreen } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import { grupoMock, nombreEstudiante, sedeMock } from "../datos/administracion"
import { useAdministration } from "../datos/ContextoAdministracion"
import StatusBadge from "@/compartido/ui/StatusBadge"
import { useState } from "react"
export default function MensualidadesScreen() {
  const { data, setTable } = useAdministration()
  const [generatorOpen, setGeneratorOpen] = useState(false)
  const [period, setPeriod] = useState(new Date().toISOString().slice(0, 7))
  const [deadline, setDeadline] = useState(`${new Date().toISOString().slice(0, 7)}-15`)
  const status = (row: any) => row.idEstado === 4 ? "Pagada" : new Date(`${row.fecha_limite}T23:59`) < new Date() ? "Vencida" : "Pendiente"
  const config: ModuleConfig = {
    id: "adm-mensualidades", title: "Mensualidades", addLabel: "Nueva mensualidad", icon: null, data: [],
    columns: [
      { key: "idMatricula", label: "Estudiante", render: (v) => nombreEstudiante(data.matriculas.find((m) => m.idMatricula === Number(v))?.idEstudiante) },
      { key: "idMatricula", label: "Grupo", render: (v) => grupoMock.find((g) => g.idGrupo === data.matriculas.find((m) => m.idMatricula === Number(v))?.idGrupo)?.nombre ?? "—" },
      { key: "periodo", label: "Periodo", render: (v) => new Date(`${v}-02T12:00`).toLocaleDateString("es-CO", { month: "long", year: "numeric" }) },
      { key: "valor_pagar", label: "Valor", render: (v) => `$${Number(v).toLocaleString("es-CO")}` }, { key: "fecha_limite", label: "Fecha límite" }, { key: "fecha_pago", label: "Fecha de pago" },
      { key: "idEstado", label: "Estado", render: (_, r) => <div><StatusBadge status={status(r)} />{status(r) === "Vencida" && <p className="mt-1 text-xs text-red-400">{Math.max(1, Math.floor((Date.now() - new Date(r.fecha_limite).getTime()) / 86400000))} días de atraso</p>}</div> },
    ],
    fields: [
      { key: "idMatricula", label: "Matrícula / estudiante", type: "select", required: true, span: "full", options: data.matriculas.map((m) => ({ label: nombreEstudiante(m.idEstudiante), value: String(m.idMatricula) })) },
      { key: "periodo", label: "Periodo", type: "text", required: true, placeholder: "AAAA-MM" },
      { key: "fecha_pago", label: "Fecha pago (se completa desde Pagos)", type: "date", readOnly: true },
      { key: "valor_pagar", label: "Valor a pagar", type: "number", required: true }, { key: "fecha_limite", label: "Fecha límite", type: "date", required: true },
      { key: "idEstado", label: "Estado", type: "select", readOnly: true, options: [{ label: "Pendiente", value: "5" }, { label: "Pagada", value: "4" }] },
    ],
    filters: [
      { key: "estado", label: "Estado", getValue: status, options: ["Pendiente", "Pagada", "Vencida"].map((x) => ({ label: x, value: x })) },
      { key: "periodo", label: "Periodo", options: [...new Set(data.mensualidades.map((m) => m.periodo))].map((x) => ({ label: x, value: x })) },
      { key: "grupo", label: "Grupo", getValue: (r) => data.matriculas.find((m) => m.idMatricula === r.idMatricula)?.idGrupo ?? "", options: grupoMock.map((g) => ({ label: g.nombre, value: String(g.idGrupo) })) },
      { key: "sede", label: "Sede", getValue: (r) => grupoMock.find((g) => g.idGrupo === data.matriculas.find((m) => m.idMatricula === r.idMatricula)?.idGrupo)?.idSede ?? "", options: sedeMock.map((s) => ({ label: s.nombre, value: String(s.idSede) })) },
    ],
    hideStatusAction: true,
    emptyMessage: "No hay mensualidades registradas",
    detailTitle: (r) => nombreEstudiante(data.matriculas.find((m) => m.idMatricula === Number(r.idMatricula))?.idEstudiante), detailSubtitle: () => "Mensualidad",
  }
  return <AdminCrudScreen table="mensualidades" idKey="idMensualidad" config={config}
    initialCreate={{ idEstado: 5, periodo: new Date().toISOString().slice(0, 7), fecha_limite: `${new Date().toISOString().slice(0, 7)}-15` }}
    childrenBefore={<div className="mb-4">
      <button type="button" onClick={() => setGeneratorOpen((v) => !v)} className="rounded-full bg-purple-700 px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-white">Generar mensualidades del mes</button>
      {generatorOpen && <div className="mt-3 grid gap-3 rounded-2xl border border-border bg-surface p-4 md:grid-cols-3">
        <label className="text-xs uppercase text-text-muted">Periodo<input type="month" value={period} onChange={(e) => { setPeriod(e.target.value); setDeadline(`${e.target.value}-15`) }} className="mt-1 w-full rounded-xl border border-border bg-surface-alt p-2 text-text" /></label>
        <label className="text-xs uppercase text-text-muted">Fecha límite<input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="mt-1 w-full rounded-xl border border-border bg-surface-alt p-2 text-text" /></label>
        <div><p className="text-sm text-text-soft">Se generarán {data.matriculas.filter((m) => m.idEstado === 6 && !data.mensualidades.some((x) => x.idMatricula === m.idMatricula && x.periodo === period)).length} mensualidades. {data.mensualidades.filter((x) => x.periodo === period).length} ya existen y se omitirán.</p><button type="button" onClick={() => { setTable("mensualidades", (rows) => [...rows, ...data.matriculas.filter((m) => m.idEstado === 6 && !rows.some((x) => x.idMatricula === m.idMatricula && x.periodo === period)).map((m, index) => ({ idMensualidad: Math.max(0, ...rows.map((x) => x.idMensualidad)) + index + 1, idMatricula: m.idMatricula, periodo: period, valor_pagar: 110000, fecha_limite: deadline, fecha_pago: null, idEstado: 5 }))]); setGeneratorOpen(false) }} className="mt-2 text-sm font-semibold text-purple-400">Generar</button></div>
      </div>}
    </div>}
    validate={(f, rows, editing) => rows.some((r) => r.idMensualidad !== editing?.idMensualidad && r.idMatricula === Number(f.idMatricula) && r.periodo === f.periodo) ? { periodo: "Ya existe una mensualidad de este estudiante para ese periodo" } : {}}
    beforeSave={(f) => {
      const matricula = data.matriculas.find((m) => m.idMatricula === Number(f.idMatricula))
      const base = matricula?.fecha_matricula ? new Date(`${matricula.fecha_matricula}T12:00`) : new Date()
      const fecha_limite = `${base.getFullYear()}-${String(base.getMonth() + 1).padStart(2, "0")}-15`
      return { ...f, idMatricula: Number(f.idMatricula), valor_pagar: Number(f.valor_pagar), fecha_limite: f.fecha_limite || fecha_limite, fecha_pago: f.fecha_pago || null, idEstado: Number(f.idEstado) }
    }}
    extraDetail={(r) => <p className="font-body text-sm text-text-muted">Para registrar el pago, abre Pagos y selecciona la mensualidad #{r.idMensualidad}.</p>}
  />
}
