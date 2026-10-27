import { AdminCrudScreen } from "@/modulos/pagos"
import { estiloMock, grupoMock, instructorMock, nivelMock, sedeMock } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import { useAdministration } from "@/modulos/pagos"
import { useState } from "react"
import StatusBadge from "@/compartido/ui/StatusBadge"

const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]
const grupoLabel = (id: number) => {
  const g = grupoMock.find((x) => x.idGrupo === Number(id))
  const sede = sedeMock.find((s) => s.idSede === g?.idSede)?.nombre
  const instructor = instructorMock.find((i) => i.idInstructor === g?.idInstructor)?.nombre
  return g ? `${g.nombre} · ${instructor} (${sede} / Aula ${g.idAula})` : "—"
}
const config: ModuleConfig = {
  id: "adm-agendamientos-instructores", title: "Horarios de grupo", addLabel: "Nuevo horario", icon: null, data: [],
  columns: [
    { key: "idGrupo", label: "Instructor", render: (v) => instructorMock.find((i) => i.idInstructor === grupoMock.find((g) => g.idGrupo === Number(v))?.idInstructor)?.nombre ?? "—" },
    { key: "idGrupo", label: "Grupo", render: (v) => grupoMock.find((g) => g.idGrupo === Number(v))?.nombre ?? "—" },
    { key: "idGrupo", label: "Nivel", render: (v) => nivelMock.find((n) => n.idNivel === grupoMock.find((g) => g.idGrupo === Number(v))?.idNivel)?.nombre ?? "—" },
    { key: "idGrupo", label: "Estilo", render: (v) => estiloMock.find((e) => e.idEstilo === grupoMock.find((g) => g.idGrupo === Number(v))?.idEstilo)?.nombre ?? "—" },
    { key: "idGrupo", label: "Sede / aula", render: (v) => { const g = grupoMock.find((x) => x.idGrupo === Number(v)); return `${sedeMock.find((s) => s.idSede === g?.idSede)?.nombre ?? "—"} · Aula ${g?.idAula ?? "—"}` } },
    { key: "dia_semana", label: "Día" },
    { key: "hora_inicio", label: "Inicio" }, { key: "hora_fin", label: "Fin" },
    { key: "cancelado", label: "Estado", render: (v) => <StatusBadge status={v ? "Cancelada" : "Activo"} /> },
  ],
  filters: [
    { key: "idGrupo", label: "Grupo", options: grupoMock.map((g) => ({ label: g.nombre, value: String(g.idGrupo) })) },
    { key: "instructor", label: "Instructor", getValue: (r) => grupoMock.find((g) => g.idGrupo === Number(r.idGrupo))?.idInstructor ?? "", options: instructorMock.map((i) => ({ label: i.nombre, value: String(i.idInstructor) })) },
    { key: "sede", label: "Sede", getValue: (r) => grupoMock.find((g) => g.idGrupo === Number(r.idGrupo))?.idSede ?? "", options: sedeMock.map((s) => ({ label: s.nombre, value: String(s.idSede) })) },
    { key: "aula", label: "Aula", getValue: (r) => grupoMock.find((g) => g.idGrupo === Number(r.idGrupo))?.idAula ?? "", options: [1, 2, 3].map((id) => ({ label: `Aula ${id}`, value: String(id) })) },
    { key: "dia_semana", label: "Día", options: dias.map((d) => ({ label: d, value: d })) },
  ],
  emptyMessage: "No hay horarios de grupo registrados",
  actionLabel: "Cancelar",
  fields: [
    { key: "idGrupo", label: "Grupo", type: "select", required: true, span: "full", options: grupoMock.map((g) => ({ label: grupoLabel(g.idGrupo), value: String(g.idGrupo) })) },
    { key: "dia_semana", label: "Día de la semana", type: "select", required: true, options: dias.map((d) => ({ label: d, value: d })) },
    { key: "hora_inicio", label: "Hora inicio", type: "time", required: true }, { key: "hora_fin", label: "Hora fin", type: "time", required: true },
  ],
  detailTitle: (r) => `${r.dia_semana} · ${r.hora_inicio}–${r.hora_fin}`, detailSubtitle: (r) => grupoLabel(r.idGrupo),
}

