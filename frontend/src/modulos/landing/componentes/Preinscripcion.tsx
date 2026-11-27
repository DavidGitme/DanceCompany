import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import { errorNombrePersona } from '@/compartido/ui/PantallaRecurso';
import { erroresDeCampo, mensajeError } from '@/compartido/api/recursos';
import { EDAD_ADULTO, edadEn, errorDocumento, errorTelefono, errorTipoParaEdad } from '@/modulos/estudiantes/componentes/formulario';
import DocumentoLegal from '@/modulos/autenticacion/legal/DocumentoLegal';
import { TERMINOS } from '@/modulos/autenticacion/legal/textosLegales';
import { pesosCop, sitioPublico, type EstadoPreinscripcion, type PlanPublico, type SedePublica } from '../servicios/sitioPublico';

/*
 * Preinscripción por pasos (estructura inspirada en el «Multistep Form» de 21st.dev:
 * puntos de progreso con barra, una tarjeta por paso, Atrás / Siguiente), con la marca
 * DanceFlow y validación en vivo con mensajes en cada campo.
 *
 * Solo se muestra el formulario si hay un periodo de matrícula abierto (periodo_matricula).
 * Pide aceptar los términos y confirmar el correo con un enlace. No crea cuenta ni
 * estudiante: la inscripción sigue siendo presencial en la sede.
 */

const COMO_FUNCIONA = [
  ['Llena el formulario', 'Tus datos, la sede y, si eres menor de edad, los de tu acudiente.'],
  ['Acepta los términos', 'Lee los términos y condiciones y autoriza el uso de tus datos.'],
  ['Confirma tu correo', 'Te enviamos un enlace que vence en 48 horas. Ábrelo para confirmar.'],
  ['La sede te contacta', 'Con tu preinscripción confirmada, la sede te llama para terminar la inscripción en persona.'],
] as const;

interface Datos {
  nombre: string;
  idTipoDocumento: string;
  documento: string;
  fecha_nacimiento: string;
  telefono: string;
  email: string;
  confirmarEmail: string;
  idSede: string;
  idEstilo: string;
  idPlan: string;
  nombre_acudiente: string;
  telefono_acudiente: string;
  acepta: boolean;
}
type Campo = keyof Datos;
type IdPaso = 'datos' | 'contacto' | 'sede' | 'acudiente' | 'confirmar';

const PASOS: Record<IdPaso, { titulo: string; descripcion: string; campos: Campo[] }> = {
  datos: { titulo: 'Tus datos', descripcion: 'Como aparecen en tu documento de identidad.', campos: ['idTipoDocumento', 'documento', 'nombre', 'fecha_nacimiento'] },
  contacto: { titulo: 'Contacto', descripcion: 'Te escribiremos aquí para confirmar tu preinscripción.', campos: ['telefono', 'email', 'confirmarEmail'] },
  sede: { titulo: 'Sede y plan', descripcion: 'Dónde quieres entrenar. El estilo y el plan son opcionales.', campos: ['idSede', 'idEstilo', 'idPlan'] },
  acudiente: { titulo: 'Acudiente', descripcion: 'Eres menor de edad: necesitamos un adulto responsable.', campos: ['nombre_acudiente', 'telefono_acudiente'] },
  confirmar: { titulo: 'Confirmar', descripcion: 'Revisa tus datos y acepta los términos para enviar.', campos: ['acepta'] },
};

const vacio: Datos = {
  nombre: '', idTipoDocumento: '', documento: '', fecha_nacimiento: '', telefono: '', email: '', confirmarEmail: '',
  idSede: '', idEstilo: '', idPlan: '', nombre_acudiente: '', telefono_acudiente: '', acepta: false,
};
const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());
const fechaLarga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

const labelClass = 'font-condensed text-xs uppercase tracking-[0.18em] text-text-soft mb-1 block';
const inputClass =
  'bg-transparent border-0 border-b border-border text-text placeholder:text-text-muted px-0 py-3 font-body text-base w-full focus:outline-none focus:border-accent transition-colors duration-200 disabled:opacity-50 aria-[invalid=true]:border-red-500 [color-scheme:light] dark:[color-scheme:dark]';

