import { useState } from "react"
import { AdminCrudScreen } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import { estudianteMock, nombreEstudiante } from "@/modulos/pagos"
import { useAdministration } from "@/modulos/pagos"
import StatusBadge from "@/compartido/ui/StatusBadge"
export default function PostulacionesScreen() {
  const { data, setTable } = useAdministration()
  const [filtro, setFiltro] = useState(10)
  const [notice, setNotice] = useState("")
  const abierta = (c: any) => c.estadoPublicacion === "Publicada" && new Date(`${c.fecha_inicio}T00:00`) <= new Date() && (!c.fecha_fin || new Date(`${c.fecha_fin}T23:59`) >= new Date())
  const config: ModuleConfig = {
    id: "adm-postulaciones", title: "Postulaciones", addLabel: "Nueva postulación", icon: null, data: [],
    columns: [
      { key: "idEstudiante", label: "Estudiante", render: (v) => nombreEstudiante(Number(v)) },
      { key: "idConvocatoria", label: "Convocatoria", render: (v) => data.convocatorias.find((c) => c.idConvocatoria === Number(v))?.nombre ?? "—" },
      { key: "idConvocatoria", label: "Tipo", render: (v) => data.tiposConvocatoria.find((t) => t.idTipoconvo === data.convocatorias.find((c) => c.idConvocatoria === Number(v))?.idTipoconvo)?.nombre ?? "—" },
      { key: "idEstado", label: "Estado", render: (v) => <StatusBadge status={Number(v) === 14 ? "Aprobada" : Number(v) === 11 ? "Rechazado" : "Postulado"} /> },
      { key: "beneficio", label: "Beneficio" },
    ],
    fields: [
      { key: "idConvocatoria", label: "Convocatoria", type: "select", required: true, options: data.convocatorias.filter(abierta).map((c) => ({ label: c.nombre, value: String(c.idConvocatoria) })) },
      { key: "idEstudiante", label: "Estudiante", type: "select", required: true, options: [1, 2, 3].map((id) => ({ label: nombreEstudiante(id), value: String(id) })) },
      { key: "idEstado", label: "Estado", type: "select", readOnly: true, options: [{ label: "Postulado", value: "10" }] },
      { key: "beneficio", label: "Beneficio", type: "text", span: "full" },
    ],
    filters: [
      { key: "idConvocatoria", label: "Convocatoria", options: data.convocatorias.map((c) => ({ label: c.nombre, value: String(c.idConvocatoria) })) },
      { key: "tipo", label: "Tipo de convocatoria", getValue: (r) => data.convocatorias.find((c) => c.idConvocatoria === r.idConvocatoria)?.idTipoconvo ?? "", options: data.tiposConvocatoria.map((t) => ({ label: t.nombre, value: String(t.idTipoconvo) })) },
      { key: "idEstudiante", label: "Estudiante", options: estudianteMock.map((e) => ({ label: nombreEstudiante(e.idEstudiante), value: String(e.idEstudiante) })) },
    ],
    hideStatusAction: true,
    emptyMessage: "No hay postulaciones en este estado",
    detailTitle: (r) => nombreEstudiante(r.idEstudiante), detailSubtitle: () => "Postulación",
  }
  return <AdminCrudScreen table="postulaciones" idKey="idConvocatoriaEst" config={config}
    initialCreate={{ idEstado: 10 }}
    transformRows={(rows) => rows.filter((r) => r.idEstado === filtro)}
    childrenBefore={<><div className="flex flex-wrap gap-2 mb-4">{[{ id: 10, n: "Postuladas" }, { id: 14, n: "Aprobadas" }, { id: 11, n: "Rechazadas" }].map((x) => <button key={x.id} onClick={() => setFiltro(x.id)} className={`rounded-full border px-3 py-1 font-condensed text-xs uppercase tracking-wider ${filtro === x.id ? "bg-purple-700 text-white border-purple-700" : "border-border text-text-muted"}`}>{x.n} ({data.postulaciones.filter((p) => p.idEstado === x.id).length})</button>)}</div>{notice && <div className="mb-4 rounded-xl border border-purple-400/30 bg-purple-400/10 p-3 font-body text-sm text-text">{notice}</div>}</>}
    validate={(f, rows, editing) => {
      const errors: Record<string, string> = {}
      if (rows.some((r) => r.idConvocatoriaEst !== editing?.idConvocatoriaEst && r.idConvocatoria === Number(f.idConvocatoria) && r.idEstudiante === Number(f.idEstudiante))) errors.idEstudiante = "El estudiante ya está postulado a esta convocatoria"
      if (!abierta(data.convocatorias.find((c) => c.idConvocatoria === Number(f.idConvocatoria)))) errors.idConvocatoria = "Esta convocatoria no está abierta"
      return errors
    }}
    beforeSave={(f) => ({ ...f, idConvocatoria: Number(f.idConvocatoria), idEstudiante: Number(f.idEstudiante), idEstado: Number(f.idEstado), beneficio: f.beneficio ?? "" })}
    afterSave={(saved) => { if (saved.idEstado === 14) setNotice("Ahora puedes crear la matrícula de este estudiante desde el módulo de Matrículas") }}
    extraDetail={(r) => r.idEstado === 10 ? <div className="flex gap-2"><button onClick={() => { setTable("postulaciones", (rows) => rows.map((p) => p.idConvocatoriaEst === r.idConvocatoriaEst ? { ...p, idEstado: 14, beneficio: p.beneficio || "Matrícula gratis" } : p)); setNotice("Ahora puedes crear la matrícula de este estudiante desde el módulo de Matrículas") }} className="rounded-full bg-purple-700 px-3 py-2 font-condensed text-xs uppercase text-white">Aprobar</button><button onClick={() => setTable("postulaciones", (rows) => rows.map((p) => p.idConvocatoriaEst === r.idConvocatoriaEst ? { ...p, idEstado: 11 } : p))} className="rounded-full border border-border px-3 py-2 font-condensed text-xs uppercase text-text-muted">Rechazar</button></div> : null}
  />
}