export default function AgendamientosInstructoresScreen() {
  const { data } = useAdministration()
  const [view, setView] = useState<"lista" | "semana">("lista")
  const [instructor, setInstructor] = useState("")
  return <AdminCrudScreen table="agendamientosInstructores" idKey="idAgendamiento" config={config}
    transformRows={(rows) => instructor ? rows.filter((row) => grupoMock.find((g) => g.idGrupo === Number(row.idGrupo))?.idInstructor === Number(instructor)) : rows}
    childrenBefore={<div className="mb-4 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-full border border-border bg-surface p-1">
          {(["lista", "semana"] as const).map((option) => <button key={option} type="button" onClick={() => setView(option)} className={`rounded-full px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wider ${view === option ? "bg-purple-700 text-white" : "text-text-muted"}`}>{option}</button>)}
        </div>
        <label className="flex items-center gap-2 font-condensed text-xs uppercase tracking-wider text-text-muted">Ver agenda de:
          <select value={instructor} onChange={(event) => setInstructor(event.target.value)} className="rounded-xl border border-border bg-surface px-3 py-2 text-text">
            <option value="">Todos</option>
            {instructorMock.map((item) => <option key={item.idInstructor} value={item.idInstructor}>{item.nombre}</option>)}
          </select>
        </label>
      </div>
      {view === "semana" && <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-4 md:grid-cols-7">
        {dias.map((dia) => <div key={dia} className="min-h-28 rounded-xl bg-surface-alt p-2">
          <p className="mb-2 font-condensed text-xs font-semibold uppercase tracking-wider text-purple-400">{dia}</p>
          {data.agendamientosInstructores.filter((row) => row.dia_semana === dia && (!instructor || grupoMock.find((g) => g.idGrupo === row.idGrupo)?.idInstructor === Number(instructor))).map((row) => <div key={row.idAgendamiento} className="mb-2 rounded-lg border border-purple-400/30 bg-purple-400/10 p-2 text-xs text-text-soft">{grupoMock.find((g) => g.idGrupo === row.idGrupo)?.nombre}<br />{row.hora_inicio}–{row.hora_fin}</div>)}
        </div>)}
      </div>}
    </div>}
    onStatusAction={(row) => ({ ...row, cancelado: true })}
    actionMessage={() => "¿Deseas cancelar este horario? Se conservará como registro histórico."}
    deleteLabel={(row) => `${grupoMock.find((g) => g.idGrupo === Number(row.idGrupo))?.nombre ?? "Agendamiento"} · ${row.dia_semana} ${row.hora_inicio}–${row.hora_fin}`}
    beforeSave={(f) => ({ ...f, idGrupo: Number(f.idGrupo) })}
    validate={(f, rows, editing) => {
      const errors: Record<string, string> = {}
      if (f.hora_fin <= f.hora_inicio) errors.hora_fin = "La hora final debe ser posterior a la hora inicial"
      const group = grupoMock.find((g) => g.idGrupo === Number(f.idGrupo))
      const aula = data.aulas.find((a) => a.idAula === group?.idAula)
      const instructor = instructorMock.find((i) => i.idInstructor === group?.idInstructor)
      const nivel = nivelMock.find((n) => n.idNivel === group?.idNivel)
      const estilo = estiloMock.find((e) => e.idEstilo === group?.idEstilo)
      const sede = sedeMock.find((s) => s.idSede === group?.idSede)
      if (!group || group.idEstado !== 1) errors.idGrupo = "El grupo seleccionado no existe o no está activo"
      else if (!aula || aula.idSede !== group.idSede) errors.idGrupo = "El aula del grupo no pertenece a la sede correspondiente"
      else if (aula.idEstado !== 1 || instructor?.idEstado !== 1 || nivel?.idEstado !== 1 || estilo?.idEstado !== 1 || sede?.idEstado !== 1) errors.idGrupo = "Todos los registros relacionados deben estar activos"
      else if (!instructor.sedes.includes(group.idSede)) errors.idGrupo = "El instructor no está habilitado en la sede del grupo"
      const conflicts = rows.filter((item) => item.idAgendamiento !== editing?.idAgendamiento && item.dia_semana === f.dia_semana && f.hora_inicio < item.hora_fin && f.hora_fin > item.hora_inicio)
      if (conflicts.some((item) => Number(item.idGrupo) === Number(f.idGrupo))) errors.hora_inicio = "El grupo ya tiene otro agendamiento en esta franja"
      else if (conflicts.some((item) => grupoMock.find((g) => g.idGrupo === Number(item.idGrupo))?.idAula === group?.idAula)) errors.hora_inicio = "El aula ya está ocupada en esta franja"
      else if (conflicts.some((item) => grupoMock.find((g) => g.idGrupo === Number(item.idGrupo))?.idInstructor === group?.idInstructor)) errors.hora_inicio = "El instructor ya tiene otro agendamiento en esta franja"
      return errors
    }}
    extraForm={(form) => {
      const g = grupoMock.find((x) => x.idGrupo === Number(form.idGrupo))
      return g ? <div className="rounded-xl border border-border bg-surface-alt p-3 font-body text-sm text-text-muted">
        <p>Instructor: {instructorMock.find((i) => i.idInstructor === g.idInstructor)?.nombre}</p>
        <p>Grupo: {g.nombre} · Nivel: {nivelMock.find((n) => n.idNivel === g.idNivel)?.nombre} · Estilo: {estiloMock.find((e) => e.idEstilo === g.idEstilo)?.nombre}</p>
        <p>Aula: Aula {g.idAula} · Sede: {sedeMock.find((s) => s.idSede === g.idSede)?.nombre}</p>
      </div> : null
    }}
  />
}
