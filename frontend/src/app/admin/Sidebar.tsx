import SelectorIdioma from "@/compartido/ui/SelectorIdioma"
import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useState } from 'react';
import logoFna from '@/recursos/logo-fna.png';
import { useAuth } from '@/nucleo/auth/useAuth';
import { puede } from '@/nucleo/auth/requierePermiso';
import { navegacion, type NodoNavegacion } from '@/app/admin/navegacion';

interface SidebarProps {
  activeModule: string;
  onModuleChange: (id: string) => void;
  onExit: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  // Menú en móvil (panel deslizable)
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

const icono = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 flex-shrink-0" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d={d} />
  </svg>
);

const chevron = icono('M8.25 4.5l7.5 7.5-7.5 7.5');
const salir = icono('M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9');
const colapsar = icono('M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5');
const cerrar = icono('M6 18L18 6M6 6l12 12');

function EtiquetaDemo() {
  return (
    <span
      className="ml-auto rounded-full border border-amber-500/40 bg-amber-500/10 px-1.5 py-px font-condensed text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"
      title={tr("Pantalla de demostración: aún no guarda en la base de datos")}
    >
      {tr("Demo")}
    </span>
  );
}

export default function Sidebar({
  activeModule,
  onModuleChange,
  onExit,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { usuario } = useAuth();

  // Solo se muestran las opciones permitidas (la API vuelve a validar cada permiso)
  const visibles: NodoNavegacion[] = navegacion
    .map((nodo) => ({
      ...nodo,
      hijos: nodo.hijos?.filter((hijo) => puede(usuario, hijo.permiso, 'ver')),
    }))
    .filter((nodo) => (nodo.hijos ? nodo.hijos.length > 0 : puede(usuario, nodo.permiso ?? '', 'ver')));

  const grupoActivo = visibles.find((n) => n.hijos?.some((h) => h.id === activeModule))?.id;
  const [abiertos, setAbiertos] = useState<string[]>(() => (grupoActivo ? [grupoActivo] : ['personas']));

  // El grupo del módulo activo siempre queda abierto
  useEffect(() => {
    if (grupoActivo) setAbiertos((prev) => (prev.includes(grupoActivo) ? prev : [...prev, grupoActivo]));
  }, [grupoActivo]);

  // Escape cierra el menú móvil
  useEffect(() => {
    if (!mobileOpen) return;
    const alTeclear = (e: KeyboardEvent) => e.key === 'Escape' && onCloseMobile();
    document.addEventListener('keydown', alTeclear);
    return () => document.removeEventListener('keydown', alTeclear);
  }, [mobileOpen, onCloseMobile]);

  const alternar = (id: string) =>
    setAbiertos((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const elegir = (id: string) => {
    onModuleChange(id);
    onCloseMobile();
  };

  const compacto = collapsed && !mobileOpen;

  return (
    <>
      {/* Fondo del menú móvil */}
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden animar-fondo" onClick={onCloseMobile} aria-hidden="true" />}

      <aside
        id="menu-admin"
        aria-label={tr("Menú del panel")}
        className={[
          'z-50 flex h-full flex-col border-r border-border bg-surface transition-[width,transform] duration-300',
          'fixed inset-y-0 left-0 w-72 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0 animar-panel' : '-translate-x-full',
          compacto ? 'lg:w-[72px]' : 'lg:w-72',
        ].join(' ')}
      >
        {/* Marca */}
        <div className={['flex h-16 flex-shrink-0 items-center gap-3 border-b border-border px-4', compacto ? 'lg:justify-center' : ''].join(' ')}>
          <img src={logoFna} alt="" className="h-8 w-auto flex-shrink-0 object-contain" />
          {!compacto && (
            <div className="min-w-0">
              <div className="font-display text-base leading-none text-text">F&amp;A Dance</div>
              <div className="mt-1 font-condensed text-[11px] uppercase leading-none tracking-[0.2em] text-text-muted">{tr("Administración")}</div>
            </div>
          )}
          <button type="button" onClick={onCloseMobile} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-text-muted hover:bg-accent/10 hover:text-text lg:hidden" aria-label={tr("Cerrar menú")}>
            {cerrar}
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-4" aria-label={tr("Módulos")}>
          {visibles.map((nodo) => {
            const activo = activeModule === nodo.id || (nodo.hijos?.some((h) => h.id === activeModule) ?? false);
            const abierto = abiertos.includes(nodo.id);
            const idLista = `submenu-${nodo.id}`;

            if (!nodo.hijos) {
              return (
                <button
                  key={nodo.id}
                  type="button"
                  onClick={() => elegir(nodo.id)}
                  aria-current={activo ? 'page' : undefined}
                  title={compacto ? tr(nodo.etiqueta) : undefined}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    activo ? 'bg-accent text-on-accent' : 'text-text-soft hover:bg-accent/10 hover:text-text',
                    compacto ? 'lg:justify-center' : '',
                  ].join(' ')}
                >
                  {nodo.icono}
                  {!compacto && <span className="font-condensed text-sm font-semibold uppercase tracking-wider">{tr(nodo.etiqueta)}</span>}
                  {compacto && <span className="sr-only">{tr(nodo.etiqueta)}</span>}
                </button>
              );
            }

            return (
              <div key={nodo.id} className="mt-1">
                <button
                  type="button"
                  onClick={() => {
                    if (compacto) {
                      // En modo compacto se expande el menú para ver las opciones
                      onToggleCollapse();
                      setAbiertos((prev) => (prev.includes(nodo.id) ? prev : [...prev, nodo.id]));
                    } else {
                      alternar(nodo.id);
                    }
                  }}
                  aria-expanded={compacto ? undefined : abierto}
                  aria-controls={compacto ? undefined : idLista}
                  title={compacto ? tr(nodo.etiqueta) : undefined}
                  className={[
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors',
                    activo ? 'text-accent' : 'text-text-soft hover:bg-accent/10 hover:text-text',
                    compacto ? 'lg:justify-center' : '',
                    compacto && activo ? 'bg-accent/15' : '',
                  ].join(' ')}
                >
                  {nodo.icono}
                  {!compacto && (
                    <>
                      <span className="flex-1 truncate font-condensed text-sm font-semibold uppercase tracking-wider">{tr(nodo.etiqueta)}</span>
                      <span className={['transition-transform duration-200', abierto ? 'rotate-90' : ''].join(' ')}>{chevron}</span>
                    </>
                  )}
                  {compacto && <span className="sr-only">{tr(nodo.etiqueta)}</span>}
                </button>

                {!compacto && abierto && (
                  <ul id={idLista} className="ml-5 mt-1 flex flex-col gap-0.5 border-l border-border py-1 pl-3">
                    {nodo.hijos.map((hijo) => {
                      const actual = activeModule === hijo.id;
                      return (
                        <li key={hijo.id}>
                          <button
                            type="button"
                            onClick={() => elegir(hijo.id)}
                            aria-current={actual ? 'page' : undefined}
                            className={[
                              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left font-condensed text-sm font-semibold uppercase tracking-wider transition-colors',
                              actual ? 'bg-accent text-on-accent' : 'text-text-muted hover:bg-accent/10 hover:text-text',
                            ].join(' ')}
                          >
                            <span className="truncate">{tr(hijo.etiqueta)}</span>
                            {hijo.demo && <EtiquetaDemo />}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Pie: usuario, colapsar y salir */}
        <div className="flex flex-shrink-0 flex-col gap-1 border-t border-border p-2">
          {usuario && !compacto && (
            <div className="mb-1 rounded-xl bg-surface-alt px-3 py-2.5">
              <p className="truncate font-body text-sm font-semibold text-text">{usuario.nombre}</p>
              <p className="truncate font-condensed text-[11px] uppercase tracking-wider text-text-muted">
                {usuario.roles.map((r) => tr(r)).join(' · ')}{usuario.sede ? ` · ${tr('Sede')} ${usuario.sede}` : ''}
              </p>
            </div>
          )}
          <div className={['flex px-1 py-1 text-text-muted', compacto ? 'justify-center' : ''].join(' ')}>
            <SelectorIdioma />
          </div>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={['hidden w-full items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted transition-colors hover:bg-accent/10 hover:text-text lg:flex', compacto ? 'justify-center' : ''].join(' ')}
            aria-label={tr(compacto ? "Expandir menú" : "Colapsar menú")}
          >
            <span className={['transition-transform duration-300', compacto ? 'rotate-180' : ''].join(' ')}>{colapsar}</span>
            {!compacto && <span className="font-condensed text-sm font-semibold uppercase tracking-wider">{tr("Colapsar")}</span>}
          </button>
          <button
            type="button"
            onClick={onExit}
            className={['flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-500', compacto ? 'lg:justify-center' : ''].join(' ')}
            aria-label={tr("Cerrar sesión")}
          >
            {salir}
            {!compacto && <span className="font-condensed text-sm font-semibold uppercase tracking-wider">{tr("Cerrar sesión")}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
