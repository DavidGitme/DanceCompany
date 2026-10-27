import { AdminCrudScreen } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import { estudianteMock, grupoMock, nombreEstudiante, sedeMock } from "@/modulos/pagos"
import { useAdministration } from "@/modulos/pagos"
import StatusBadge from "@/compartido/ui/StatusBadge"

const config: ModuleConfig = {
  id: "adm-matriculas", title: "Matrículas", addLabel: "Nueva matrícula", icon: null, data: [],
  columns: [
    { key: "idEstudiante", label: "Estudiante", render: (v) => nombreEstudiante(Number(v)) },
    { key: "idGrupo", label: "Grupo", render: (v) => grupoMock.find((g) => g.idGrupo === Number(v))?.nombre ?? "—" },
    { key: "idGrupo", label: "Sede", render: (v) => sedeMock.find((s) => s.idSede === grupoMock.find((g) => g.idGrupo === Number(v))?.idSede)?.nombre ?? "—" },
    { key: "fecha_matricula", label: "Fecha" }, { key: "valor_matricula", label: "Valor", render: (v) => `$${Number(v).toLocaleString("es-CO")}` },
    { key: "idEstado", label: "Estado", render: (v) => <StatusBadge status={Number(v) === 6 ? "Activa" : "Cancelada"} /> },
  ],
  fields: [
    { key: "idEstudiante", label: "Estudiante", type: "select", required: true, span: "full", options: [1, 2, 3].map((id) => ({ label: nombreEstudiante(id), value: String(id) })) },
    { key: "idGrupo", label: "Grupo", type: "select", required: true, options: grupoMock.map((g) => ({ label: g.nombre, value: String(g.idGrupo) })) },
    { key: "fecha_matricula", label: "Fecha matrícula", type: "date", required: true },
    { key: "valor_matricula", label: "Valor matrícula", type: "number", required: true },
    { key: "idEstado", label: "Estado", type: "select", readOnly: true, options: [{ label: "Activa", value: "6" }, { label: "Cancelada", value: "7" }] },
  ],
  filters: [
    { key: "idEstado", label: "Estado", options: [{ label: "Activa", value: "6" }, { label: "Cancelada", value: "7" }] },
    { key: "idGrupo", label: "Grupo", options: grupoMock.map((g) => ({ label: g.nombre, value: String(g.idGrupo) })) },
    { key: "sede", label: "Sede", getValue: (r) => grupoMock.find((g) => g.idGrupo === Number(r.idGrupo))?.idSede ?? "", options: sedeMock.map((s) => ({ label: s.nombre, value: String(s.idSede) })) },
    { key: "idEstudiante", label: "Estudiante", options: estudianteMock.map((e) => ({ label: nombreEstudiante(e.idEstudiante), value: String(e.idEstudiante) })) },
  ],
  actionLabel: "Cancelar matrícula",
  emptyMessage: "No hay matrículas registradas",
  detailTitle: (r) => nombreEstudiante(Number(r.idEstudiante)), detailSubtitle: () => "Matrícula",
}
export default function MatriculasScreen() {
  const { data } = useAdministration()
  const approved = (id: number) => data.postulaciones.find((p) => p.idEstudiante === id && p.idEstado === 14)
  return <AdminCrudScreen table="matriculas" idKey="idMatricula" config={config}
    onStatusAction={(row) => ({ ...row, idEstado: 7 })}
    actionMessage={(row) => {
      const pendientes = data.mensualidades.filter((m) => m.idMatricula === row.idMatricula && m.idEstado !== 4).length
      return `¿Deseas cancelar esta matrícula?${pendientes ? ` Tiene ${pendientes} mensualidad(es) pendiente(s).` : ""} El historial se conservará.`
    }}
    initialCreate={{ fecha_matricula: new Date().toISOString().slice(0, 10), idEstado: 6 }}
    beforeSave={(f) => {
      // GAP: no existe FK formal matricula↔convocatoria_estudiante; el cruce temporal se hace por idEstudiante.
      const post = approved(Number(f.idEstudiante))
      return { ...f, idEstudiante: Number(f.idEstudiante), idGrupo: Number(f.idGrupo), valor_matricula: post ? 0 : Number(f.valor_matricula), idEstado: Number(f.idEstado) }
    }}
    extraForm={(form) => {
      const post = approved(Number(form.idEstudiante))
      const convocatoria = data.convocatorias.find((c) => c.idConvocatoria === post?.idConvocatoria)
      const student = estudianteMock.find((e) => e.idEstudiante === Number(form.idEstudiante))
      const group = grupoMock.find((g) => g.idGrupo === Number(form.idGrupo))
      const capacity = data.aulas.find((a) => a.idAula === group?.idAula)?.capacidad ?? 0
      const used = data.matriculas.filter((m) => m.idGrupo === group?.idGrupo && m.idEstado === 6).length
      return <div className="space-y-2">
        {student && <p className="font-body text-sm text-text-muted">Sede del estudiante: {sedeMock.find((s) => s.idSede === student.idSede)?.nombre}</p>}
        {group && <p className="font-body text-sm text-text-muted">Cupo disponible: {Math.max(0, capacity - used)} de {capacity}</p>}
        {post && <div className="rounded-xl border border-purple-400/30 bg-purple-400/10 p-3 font-body text-sm text-text-soft">Beneficio de convocatoria: {convocatoria?.nombre} — {post.beneficio}. El valor se guardará en $0.</div>}
      </div>
    }}
    validate={(f, rows, editing) => {
      const errors: Record<string, string> = {}
      const student = estudianteMock.find((e) => e.idEstudiante === Number(f.idEstudiante))
      const group = grupoMock.find((g) => g.idGrupo === Number(f.idGrupo))
      if (student && group && student.idSede !== group.idSede) errors.idGrupo = "La sede del grupo no coincide con la del estudiante"
      if (rows.some((r) => r.idMatricula !== editing?.idMatricula && r.idEstudiante === Number(f.idEstudiante) && r.idGrupo === Number(f.idGrupo) && r.idEstado === 6)) errors.idGrupo = "El estudiante ya tiene una matrícula activa en este grupo"
      const capacity = data.aulas.find((a) => a.idAula === group?.idAula)?.capacidad ?? 0
      if (rows.filter((r) => r.idGrupo === Number(f.idGrupo) && r.idEstado === 6).length >= capacity) errors.idGrupo = "El grupo no tiene cupo disponible"
      return errors
    }}
    extraDetail={(r) => <div><p className="font-condensed uppercase tracking-wider text-purple-400">Historial del estudiante</p>{data.matriculas.filter((m) => m.idEstudiante === r.idEstudiante).map((m) => <p key={m.idMatricula} className="mt-2 text-sm text-text-soft">{grupoMock.find((g) => g.idGrupo === m.idGrupo)?.nombre} · <StatusBadge status={m.idEstado === 6 ? "Activa" : "Cancelada"} /></p>)}</div>}
  />
}