function MensajeError({ id, mensaje }: { id: string; mensaje?: string }) {
  const { t } = useIdioma();
  return mensaje ? <p id={`pre-${id}-error`} className="mt-1 font-body text-xs font-medium text-red-600 dark:text-red-300">{t(mensaje)}</p> : null;
}

function CampoTexto({ id, etiqueta, requerido = true, error, ayuda, children }: { id: string; etiqueta: string; requerido?: boolean; error?: string; ayuda?: string; children: ReactNode }) {
  const { t } = useIdioma();
  return (
    <div>
      <label htmlFor={`pre-${id}`} className={labelClass}>
        {t(etiqueta)} {requerido && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 font-body text-xs text-text-muted">{t(ayuda)}</p>}
      <MensajeError id={id} mensaje={error} />
    </div>
  );
}

// Opción en forma de tarjeta (sede, plan): un radio real con estilo de botón
function Opcion({ nombre, valor, elegido, onElegir, titulo, detalle, deshabilitado }: {
  nombre: string; valor: string; elegido: boolean; onElegir: () => void; titulo: string; detalle?: string; deshabilitado?: boolean;
}) {
  return (
    <label
      className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-[border-color,background-color,transform] duration-200 hover:-translate-y-0.5 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-accent ${
        elegido ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'
      }`}
    >
      <span className="flex min-w-0 items-center gap-3">
        <input type="radio" name={nombre} value={valor} checked={elegido} onChange={onElegir} disabled={deshabilitado} className="h-4 w-4 shrink-0 accent-[var(--color-accent)]" />
        <span className="min-w-0">
          <span className="block font-condensed text-base font-bold uppercase tracking-wider text-text">{titulo}</span>
          {detalle && <span className="block truncate font-body text-xs text-text-muted tabular-nums">{detalle}</span>}
        </span>
      </span>
      {elegido && (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 shrink-0 text-accent" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
        </svg>
      )}
    </label>
  );
}

export default function Preinscripcion() {
  const { t } = useIdioma();
  const tituloPasoId = useId();
  const [estado, setEstado] = useState<EstadoPreinscripcion | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [sedes, setSedes] = useState<SedePublica[]>([]);
  const [tipos, setTipos] = useState<{ id: number; nombre: string }[]>([]);
  const [estilos, setEstilos] = useState<{ idEstilo: number; nombre: string }[]>([]);
  const [planes, setPlanes] = useState<PlanPublico[]>([]);
  const [datos, setDatos] = useState<Datos>(vacio);
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [paso, setPaso] = useState(0);
  const [direccion, setDireccion] = useState<'adelante' | 'atras'>('adelante');
  // Abierto en escritorio; en móvil cerrado para que el formulario quede a la vista
  const [verPasos, setVerPasos] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 1024px)').matches);
  const [verTerminos, setVerTerminos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [enviada, setEnviada] = useState<{ email: string; correoEnviado: boolean } | null>(null);
  const tarjeta = useRef<HTMLDivElement>(null);

  useEffect(() => {
    sitioPublico
      .estadoPreinscripcion()
      .then((e) => {
        setEstado(e);
        if (!e.abierta) return;
        sitioPublico.sedes().then(setSedes).catch(() => undefined);
        sitioPublico.tiposDocumento().then(setTipos).catch(() => undefined);
        sitioPublico.estilos().then(setEstilos).catch(() => undefined);
        sitioPublico.planes().then(setPlanes).catch(() => undefined);
      })
      .catch(() => setErrorCarga(true));
  }, []);

  const edad = edadEn(datos.fecha_nacimiento);
  const menor = edad !== null && edad >= 0 && edad < EDAD_ADULTO;
  const tipoNombre = tipos.find((x) => String(x.id) === datos.idTipoDocumento)?.nombre ?? '';
  // El paso del acudiente solo aparece para menores de edad
  const pasos: IdPaso[] = menor ? ['datos', 'contacto', 'sede', 'acudiente', 'confirmar'] : ['datos', 'contacto', 'sede', 'confirmar'];
  const actual = pasos[Math.min(paso, pasos.length - 1)];
  const ultimo = paso >= pasos.length - 1;

  const errores = useMemo(() => {
    const e: Partial<Record<Campo, string>> = {};
    e.nombre = !datos.nombre.trim() ? 'Escribe tu nombre completo.' : errorNombrePersona(datos.nombre);
    if (!datos.idTipoDocumento) e.idTipoDocumento = 'Elige el tipo de documento.';
    e.documento = !datos.documento.trim() ? 'Escribe el número de documento.' : errorDocumento(tipoNombre, datos.documento);
    if (!datos.fecha_nacimiento) e.fecha_nacimiento = 'Escribe la fecha de nacimiento.';
    else if (edad === null || edad < 0) e.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.';
    else if (tipoNombre) e.idTipoDocumento = e.idTipoDocumento ?? errorTipoParaEdad(tipoNombre, edad);
    e.telefono = !datos.telefono.trim() ? 'Escribe tu teléfono.' : errorTelefono(datos.telefono);
    if (!datos.email.trim()) e.email = 'Escribe tu correo.';
    else if (!correoValido(datos.email)) e.email = 'Escribe un correo válido.';
    if (!datos.confirmarEmail.trim()) e.confirmarEmail = 'Repite tu correo.';
    else if (datos.confirmarEmail.trim().toLowerCase() !== datos.email.trim().toLowerCase()) e.confirmarEmail = 'Los correos no coinciden.';
    if (!datos.idSede) e.idSede = 'Elige la sede.';
    if (menor) {
      e.nombre_acudiente = !datos.nombre_acudiente.trim() ? 'Escribe el nombre del acudiente.' : errorNombrePersona(datos.nombre_acudiente);
      e.telefono_acudiente = !datos.telefono_acudiente.trim() ? 'Escribe el teléfono del acudiente.' : errorTelefono(datos.telefono_acudiente);
    }
    if (!datos.acepta) e.acepta = 'Debes aceptar los términos y condiciones para enviar la preinscripción.';
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Partial<Record<Campo, string>>;
  }, [datos, edad, menor, tipoNombre]);

  const errorDe = (campo: Campo) => erroresServidor[campo] || (tocados.has(campo) && errores[campo]) || undefined;
  const cambiar = <K extends Campo>(campo: K, valor: Datos[K]) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setTocados((prev) => new Set(prev).add(campo));
    setErroresServidor((prev) => ({ ...prev, [campo]: '' }));
    setErrorServidor(null);
  };
  const props = (id: Campo) => ({
    id: `pre-${id}`,
    name: id,
    'aria-invalid': errorDe(id) ? true : undefined,
    'aria-describedby': errorDe(id) ? `pre-${id}-error` : undefined,
    onBlur: () => setTocados((prev) => new Set(prev).add(id)),
    disabled: enviando,
  });

  // Errores de un paso; si hay, marca sus campos y enfoca el primero
  const pasoValido = (idPaso: IdPaso) => {
    const campos = PASOS[idPaso].campos;
    setTocados((prev) => new Set([...prev, ...campos]));
    const primero = campos.find((c) => errores[c]);
    if (primero) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>(`#preinscripcion [name="${primero}"]`)?.focus());
      return false;
    }
    return true;
  };

  const irAPaso = (destino: number) => {
    setDireccion(destino > paso ? 'adelante' : 'atras');
    setPaso(destino);
    setErrorServidor(null);
    requestAnimationFrame(() => tarjeta.current?.focus({ preventScroll: true }));
  };

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    if (!ultimo) {
      if (pasoValido(actual)) irAPaso(paso + 1);
      return;
    }
    // Último paso: revisa todo (por si algo cambió) y vuelve al primer paso con errores
    const conError = pasos.find((p) => PASOS[p].campos.some((c) => errores[c]));
    if (conError) {
      setTocados(new Set(Object.keys(vacio)));
      if (conError !== actual) irAPaso(pasos.indexOf(conError));
      else pasoValido(conError);
      return;
    }
    setEnviando(true);
    try {
      const r = await sitioPublico.preinscribir({
        nombre: datos.nombre.trim(),
        idTipoDocumento: Number(datos.idTipoDocumento),
        documento: datos.documento.trim(),
        fecha_nacimiento: datos.fecha_nacimiento,
        telefono: datos.telefono.trim(),
        email: datos.email.trim(),
        idSede: Number(datos.idSede),
        idEstilo: datos.idEstilo ? Number(datos.idEstilo) : undefined,
        idPlan: datos.idPlan ? Number(datos.idPlan) : undefined,
        nombre_acudiente: menor ? datos.nombre_acudiente.trim() : undefined,
        telefono_acudiente: menor ? datos.telefono_acudiente.trim() : undefined,
        aceptaTerminos: datos.acepta,
        terminosVersion: estado?.terminosVersion,
      });
      setEnviada({ email: r.email, correoEnviado: r.correoEnviado });
    } catch (err) {
      const campos = erroresDeCampo(err);
      setErroresServidor(campos);
      // Si el servidor marca un campo, se vuelve al paso que lo tiene
      const pasoConError = pasos.find((p) => PASOS[p].campos.some((c) => campos[c]));
      if (pasoConError && pasoConError !== actual) irAPaso(pasos.indexOf(pasoConError));
      setErrorServidor(Object.keys(campos).length ? t('Revisa los campos marcados.') : mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const nombreDe = <T,>(lista: T[], clave: keyof T, valor: string, etiqueta: keyof T) =>
    String(lista.find((x) => String(x[clave]) === valor)?.[etiqueta] ?? '');

  // ---------- Contenido de cada paso ----------
  const contenidoPaso = () => {
    switch (actual) {
      case 'datos':
        return (
          <div className="grid gap-6 sm:grid-cols-2">
            <CampoTexto id="idTipoDocumento" etiqueta="Tipo de documento" error={errorDe('idTipoDocumento')}>
              <select {...props('idTipoDocumento')} className={inputClass + ' cursor-pointer'} value={datos.idTipoDocumento} onChange={(e) => cambiar('idTipoDocumento', e.target.value)}>
                <option value="" className="bg-surface">{t('Selecciona')}</option>
                {tipos.map((x) => <option key={x.id} value={x.id} className="bg-surface">{t(x.nombre)}</option>)}
              </select>
            </CampoTexto>
            <CampoTexto id="documento" etiqueta="Número de documento" error={errorDe('documento')}>
              <input {...props('documento')} inputMode="numeric" autoComplete="off" maxLength={20} className={inputClass} value={datos.documento} onChange={(e) => cambiar('documento', e.target.value)} />
            </CampoTexto>
            <div className="sm:col-span-2">
              <CampoTexto id="nombre" etiqueta="Nombre completo" error={errorDe('nombre')}>
                <input {...props('nombre')} autoComplete="name" maxLength={100} className={inputClass} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
              </CampoTexto>
            </div>
            <CampoTexto id="fecha_nacimiento" etiqueta="Fecha de nacimiento" error={errorDe('fecha_nacimiento')} ayuda={menor ? 'Menor de edad: más adelante pediremos los datos del acudiente.' : undefined}>
              <input {...props('fecha_nacimiento')} type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} value={datos.fecha_nacimiento} onChange={(e) => cambiar('fecha_nacimiento', e.target.value)} />
            </CampoTexto>
          </div>
        );
      case 'contacto':
        return (
          <div className="grid gap-6">
            <CampoTexto id="telefono" etiqueta="Teléfono" error={errorDe('telefono')}>
              <input {...props('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="3001234567" className={inputClass} value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
            </CampoTexto>
            <div className="grid gap-6 sm:grid-cols-2">
              <CampoTexto id="email" etiqueta="Correo electrónico" error={errorDe('email')} ayuda="Te enviaremos un enlace para confirmarlo.">
                <input {...props('email')} type="email" autoComplete="email" maxLength={100} className={inputClass} value={datos.email} onChange={(e) => cambiar('email', e.target.value)} />
              </CampoTexto>
              <CampoTexto id="confirmarEmail" etiqueta="Confirma tu correo" error={errorDe('confirmarEmail')}>
                <input {...props('confirmarEmail')} type="email" autoComplete="off" maxLength={100} className={inputClass} value={datos.confirmarEmail} onChange={(e) => cambiar('confirmarEmail', e.target.value)} onPaste={(e) => e.preventDefault()} />
              </CampoTexto>
            </div>
          </div>
        );
      case 'sede':
        return (
          <div className="grid gap-8">
            <fieldset>
              <legend className={labelClass}>{t('Sede')} <span className="text-red-500" aria-hidden="true">*</span></legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {sedes.map((s) => (
                  <Opcion
                    key={s.idSede}
                    nombre="idSede"
                    valor={String(s.idSede)}
                    elegido={datos.idSede === String(s.idSede)}
                    onElegir={() => cambiar('idSede', String(s.idSede))}
                    titulo={s.nombre}
                    detalle={s.horaApertura && s.horaCierre ? t('Todos los días · {a} – {c}', { a: s.horaApertura, c: s.horaCierre }) : undefined}
                    deshabilitado={enviando}
                  />
                ))}
              </div>
              <MensajeError id="idSede" mensaje={errorDe('idSede')} />
            </fieldset>
            {planes.length > 0 && (
              <fieldset>
                <legend className={labelClass}>{t('Plan de interés')}</legend>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {planes.map((p) => (
                    <Opcion
                      key={p.idPlan}
                      nombre="idPlan"
                      valor={String(p.idPlan)}
                      elegido={datos.idPlan === String(p.idPlan)}
                      onElegir={() => cambiar('idPlan', datos.idPlan === String(p.idPlan) ? '' : String(p.idPlan))}
                      titulo={t(p.nombre)}
                      detalle={pesosCop(p.valor)}
                      deshabilitado={enviando}
                    />
                  ))}
                </div>
                {datos.idPlan && (
                  <button type="button" onClick={() => cambiar('idPlan', '')} className="mt-2 font-body text-xs text-text-muted underline underline-offset-4 hover:text-accent">
                    {t('Aún no sé')}
                  </button>
                )}
              </fieldset>
            )}
            <CampoTexto id="idEstilo" etiqueta="Estilo de interés" requerido={false}>
              <select {...props('idEstilo')} className={inputClass + ' cursor-pointer'} value={datos.idEstilo} onChange={(e) => cambiar('idEstilo', e.target.value)}>
                <option value="" className="bg-surface">{t('Aún no sé')}</option>
                {estilos.map((x) => <option key={x.idEstilo} value={x.idEstilo} className="bg-surface">{x.nombre}</option>)}
              </select>
            </CampoTexto>
          </div>
        );
      case 'acudiente':
        return (
          <div className="grid gap-6 sm:grid-cols-2">
            <CampoTexto id="nombre_acudiente" etiqueta="Nombre del acudiente" error={errorDe('nombre_acudiente')}>
              <input {...props('nombre_acudiente')} autoComplete="off" maxLength={100} className={inputClass} value={datos.nombre_acudiente} onChange={(e) => cambiar('nombre_acudiente', e.target.value)} />
            </CampoTexto>
            <CampoTexto id="telefono_acudiente" etiqueta="Teléfono del acudiente" error={errorDe('telefono_acudiente')}>
              <input {...props('telefono_acudiente')} type="tel" inputMode="tel" placeholder="3001234567" className={inputClass} value={datos.telefono_acudiente} onChange={(e) => cambiar('telefono_acudiente', e.target.value)} />
            </CampoTexto>
          </div>
        );
      case 'confirmar': {
        const resumen: { paso: IdPaso; filas: [string, string][] }[] = [
          { paso: 'datos', filas: [['Nombre', datos.nombre], ['Documento', `${t(tipoNombre)} ${datos.documento}`], ['Nacimiento', datos.fecha_nacimiento ? fechaLarga(datos.fecha_nacimiento) : '']] },
          { paso: 'contacto', filas: [['Teléfono', datos.telefono], ['Correo', datos.email]] },
          {
            paso: 'sede',
            filas: [
              ['Sede', nombreDe(sedes, 'idSede', datos.idSede, 'nombre')],
              ['Plan', datos.idPlan ? t(nombreDe(planes, 'idPlan', datos.idPlan, 'nombre')) : t('Aún no sé')],
              ['Estilo', datos.idEstilo ? nombreDe(estilos, 'idEstilo', datos.idEstilo, 'nombre') : t('Aún no sé')],
            ],
          },
          ...(menor ? [{ paso: 'acudiente' as IdPaso, filas: [['Acudiente', datos.nombre_acudiente], ['Teléfono', datos.telefono_acudiente]] as [string, string][] }] : []),
        ];
        return (
          <div className="grid gap-6">
            <div className="divide-y divide-border rounded-xl border border-border">
              {resumen.map((bloque) => (
                <div key={bloque.paso} className="flex items-start justify-between gap-4 px-4 py-3">
                  <dl className="grid min-w-0 flex-1 gap-1 sm:grid-cols-[8rem_1fr]">
                    {bloque.filas.map(([etiqueta, valor]) => (
                      <div key={etiqueta} className="contents">
                        <dt className="font-condensed text-xs uppercase tracking-wider text-text-muted sm:pt-0.5">{t(etiqueta)}</dt>
                        <dd className="truncate font-body text-sm text-text">{valor || '—'}</dd>
                      </div>
                    ))}
                  </dl>
                  <button type="button" onClick={() => irAPaso(pasos.indexOf(bloque.paso))} className="shrink-0 font-condensed text-xs font-semibold uppercase tracking-wider text-accent underline-offset-4 hover:underline">
                    {t('Cambiar')}
                  </button>
                </div>
              ))}
            </div>
            <div>
              <label className="flex items-start gap-3 font-body text-sm text-text-soft">
                <input
                  type="checkbox"
                  name="acepta"
                  checked={datos.acepta}
                  disabled={enviando}
                  onChange={(e) => cambiar('acepta', e.target.checked)}
                  aria-invalid={errorDe('acepta') ? true : undefined}
                  aria-describedby={errorDe('acepta') ? 'pre-acepta-error' : undefined}
                  className="mt-1 h-4 w-4 shrink-0 accent-[var(--color-accent)]"
                />
                <span>
                  {t('Leí y acepto los términos y condiciones y autorizo el tratamiento de mis datos personales')}
                  {menor ? ` ${t('(como acudiente del menor)')}` : ''}.{' '}
                  <button type="button" onClick={() => setVerTerminos(true)} className="text-accent underline underline-offset-4 hover:text-accent-strong">
                    {t('Leer el texto completo')}
                  </button>
                </span>
              </label>
              <MensajeError id="acepta" mensaje={errorDe('acepta')} />
            </div>
          </div>
        );
      }
    }
  };

  // ---------- Columna derecha según el estado ----------
  const panel = () => {
    if (errorCarga) {
      return (
        <div role="status" className="rounded-3xl border border-border bg-surface p-8">
          <p className="font-body text-text-soft">{t('No pudimos consultar si la preinscripción está abierta. Intenta más tarde o acércate a tu sede.')}</p>
        </div>
      );
    }
    if (!estado) return <div className="esqueleto h-[30rem] rounded-3xl" aria-label={t('Cargando')} />;
    if (!estado.abierta) {
      return (
        <div className="grain relative overflow-hidden rounded-3xl border border-border bg-surface-alt p-8 md:p-12">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-text-soft">
            <span className="h-2 w-2 rounded-full bg-text-muted" aria-hidden="true" />
            {t('Preinscripción cerrada')}
          </span>
          <p className="display mt-6 text-[clamp(2.25rem,4.5vw,3.75rem)] text-text">{t('Vuelve en el próximo periodo')}</p>
          <p className="mt-3 max-w-lg font-body text-text-soft">
            {t('En este momento no hay un periodo de matrícula abierto. Puedes inscribirte en persona en cualquiera de nuestras sedes.')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button size="md" onClick={() => document.querySelector('#sedes')?.scrollIntoView({ behavior: 'smooth' })}>{t('Ver sedes')}</Button>
            <Button size="md" variant="outline" onClick={() => document.querySelector('#planes')?.scrollIntoView({ behavior: 'smooth' })}>{t('Ver planes')}</Button>
          </div>
        </div>
      );
    }
    if (enviada) {
      return (
        <div role="status" className="rounded-3xl border border-border bg-surface p-8 md:p-12">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-accent text-on-accent" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" /></svg>
          </span>
          <p className="display mt-6 text-[clamp(2.25rem,4.5vw,3.75rem)] text-text">{t(enviada.correoEnviado ? 'Revisa tu correo' : 'Preinscripción recibida')}</p>
          <p className="mt-3 max-w-lg font-body text-text-soft">
            {enviada.correoEnviado
              ? t('Enviamos un enlace a {correo}. Ábrelo en las próximas 48 horas para confirmar tu correo; después la sede te contactará.', { correo: enviada.email })
              : t('Quedó registrada, pero no pudimos enviar el correo de confirmación a {correo}. La sede revisará tu preinscripción y te contactará por teléfono.', { correo: enviada.email })}
          </p>
        </div>
      );
    }
    const porcentaje = (paso / (pasos.length - 1)) * 100;
    return (
      <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
        {/* Progreso: un punto por paso (se puede volver, no saltar hacia adelante) */}
        <nav aria-label={t('Pasos de la preinscripción')}>
          <ol className="relative flex justify-between">
            <span className="absolute inset-x-4 top-4 h-px bg-border" aria-hidden="true" />
            <span className="absolute left-4 top-4 h-px bg-accent transition-[width] duration-500 ease-out" style={{ width: `calc((100% - 2rem) * ${porcentaje / 100})` }} aria-hidden="true" />
            {pasos.map((id, i) => {
              const hecho = i < paso;
              const esActual = i === paso;
              return (
                <li key={id} className="relative z-10 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={() => i < paso && irAPaso(i)}
                    disabled={i > paso || enviando}
                    aria-current={esActual ? 'step' : undefined}
                    aria-label={`${t('Paso')} ${i + 1}: ${t(PASOS[id].titulo)}`}
                    className={`flex h-8 w-8 items-center justify-center rounded-full border font-condensed text-sm font-bold transition-all duration-300 disabled:cursor-default ${
                      hecho ? 'border-accent bg-accent text-on-accent hover:scale-105'
                      : esActual ? 'border-accent bg-surface text-accent ring-4 ring-accent/20'
                      : 'border-border bg-surface text-text-muted'
                    }`}
                  >
                    {hecho ? (
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" /></svg>
                    ) : i + 1}
                  </button>
                  <span className={`hidden font-condensed text-[11px] uppercase tracking-wider sm:block ${esActual ? 'text-text' : 'text-text-muted'}`}>{t(PASOS[id].titulo)}</span>
                </li>
              );
            })}
          </ol>
        </nav>

        <div
          ref={tarjeta}
          tabIndex={-1}
          role="group"
          aria-labelledby={tituloPasoId}
          className="rounded-3xl border border-border bg-surface p-6 shadow-[0_24px_60px_-30px_rgba(46,34,64,0.35)] outline-none md:p-10"
        >
          <div key={actual} className={direccion === 'adelante' ? 'paso-entra' : 'paso-entra-atras'}>
            <p className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-accent">
              {t('Paso {n} de {total}', { n: paso + 1, total: pasos.length })}
            </p>
            <h3 id={tituloPasoId} className="display mt-2 text-4xl text-text">{t(PASOS[actual].titulo)}</h3>
            <p className="mt-1 mb-8 font-body text-sm text-text-soft">{t(PASOS[actual].descripcion)}</p>
            {contenidoPaso()}
          </div>

          {errorServidor && (
            <p role="alert" className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-3 font-body text-sm text-red-700 dark:text-red-300">{errorServidor}</p>
          )}

          <div className="mt-10 flex items-center justify-between gap-3 border-t border-border pt-6">
            <Button variant="outline" size="md" onClick={() => irAPaso(paso - 1)} disabled={paso === 0 || enviando}>
              {t('Atrás')}
            </Button>
            <Button type="submit" size="md" disabled={enviando}>
              {enviando ? t('Enviando…') : ultimo ? t('Enviar preinscripción') : t('Siguiente')}
            </Button>
          </div>
        </div>
      </form>
    );
  };

  return (
    <section id="preinscripcion" aria-labelledby="titulo-preinscripcion" className="relative py-28 bg-page overflow-hidden">
      <div className="relative max-w-[88rem] mx-auto px-6 grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16 items-start">
        {/* Columna izquierda: título, periodo y cómo funciona */}
        <div className="lg:sticky lg:top-28">
          <Reveal>
            <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(06) {t('Matrícula')}</span>
          </Reveal>
          <Reveal variant="mask" as="h2" className="display text-[clamp(2.75rem,7vw,6rem)] text-text mt-3">
            <span id="titulo-preinscripcion">
              <MaskLine>{t('Preinscríbete')}</MaskLine>
              <MaskLine delay={150}><span className="text-blush">{t('en línea')}</span></MaskLine>
            </span>
          </Reveal>

          {estado?.abierta && estado.periodo && (
            <Reveal delay={150}>
              <p className="mt-6 inline-flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full border border-border bg-surface px-4 py-2 font-body text-sm text-text-soft">
                <span className="relative flex h-2.5 w-2.5" aria-hidden="true">
                  <span className="absolute inset-0 animate-ping rounded-full bg-accent/50 motion-reduce:hidden" />
                  <span className="relative h-2.5 w-2.5 rounded-full bg-accent" />
                </span>
                <span className="font-condensed font-semibold uppercase tracking-wider text-text">{estado.periodo.nombre}</span>
                <span>{t('abierta hasta el {fin}', { fin: fechaLarga(estado.periodo.fecha_fin) })}</span>
              </p>
            </Reveal>
          )}

          {/* Cómo funciona: botón visible que despliega los pasos */}
          <Reveal delay={200} className="mt-8">
            <button
              type="button"
              onClick={() => setVerPasos((v) => !v)}
              aria-expanded={verPasos}
              aria-controls="pre-como-funciona"
              className="flex w-full items-center justify-between gap-4 border-y border-border py-4 text-left font-condensed text-sm font-bold uppercase tracking-[0.18em] text-text transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
            >
              {t('¿Cómo funciona la preinscripción?')}
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`h-5 w-5 transition-transform duration-300 ${verPasos ? 'rotate-180' : ''}`} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            <div id="pre-como-funciona" className="acordeon-panel" data-abierto={verPasos}>
              <div>
                <ol className="relative mt-6 flex flex-col gap-6 pl-12">
                  <span className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden="true" />
                  {COMO_FUNCIONA.map(([titulo, texto], i) => (
                    <li key={titulo} className="relative">
                      <span className="absolute -left-12 flex h-8 w-8 items-center justify-center rounded-full border border-border bg-page font-condensed text-sm font-bold text-accent">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="block font-condensed text-base font-bold uppercase tracking-wider text-text">{t(titulo)}</span>
                      <span className="block font-body text-sm text-text-soft">{t(texto)}</span>
                    </li>
                  ))}
                </ol>
                <p className="mt-6 font-body text-xs text-text-muted">{t('La preinscripción no reserva cupo ni crea una cuenta: el cupo se confirma al inscribirte en la sede.')}</p>
              </div>
            </div>
          </Reveal>
        </div>

        <Reveal delay={100}>{panel()}</Reveal>
      </div>

      {verTerminos && <DocumentoLegal titulo={t('Términos y condiciones')} secciones={TERMINOS} onCerrar={() => setVerTerminos(false)} />}
    </section>
  );
}
