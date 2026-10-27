import { AdminCrudScreen } from "@/modulos/pagos"
import { grupoMock, sedeMock } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import { useAdministration } from "@/modulos/pagos"
import StatusBadge from "@/compartido/ui/StatusBadge"

const config: ModuleConfig = {
  id: "aulas",
  title: "Aulas",
  addLabel: "Nueva aula",
  icon: null,
  data: [],
  columns: [
    { key: "nombre", label: "Nombre" },
    { key: "idSede", label: "Sede", render: (v) => sedeMock.find((s) => s.idSede === Number(v))?.nombre ?? "—" },
    { key: "capacidad", label: "Capacidad", render: (v) => `${v} personas` },
    { key: "idEstado", label: "Estado", render: (v) => <StatusBadge status={Number(v) === 1 ? "Activo" : "Inactivo"} /> },
  ],
  fields: [
    { key: "nombre", label: "Nombre", type: "text", required: true, span: "full", placeholder: "Salón Espejos 1" },
    { key: "capacidad", label: "Capacidad", type: "number", required: true },
    { key: "idSede", label: "Sede", type: "select", required: true, options: sedeMock.map((s) => ({ label: s.nombre, value: s.idSede })) },
    { key: "idEstado", label: "Estado", type: "select", required: true, options: [{ label: "Activo", value: "1" }, { label: "Inactivo", value: "2" }] },
  ],
  filters: [
    { key: "idSede", label: "Sede", options: sedeMock.map((s) => ({ label: s.nombre, value: String(s.idSede) })) },
    { key: "idEstado", label: "Estado", options: [{ label: "Activo", value: "1" }, { label: "Inactivo", value: "2" }] },
  ],
  emptyMessage: "No hay aulas registradas",
  actionLabel: "Inactivar",
  detailTitle: (r) => r.nombre,
  detailSubtitle: (r) => sedeMock.find((s) => s.idSede === Number(r.idSede))?.nombre ?? "",
  detailFields: [
    { key: "nombre", label: "Nombre" },
    { key: "idSede", label: "Sede", render: (v) => sedeMock.find((s) => s.idSede === Number(v))?.nombre ?? "—" },
    { key: "capacidad", label: "Capacidad" },
    { key: "idEstado", label: "Estado", render: (v) => <StatusBadge status={Number(v) === 1 ? "Activo" : "Inactivo"} /> },
  ],
}

export default function AulasScreen() {
  const { data } = useAdministration()

  return (
    <AdminCrudScreen
      table="aulas"
      idKey="idAula"
      config={config}
      initialCreate={{ idEstado: 1 }}
      validate={(form, rows, editing) => {
        const errores: Record<string, string> = {}
        if (Number(form.capacidad) <= 0) {
          errores.capacidad = "La capacidad debe ser mayor que 0"
        }
        if (rows.some((a) => a.idAula !== editing?.idAula && a.idSede === Number(form.idSede) && a.nombre.toLowerCase() === String(form.nombre).trim().toLowerCase())) {
          errores.nombre = "Ya existe un aula con este nombre en la sede"
        }
        return errores
      }}
      beforeSave={(form) => ({
        ...form,
        idSede: Number(form.idSede),
        idEstado: Number(form.idEstado),
        capacidad: Number(form.capacidad),
        nombre: String(form.nombre).trim(),
      })}
      extraDetail={(row) => {
        const agendamientos = data.agendamientosInstructores.filter(
          (item) => grupoMock.some((g) => g.idGrupo === item.idGrupo && g.idAula === row.idAula)
        )
        if (agendamientos.length === 0) return null
        return (
          <div>
            <h3 className="font-condensed text-xs uppercase tracking-wider text-purple-400 mb-2">Horarios asignados</h3>
            {agendamientos.map((item) => <p key={item.idAgendamiento} className="text-sm text-text-soft">{grupoMock.find((g) => g.idGrupo === item.idGrupo)?.nombre} · {item.dia_semana} · {item.hora_inicio}–{item.hora_fin}</p>)}
          </div>
        )
      }}
      deleteLabel={(row) => {
        const sede = sedeMock.find((s) => s.idSede === Number(row.idSede))?.nombre || "Sin sede"
        return `${row.nombre} — ${sede}`
      }}
      onStatusAction={(row) => ({ ...row, idEstado: 2 })}
      actionMessage={(row) => `¿Deseas inactivar “${row.nombre}”? El registro seguirá visible en la tabla.`}
      blockedMessage={(row) => {
        const count = data.agendamientosInstructores.filter((item) => grupoMock.some((g) => g.idGrupo === item.idGrupo && g.idAula === row.idAula)).length
        return count ? `Esta aula tiene ${count} horarios activos. Reasígnalos antes de inactivarla.` : undefined
      }}
    />
  )
}
