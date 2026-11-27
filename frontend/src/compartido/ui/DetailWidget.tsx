import { tr } from "@/nucleo/i18n/IdiomaContext"
import { ModuleConfig } from '@/app/admin/tipos';

interface DetailWidgetProps {
  open: boolean;
  config: ModuleConfig;
  row: any | null;
  // Se conservan por compatibilidad: la ficha ya no muestra acciones de modificación
  onEdit?: () => void;
  onClose: () => void;
  onDelete?: () => void;
  extraContent?: React.ReactNode;
}

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
  </svg>
);

function Initials({ name }: { name: string }) {
  const parts = name?.split(' ') ?? ['?'];
  const initials = parts.slice(0, 2).map(w => w[0]).join('').toUpperCase();
  return (
    <div className="w-16 h-16 rounded-[20px] bg-purple-700/25 border border-purple-700/40 flex items-center justify-center flex-shrink-0">
      <span className="font-display text-2xl text-purple-400">{initials}</span>
    </div>
  );
}

export default function DetailWidget({ open, config, row, onClose, extraContent }: DetailWidgetProps) {
  if (!row) return null;

  const title = config.detailTitle?.(row) ?? String(row[config.columns[0]?.key] ?? '');
  const subtitle = config.detailSubtitle?.(row) ?? config.title;
  const fields = config.detailFields ?? config.columns.map(c => ({ key: c.key, label: c.label, render: c.render, wide: false }));

  return (
    <>
      {/* Backdrop */}
      <div
        className={[
          'fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
        onClick={onClose}
      />

      {/* Card */}
      <div
        className={[
          'fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 transition-all duration-300',
          'w-full max-w-md',
          open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none',
        ].join(' ')}
      >
        <div className="rounded-[20px] bg-surface border border-border overflow-hidden shadow-2xl shadow-black/60">
          {/* Header */}
          <div className="relative px-6 pt-6 pb-5 border-b border-border">
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-border transition-all cursor-pointer"
            >
              <CloseIcon />
            </button>

            {/* Avatar + identity */}
            <div className="flex items-center gap-4">
              <Initials name={title} />
              <div className="min-w-0">
                <h2 className="font-display text-2xl text-text leading-tight truncate">{title}</h2>
                <p className="font-condensed text-sm uppercase tracking-wider text-purple-400 mt-0.5">{subtitle}</p>
              </div>
            </div>
          </div>

          {/* Fields grid */}
          <div className="px-6 py-5 grid grid-cols-2 gap-x-6 gap-y-4 max-h-[40vh] overflow-y-auto">
            {fields.map((field, fieldIndex) => {
              const val = row[field.key];
              if (val === undefined || val === null || val === '') return null;
              return (
                <div key={`${field.key}-${field.label}-${fieldIndex}`} className={field.wide ? 'col-span-2' : ''}>
                  <div className="font-condensed text-xs uppercase tracking-wider text-text-muted mb-1">
                    {field.label}
                  </div>
                  <div className="font-body text-sm text-text">
                    {field.render ? field.render(val, row) : String(val)}
                  </div>
                </div>
              );
            })}
          </div>

          {extraContent && (
            <div className="col-span-2 pt-4 border-t border-border mt-2">
              {extraContent}
            </div>
          )}

          {/* "Ver" es solo lectura: sin editar, inactivar ni eliminar (esas acciones están en la fila) */}
          <div className="px-6 py-4 border-t border-border flex justify-end">
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-full border border-border text-text-soft hover:border-accent hover:text-text font-condensed font-600 text-sm uppercase tracking-wider transition-colors cursor-pointer"
            >
              {tr("Cerrar")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
