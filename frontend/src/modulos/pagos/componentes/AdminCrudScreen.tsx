import { ReactNode, useMemo, useState } from "react"
import CrudTable from "@/compartido/ui/CrudTable"
import DetailWidget from "@/compartido/ui/DetailWidget"
import SlideOver from "@/compartido/ui/SlideOver"
import { ModuleConfig } from "@/app/admin/tipos"
import { AdministrationData, useAdministration } from "../datos/ContextoAdministracion"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"

interface Props {
  table: keyof AdministrationData
  idKey: string
  config: ModuleConfig
  initialCreate?: Record<string, any>
  validate?: (form: Record<string, any>, rows: any[], editing: any | null) => Record<string, string>
  beforeSave?: (form: Record<string, any>, editing: any | null) => Record<string, any> | null
  afterSave?: (saved: Record<string, any>, editing: any | null) => void
  extraForm?: (form: Record<string, any>, setForm: React.Dispatch<React.SetStateAction<Record<string, any>>>) => ReactNode
  extraDetail?: (row: any) => ReactNode
  transformRows?: (rows: any[]) => any[]
  childrenBefore?: ReactNode
  deleteLabel?: (row: any) => string
  onStatusAction?: (row: any, rows: any[]) => any
  actionMessage?: (row: any) => string
  blockedMessage?: (row: any) => string | undefined
}

export default function AdminCrudScreen({
  table, idKey, config, initialCreate, validate, beforeSave, afterSave, extraForm,
  extraDetail, transformRows, childrenBefore, deleteLabel, onStatusAction, actionMessage, blockedMessage,
}: Props) {
  const { data, setTable } = useAdministration()
  const rows = data[table]
  const displayRows = useMemo(() => transformRows?.(rows) ?? rows, [rows, transformRows])
  const [panel, setPanel] = useState<{ open: boolean; mode: "create" | "edit"; row: any | null }>({ open: false, mode: "create", row: null })
  const [detail, setDetail] = useState<any | null>(null)
  const [pendingAction, setPendingAction] = useState<any | null>(null)

  const save = (form: Record<string, any>) => {
    const normalized = beforeSave?.(form, panel.row) ?? form
    if (!normalized) return
    let saved = normalized
    setTable(table, (current) => {
      if (panel.mode === "create") {
        const id = Math.max(0, ...current.map((r) => Number(r[idKey]) || 0)) + 1
        saved = { ...normalized, [idKey]: id }
        return [...current, saved]
      }
      saved = { ...panel.row, ...normalized }
      return current.map((r) => r[idKey] === panel.row[idKey] ? saved : r)
    })
    afterSave?.(saved, panel.row)
    setPanel((p) => ({ ...p, open: false }))
  }

  const requestStatusAction = (row: any) => {
    setDetail(null)
    setPendingAction(row)
  }

  const confirmStatusAction = () => {
    if (!pendingAction || !onStatusAction) return
    setTable(table, (current) => current.map((row) =>
      row[idKey] === pendingAction[idKey] ? onStatusAction(row, current) : row,
    ))
    setPendingAction(null)
  }

  return (
    <>
      <div className="mb-1">
        <span className="font-condensed text-xs uppercase tracking-[0.2em] text-purple-400">Administración y Operación</span>
      </div>
      {childrenBefore}
      <CrudTable
        config={config}
        data={displayRows}
        onAdd={() => setPanel({ open: true, mode: "create", row: initialCreate ?? null })}
        onEdit={(row) => { setDetail(null); setPanel({ open: true, mode: "edit", row }) }}
        onView={setDetail}
        onDelete={requestStatusAction}
      />
      <SlideOver
        open={panel.open}
        mode={panel.mode}
        config={config}
        initialData={panel.row}
        validate={(form) => validate?.(form, rows, panel.mode === "edit" ? panel.row : null) ?? {}}
        onSave={save}
        onClose={() => setPanel((p) => ({ ...p, open: false }))}
        extraContent={extraForm}
      />
      <DetailWidget
        open={Boolean(detail)}
        config={config}
        row={detail}
        onEdit={() => { setPanel({ open: true, mode: "edit", row: detail }); setDetail(null) }}
        onDelete={() => requestStatusAction(detail)}
        onClose={() => setDetail(null)}
        extraContent={detail ? extraDetail?.(detail) : null}
      />

      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={config.actionLabel ?? "Cambiar estado"}
        message={pendingAction ? actionMessage?.(pendingAction) ?? `¿Confirmas la acción sobre “${deleteLabel?.(pendingAction) ?? "este registro"}”? El registro se conservará en el sistema.` : ""}
        confirmLabel={config.actionLabel ?? "Confirmar"}
        blockedMessage={pendingAction ? blockedMessage?.(pendingAction) : undefined}
        onConfirm={confirmStatusAction}
        onClose={() => setPendingAction(null)}
      />
    </>
  )
}
