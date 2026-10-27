import { AdminCrudScreen } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import StatusBadge from "@/compartido/ui/StatusBadge"
import { useAdministration } from "@/modulos/pagos"
export default function ContenidosScreen() {
  const { data } = useAdministration()
  const config: ModuleConfig = {
    id: "adm-contenidos", title: "Noticias", addLabel: "Nueva noticia", icon: null, data: [],
    columns: [
      { key: "titulo", label: "Título" }, { key: "idtipocontenido", label: "Tipo", render: (v) => data.tiposContenido.find((t) => t.idtipocontenido === Number(v))?.nombre ?? "—" },
      { key: "fecha_publicacion", label: "Publicación" }, { key: "fecha_expiracion", label: "Expiración" }, { key: "idEstado", label: "Estado", render: (v, r) => <StatusBadge status={r.fecha_expiracion && new Date(r.fecha_expiracion) < new Date() ? "Expirada" : Number(v) === 12 ? "Publicada" : Number(v) === 13 ? "Borrador" : "Inactiva"} /> },
    ],
    fields: [
      { key: "idtipocontenido", label: "Tipo de contenido", type: "select", required: true, options: data.tiposContenido.map((t) => ({ label: t.nombre, value: String(t.idtipocontenido) })) },
      { key: "idEstado", label: "Estado", type: "select", required: true, options: [{ label: "Borrador", value: "13" }, { label: "Publicada", value: "12" }] },
      { key: "titulo", label: "Título", type: "text", required: true, span: "full" }, { key: "contenido", label: "Contenido", type: "textarea", required: true, span: "full" },
      { key: "imagen_url", label: "URL de imagen", type: "text", span: "full" }, { key: "fecha_publicacion", label: "Fecha publicación", type: "datetime-local", required: true },
      { key: "fecha_expiracion", label: "Fecha expiración", type: "datetime-local" },
    ],
    filters: [
      { key: "idtipocontenido", label: "Tipo", options: data.tiposContenido.map((t) => ({ label: t.nombre, value: String(t.idtipocontenido) })) },
      { key: "estado", label: "Estado", getValue: (r) => r.fecha_expiracion && new Date(r.fecha_expiracion) < new Date() ? "Expirada" : r.idEstado === 12 ? "Publicada" : r.idEstado === 13 ? "Borrador" : "Inactiva", options: ["Borrador", "Publicada", "Inactiva", "Expirada"].map((x) => ({ label: x, value: x })) },
      { key: "vigencia", label: "Vigencia", getValue: (r) => r.fecha_expiracion && new Date(r.fecha_expiracion) < new Date() ? "Expiradas" : "Vigentes", options: ["Vigentes", "Expiradas"].map((x) => ({ label: x, value: x })) },
    ],
    actionLabel: "Dar de baja",
    emptyMessage: "No hay noticias registradas",
    detailTitle: (r) => r.titulo, detailSubtitle: () => "Noticia",
  }
  return <AdminCrudScreen table="contenidos" idKey="idContenido" config={config}
    onStatusAction={(row) => ({ ...row, idEstado: 2 })}
    actionMessage={() => "La noticia dejará de mostrarse a estudiantes y acudientes, pero se conserva el registro."}
    deleteLabel={(row) => row.titulo}
    initialCreate={{ fecha_publicacion: new Date().toISOString().slice(0, 16), idEstado: 13 }}
    validate={(f) => f.fecha_expiracion && f.fecha_expiracion <= f.fecha_publicacion ? { fecha_expiracion: "La expiración debe ser posterior a la publicación" } : {}}
    beforeSave={(f) => ({ ...f, idtipocontenido: Number(f.idtipocontenido), idEstado: Number(f.idEstado), imagen_url: f.imagen_url || null, fecha_expiracion: f.fecha_expiracion || null })}
    extraDetail={(row) => <div className="space-y-3">
      {row.imagen_url && <img src={row.imagen_url} alt="" className="h-28 w-full rounded-xl object-cover" />}
      <StatusBadge status={data.tiposContenido.find((t) => t.idtipocontenido === row.idtipocontenido)?.nombre ?? "Noticia"} />
      <p className="font-body text-sm leading-6 text-text-soft">{row.contenido}</p>
    </div>}
  />
}
