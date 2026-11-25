import { useCallback, useEffect, useMemo, useState } from 'react';
import CrudTable from '@/compartido/ui/CrudTable';
import SlideOver from '@/compartido/ui/SlideOver';
import DetailWidget from '@/compartido/ui/DetailWidget';
import ConfirmDialog from '@/compartido/ui/ConfirmDialog';
import { ModuleConfig } from '@/app/admin/tipos';
import type { Estado, Persona, Rol, Usuario } from '@/compartido/tipos/entities';
import type { ErrorApi } from '@/nucleo/http/clienteHttp';
import { estadoBadge, seguridadServicio } from '@/modulos/seguridad';
import { useAuth } from '@/nucleo/auth/useAuth';

// La API pagina de a 100 como máximo: se cargan todas las páginas y la tabla pagina en pantalla

const mensajeDe = (error: unknown) =>
  (error as ErrorApi)?.mensaje ?? 'No fue posible completar la operación.';

/* ─── ROLES CHECKBOXES ─── */
function RolesSelector({
  roles,
  selected,
  onChange,
}: {
  roles: Rol[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  return (
    <div>
      <p className="font-condensed font-600 text-xs uppercase tracking-wider text-purple-400 mb-3">
        Roles asignados <span className="text-red-400">*</span>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {roles.map(rol => (
          <label
            key={rol.idRol}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border hover:border-purple-400/40 cursor-pointer transition-colors group"
          >
            <input
              type="checkbox"
              checked={selected.includes(rol.idRol)}
              onChange={() => toggle(rol.idRol)}
              className="w-4 h-4 accent-purple-400 rounded"
            />
            <span className="font-condensed text-sm text-text group-hover:text-purple-400 transition-colors">{rol.nombre}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ─── SCREEN ─── */
export default function UsuariosScreen() {
  const { usuario } = useAuth();
  // Un administrador de sede solo asigna estos roles (la API responde 403 con otros)
  const rolAsignable = (nombre: string) =>
    !usuario?.idSede || ['instructor', 'estudiante', 'acudiente'].includes(nombre.trim().toLowerCase());
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [estados, setEstados] = useState<Estado[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const [slideOver, setSlideOver] = useState<{ open: boolean; mode: 'create' | 'edit'; row: Usuario | null }>({
    open: false, mode: 'create', row: null,
  });
  const [detail, setDetail] = useState<{ open: boolean; row: Usuario | null }>({ open: false, row: null });
  const [porInactivar, setPorInactivar] = useState<Usuario | null>(null);
  const [selectedRoles, setSelectedRoles] = useState<number[]>([]);
  const [guardando, setGuardando] = useState(false);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [u, p, r, e] = await Promise.all([
        seguridadServicio.listarTodo<Usuario>('usuarios'),
        seguridadServicio.listarTodo<Persona>('personas'),
        seguridadServicio.listarTodo<Rol>('roles'),
        seguridadServicio.listarTodo<Estado>('estados'),
      ]);
      setUsuarios(u);
      setPersonas(p);
      setRoles(r);
      setEstados(e);
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const nombrePersona = useCallback(
    (documento: string) => personas.find(p => p.documento === documento)?.nombre ?? '—',
    [personas],
  );
  const nombreRol = useCallback((id: number) => roles.find(r => r.idRol === id)?.nombre ?? '—', [roles]);
  const nombreEstado = useCallback((id: number) => estados.find(e => e.idEstado === id)?.nombre ?? '—', [estados]);

  // Una persona solo puede tener una cuenta
  const personasSinCuenta = useMemo(
    () => personas.filter(p => p.idEstado === 1 && !usuarios.some(u => u.documento === p.documento)),
    [personas, usuarios],
  );
  const opcionesEstado = estados
    .filter(e => e.categoria === 'general')
    .map(e => ({ label: e.nombre, value: String(e.idEstado) }));

  const config: ModuleConfig = {
    id: 'seg-usuarios',
    title: 'Usuarios',
    addLabel: 'Nuevo usuario',
    avatarKey: 'nombre',
    icon: null,
    emptyMessage: 'Todavía no hay cuentas. Crea la persona en Personas y luego su usuario aquí.',
    columns: [
      { key: 'nombre', label: 'Persona', render: v => <span className="font-600 text-text">{v}</span> },
      { key: 'documento', label: 'Documento (usuario)', render: v => <span className="font-condensed tracking-wider">{v}</span> },
      { key: 'roles', label: 'Roles', render: v => (
        <div className="flex gap-1 flex-wrap">
          {(v as number[]).map(id => (
            <span key={id} className="px-2 py-0.5 rounded-full bg-purple-700/20 text-purple-400 font-condensed text-xs uppercase tracking-wider border border-purple-700/30">
              {nombreRol(id)}
            </span>
          ))}
        </div>
      )},
      { key: 'idEstado', label: 'Estado', render: v => estadoBadge(nombreEstado(Number(v))) },
    ],
    filters: [
      { key: 'idEstado', label: 'Estado', options: opcionesEstado },
    ],
    fields: slideOver.mode === 'create'
      ? [
          {
            key: 'documento',
            label: 'Persona',
            type: 'select',
            required: true,
            span: 'full',
            options: personasSinCuenta.map(p => ({ label: `${p.nombre} · ${p.documento}`, value: p.documento })),
          },
          { key: 'clave', label: 'Contraseña (mín. 8)', type: 'password', required: true, span: 'half', placeholder: '••••••••' },
          { key: 'idEstado', label: 'Estado', type: 'select', required: true, span: 'half', options: opcionesEstado },
        ]
      : [
          { key: 'nombre', label: 'Persona', type: 'text', span: 'half', readOnly: true },
          { key: 'documento', label: 'Documento (usuario)', type: 'text', span: 'half', readOnly: true },
          { key: 'idEstado', label: 'Estado', type: 'select', required: true, span: 'half', options: opcionesEstado },
        ],
    detailFields: [
      { key: 'documento', label: 'Usuario (documento)' },
      { key: 'idEstado', label: 'Estado', render: v => estadoBadge(nombreEstado(Number(v))) },
    ],
    detailTitle: r => r.nombre,
    detailSubtitle: r => `Usuario · ${r.documento}`,
    data: [],
  };

  // Memorizado: SlideOver reinicia el formulario cada vez que initialData cambia de referencia
  const datosFormulario = useMemo(
    () => (slideOver.row ? { ...slideOver.row, nombre: nombrePersona(slideOver.row.documento ?? '') } : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slideOver.row],
  );

  const filas = useMemo(
    () => usuarios.map(u => ({ ...u, nombre: nombrePersona(u.documento) })),
    [usuarios, nombrePersona],
  );

  const handleAdd = () => {
    setAviso(null);
    setSelectedRoles([]);
    setSlideOver({ open: true, mode: 'create', row: { idEstado: 1 } as unknown as Usuario });
  };
  const handleEdit = (row: Usuario) => {
    setAviso(null);
    setDetail({ open: false, row: null });
    setSelectedRoles(row.roles ?? []);
    setSlideOver({ open: true, mode: 'edit', row });
  };
  const handleView = (row: Usuario) => setDetail({ open: true, row });
  const handleDelete = (row: Usuario) => { setDetail({ open: false, row: null }); setPorInactivar(row); };

  const confirmarInactivar = async () => {
    if (!porInactivar) return;
    try {
      const actualizado = await seguridadServicio.inactivar<Usuario>('usuarios', porInactivar.documento);
      setUsuarios(d => d.map(u => (u.documento === porInactivar.documento ? { ...u, ...actualizado } : u)));
      setAviso('Usuario inactivado. Ya no puede iniciar sesión.');
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setPorInactivar(null);
    }
  };

  const validar = (form: Record<string, any>) => {
    const errores: Record<string, string> = {};
    if (slideOver.mode === 'create' && String(form.clave ?? '').length < 8) {
      errores.clave = 'Mínimo 8 caracteres';
    } else if (slideOver.mode === 'create' && !(/[A-Za-z]/.test(String(form.clave)) && /\d/.test(String(form.clave)))) {
      errores.clave = 'Usa al menos una letra y un número';
    }
    if (selectedRoles.length === 0) errores.idEstado = 'Selecciona al menos un rol';
    return errores;
  };

  const handleSave = async (form: any) => {
    setGuardando(true);
    setError(null);
    try {
      if (slideOver.mode === 'create') {
        const creado = await seguridadServicio.crear<Usuario, object>('usuarios', {
          documento: form.documento,
          clave: form.clave,
          idEstado: Number(form.idEstado) || 1,
          roles: selectedRoles,
        });
        setUsuarios(d => [...d, creado]);
        setAviso(`Cuenta creada. ${nombrePersona(creado.documento)} inicia sesión con su documento.`);
      } else if (slideOver.row) {
        const actualizado = await seguridadServicio.actualizar<Usuario, object>('usuarios', slideOver.row.documento, {
          idEstado: Number(form.idEstado),
          roles: selectedRoles,
        });
        setUsuarios(d => d.map(u => (u.documento === actualizado.documento ? actualizado : u)));
        setAviso('Cambios guardados. Los permisos nuevos aplican en su próximo inicio de sesión.');
      }
      setSlideOver(s => ({ ...s, open: false }));
    } catch (err) {
      setError(mensajeDe(err));
    } finally {
      setGuardando(false);
    }
  };

  const rolesDetail = (row: Usuario | null) => {
    if (!row) return null;
    return (
      <div>
        <p className="font-condensed font-600 text-xs uppercase tracking-wider text-text-muted mb-2">Roles asignados</p>
        <div className="flex gap-2 flex-wrap">
          {(row.roles ?? []).length === 0 ? (
            <span className="text-text-muted font-body text-xs">Sin roles asignados</span>
          ) : (row.roles ?? []).map(id => (
            <span key={id} className="px-2.5 py-0.5 rounded-full bg-purple-700/20 text-purple-400 font-condensed text-xs uppercase tracking-wider border border-purple-700/30">
              {nombreRol(id)}
            </span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="mb-1">
        <span className="font-condensed text-xs uppercase tracking-[0.2em] text-purple-400">Seguridad</span>
      </div>
      {error && (
        <div role="alert" className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 font-body text-sm text-red-400">
          <span>{error}</span>
          <button onClick={cargar} className="font-condensed text-xs uppercase tracking-wider underline cursor-pointer">Reintentar</button>
        </div>
      )}
      {aviso && !error && (
        <div role="status" className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 font-body text-sm text-emerald-400">
          {aviso}
        </div>
      )}
      <CrudTable
        config={config}
        data={filas}
        loading={cargando}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onView={handleView}
        onDelete={handleDelete}
      />
      <SlideOver
        open={slideOver.open}
        mode={slideOver.mode}
        config={config}
        initialData={datosFormulario}
        onSave={guardando ? () => undefined : handleSave}
        onClose={() => setSlideOver(s => ({ ...s, open: false }))}
        validate={validar}
        extraContent={
          <RolesSelector
            roles={roles.filter(r => r.idEstado === 1 && rolAsignable(r.nombre))}
            selected={selectedRoles}
            onChange={setSelectedRoles}
          />
        }
      />
      <DetailWidget
        open={detail.open}
        config={config}
        row={detail.row ? { ...detail.row, nombre: nombrePersona(detail.row.documento) } : null}
        onEdit={() => handleEdit(detail.row!)}
        onDelete={() => handleDelete(detail.row!)}
        onClose={() => setDetail({ open: false, row: null })}
        extraContent={rolesDetail(detail.row)}
      />
      <ConfirmDialog
        open={porInactivar !== null}
        title="Inactivar usuario"
        message={`${porInactivar ? nombrePersona(porInactivar.documento) : ''} no podrá iniciar sesión. Puedes reactivarlo editando su estado.`}
        confirmLabel="Inactivar"
        onConfirm={confirmarInactivar}
        onClose={() => setPorInactivar(null)}
      />
    </>
  );
}
