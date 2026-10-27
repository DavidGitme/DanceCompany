import { AdminCrudScreen } from "@/modulos/pagos"
import { ModuleConfig } from "@/app/admin/tipos"
import StatusBadge from "@/compartido/ui/StatusBadge"
const config: ModuleConfig = {
  id: "adm-metodos-pago", title: "Métodos de pago", addLabel: "Nuevo método", icon: null, data: [],
  columns: [{ key: "nombre", label: "Nombre" }, { key: "idEstado", label: "Estado", render: (v) => <StatusBadge status={Number(v) === 1 ? "Activo" : "Inactivo"} /> }],
  fields: [{ key: "nombre", label: "Nombre", type: "text", required: true, span: "full" }, { key: "idEstado", label: "Estado", type: "select", required: true, options: [{ label: "Activo", value: "1" }, { label: "Inactivo", value: "2" }] }],
  filters: [{ key: "idEstado", label: "Estado", options: [{ label: "Activo", value: "1" }, { label: "Inactivo", value: "2" }] }],
  actionLabel: "Cambiar estado",
  emptyMessage: "No hay métodos de pago registrados",
  detailTitle: (r) => r.nombre, detailSubtitle: () => "Método de pago",
}
export default function MetodosPagoScreen() {
  return <AdminCrudScreen table="metodos" idKey="idmetodo" config={config}
    initialCreate={{ idEstado: 1 }}
    validate={(f, rows, editing) => rows.some((r) => r.idmetodo !== editing?.idmetodo && r.nombre.toLowerCase() === f.nombre.trim().toLowerCase()) ? { nombre: "Ya existe un método con este nombre" } : {}}
    beforeSave={(f) => ({ nombre: f.nombre.trim(), idEstado: Number(f.idEstado) })}
    onStatusAction={(row) => ({ ...row, idEstado: row.idEstado === 1 ? 2 : 1 })}
    actionMessage={(row) => row.idEstado === 1 ? "Un método inactivo no se podrá elegir en nuevos pagos. ¿Deseas inactivarlo?" : "¿Deseas volver a activar este método de pago?"}
  />
}
