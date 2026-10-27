import { AdminCrudScreen } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import { nombreEstudiante } from "@/modulos/pagos"
import { useAdministration } from "@/modulos/pagos"
import StatusBadge from "@/compartido/ui/StatusBadge"
export default function ConvocatoriasScreen() {
  const { data } = useAdministration()
  const estado = (r: any) => r.estadoPublicacion === "Borrador" || r.estadoPublicacion === "Cancelada" ? r.estadoPublicacion : new Date(`${r.fecha_fin}T23:59`) < new Date() ? "Cerrada" : new Date(`${r.fecha_inicio}T00:00`) <= new Date() ? "Abierta" : "Borrador"
  const config: ModuleConfig = {
    id: "adm-convocatorias", title: "Convocatorias", addLabel: "Nueva convocatoria", icon: null, data: [],
    columns: [
      { key: "nombre", label: "Nombre" }, { key: "idTipoconvo", label: "Tipo", render: (v) => data.tiposConvocatoria.find((t) => t.idTipoconvo === Number(v))?.nombre ?? "—" },
      { key: "fecha_inicio", label: "Inicio" }, { key: "fecha_fin", label: "Fin" },
      { key: "estadoPublicacion", label: "Estado", render: (_, r) => <StatusBadge status={estado(r)} /> },
      { key: "idConvocatoria", label: "Postulaciones", render: (v) => data.postulaciones.filter((p) => p.idConvocatoria === Number(v)).length },
    ],
    fields: [
      { key: "idTipoconvo", label: "Tipo", type: "select", required: true, span: "full", options: data.tiposConvocatoria.map((t) => ({ label: t.nombre, value: String(t.idTipoconvo) })) },
      { key: "nombre", label: "Nombre", type: "text", required: true, span: "full" }, { key: "fecha_inicio", label: "Fecha inicio", type: "date", required: true },
      { key: "fecha_fin", label: "Fecha fin", type: "date" }, { key: "descripcion", label: "Descripción", type: "textarea", required: true, span: "full" },
      { key: "estadoPublicacion", label: "Estado de publicación", type: "select", required: true, options: ["Borrador", "Publicada", "Cancelada"].map((x) => ({ label: x, value: x })) },
    ],
    filters: [
      { key: "idTipoconvo", label: "Tipo", options: data.tiposConvocatoria.map((t) => ({ label: t.nombre, value: String(t.idTipoconvo) })) },
      { key: "estado", label: "Estado", getValue: estado, options: ["Abierta", "Cerrada", "Borrador", "Cancelada"].map((x) => ({ label: x, value: x })) },
    ],
    actionLabel: "Cancelar convocatoria",
    emptyMessage: "No hay convocatorias registradas",
    detailTitle: (r) => r.nombre, detailSubtitle: () => "Convocatoria",
  }
  return <AdminCrudScreen table="convocatorias" idKey="idConvocatoria" config={config}
    initialCreate={{ estadoPublicacion: "Borrador" }}
    onStatusAction={(row) => ({ ...row, estadoPublicacion: "Cancelada" })}
    actionMessage={(row) => `¿Deseas cancelar “${row.nombre}”? La convocatoria y sus postulaciones se conservarán.`}
    validate={(f) => f.fecha_fin && f.fecha_fin <= f.fecha_inicio ? { fecha_fin: "La fecha final debe ser posterior a la fecha inicial" } : {}}
    beforeSave={(f) => ({ ...f, idTipoconvo: Number(f.idTipoconvo), fecha_fin: f.fecha_fin || null })}
    extraDetail={(r) => {
      const posts = data.postulaciones.filter((p) => p.idConvocatoria === r.idConvocatoria)
      return <div className="font-body text-sm text-text-soft"><p className="font-condensed uppercase tracking-wider text-text-muted mb-2">Postulaciones</p>{posts.length ? posts.map((p) => <div key={p.idConvocatoriaEst} className="flex justify-between gap-3 py-1"><span>{nombreEstudiante(p.idEstudiante)}</span><StatusBadge status={p.idEstado === 14 ? "Aprobada" : p.idEstado === 11 ? "Rechazado" : "Postulado"} /></div>) : <p>Sin postulaciones</p>}</div>
    }}
  />
}
