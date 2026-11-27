import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import { errorNombrePersona } from '@/compartido/ui/PantallaRecurso';
import { erroresDeCampo, mensajeError } from '@/compartido/api/recursos';
import { EDAD_ADULTO, edadEn, errorDocumento, errorTelefono, errorTipoParaEdad } from '@/modulos/estudiantes/componentes/formulario';
import DocumentoLegal from '@/modulos/autenticacion/legal/DocumentoLegal';
import { TERMINOS } from '@/modulos/autenticacion/legal/textosLegales';
import { sitioPublico, type EstadoPreinscripcion, type PlanPublico, type SedePublica } from '../servicios/sitioPublico';

/*
 * Preinscripción: solo se muestra el formulario si hay un periodo de matrícula abierto
 * (tabla periodo_matricula). Pide aceptar los términos y confirmar el correo con un enlace.
 * No crea cuenta ni estudiante: la inscripción sigue siendo presencial en la sede.
 */

const PASOS = [
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

const vacio: Datos = {
  nombre: '', idTipoDocumento: '', documento: '', fecha_nacimiento: '', telefono: '', email: '', confirmarEmail: '',
  idSede: '', idEstilo: '', idPlan: '', nombre_acudiente: '', telefono_acudiente: '', acepta: false,
};
const correoValido = (c: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.trim());

const labelClass = 'font-condensed text-xs uppercase tracking-[0.18em] text-text-soft mb-1 block';
const inputClass =
  'bg-transparent border-0 border-b border-border text-text placeholder:text-text-muted px-0 py-3 font-body text-base w-full focus:outline-none focus:border-accent transition-colors duration-200 disabled:opacity-50 aria-[invalid=true]:border-red-500 [color-scheme:light] dark:[color-scheme:dark]';

function Campo({ id, etiqueta, requerido = true, error, ayuda, children }: { id: string; etiqueta: string; requerido?: boolean; error?: string; ayuda?: string; children: ReactNode }) {
  const { t } = useIdioma();
  return (
    <div>
      <label htmlFor={`pre-${id}`} className={labelClass}>
        {t(etiqueta)} {requerido && <span className="text-red-500" aria-hidden="true">*</span>}
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 font-body text-xs text-text-muted">{t(ayuda)}</p>}
      {error && <p id={`pre-${id}-error`} className="mt-1 font-body text-xs font-medium text-red-600 dark:text-red-300">{t(error)}</p>}
    </div>
  );
}

// Ventana con los pasos del proceso (se abre con el botón «¿Cómo funciona?»)
function ComoFunciona({ onCerrar }: { onCerrar: () => void }) {
  const { t } = useIdioma();
  const tituloId = useId();
  const cerrar = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    cerrar.current?.focus();
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', tecla);
    return () => document.removeEventListener('keydown', tecla);
  }, [onCerrar]);
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <div role="dialog" aria-modal="true" aria-labelledby={tituloId} className="w-full max-w-lg border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <h3 id={tituloId} className="display text-3xl text-text">{t('Cómo funciona la preinscripción')}</h3>
          <button ref={cerrar} type="button" onClick={onCerrar} className="font-condensed text-sm uppercase tracking-wider text-text-soft hover:text-text">{t('Cerrar')}</button>
        </div>
        <ol className="mt-5 border-t border-border">
          {PASOS.map(([titulo, texto], i) => (
            <li key={titulo} className="flex gap-4 border-b border-border py-3">
              <span className="font-condensed text-sm text-accent">({String(i + 1).padStart(2, '0')})</span>
              <span>
                <span className="block font-condensed text-sm font-bold uppercase tracking-wider text-text">{t(titulo)}</span>
                <span className="block font-body text-sm text-text-soft">{t(texto)}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 font-body text-xs text-text-muted">{t('La preinscripción no reserva cupo ni crea una cuenta: el cupo se confirma al inscribirte en la sede.')}</p>
      </div>
    </div>
  );
}

export default function Preinscripcion() {
  const { t } = useIdioma();
  const [estado, setEstado] = useState<EstadoPreinscripcion | null>(null);
  const [errorCarga, setErrorCarga] = useState(false);
  const [sedes, setSedes] = useState<SedePublica[]>([]);
  const [tipos, setTipos] = useState<{ id: number; nombre: string }[]>([]);
  const [estilos, setEstilos] = useState<{ idEstilo: number; nombre: string }[]>([]);
  const [planes, setPlanes] = useState<PlanPublico[]>([]);
  const [datos, setDatos] = useState<Datos>(vacio);
  const [tocados, setTocados] = useState<Set<string>>(new Set());
  const [intento, setIntento] = useState(false);
  const [verPasos, setVerPasos] = useState(false);
  const [verTerminos, setVerTerminos] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [enviada, setEnviada] = useState<{ email: string; correoEnviado: boolean } | null>(null);

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

  const errores = useMemo(() => {
    const e: Record<string, string | undefined> = {};
    e.nombre = !datos.nombre.trim() ? 'Escribe tu nombre completo.' : errorNombrePersona(datos.nombre);
    if (!datos.idTipoDocumento) e.idTipoDocumento = 'Elige el tipo de documento.';
    e.documento = !datos.documento.trim() ? 'Escribe el número de documento.' : errorDocumento(tipoNombre, datos.documento);
    if (!datos.fecha_nacimiento) e.fecha_nacimiento = 'Escribe la fecha de nacimiento.';
    else if (edad === null || edad < 0) e.fecha_nacimiento = 'La fecha de nacimiento no puede ser futura.';
    else if (tipoNombre) e.idTipoDocumento = e.idTipoDocumento ?? errorTipoParaEdad(tipoNombre, edad);
    e.telefono = !datos.telefono.trim() ? 'Escribe tu teléfono.' : errorTelefono(datos.telefono);
    if (!datos.email.trim()) e.email = 'Escribe tu correo.';
    else if (!correoValido(datos.email)) e.email = 'Escribe un correo válido.';
    if (datos.email.trim() && datos.confirmarEmail.trim().toLowerCase() !== datos.email.trim().toLowerCase()) e.confirmarEmail = 'Los correos no coinciden.';
    if (!datos.idSede) e.idSede = 'Elige la sede.';
    if (menor) {
      e.nombre_acudiente = !datos.nombre_acudiente.trim() ? 'Escribe el nombre del acudiente.' : errorNombrePersona(datos.nombre_acudiente);
      e.telefono_acudiente = !datos.telefono_acudiente.trim() ? 'Escribe el teléfono del acudiente.' : errorTelefono(datos.telefono_acudiente);
    }
    if (!datos.acepta) e.acepta = 'Debes aceptar los términos y condiciones para enviar la preinscripción.';
    return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Record<string, string>;
  }, [datos, edad, menor, tipoNombre]);

  const errorDe = (campo: string) => erroresServidor[campo] || ((intento || tocados.has(campo)) && errores[campo]) || undefined;
  const cambiar = <K extends keyof Datos>(campo: K, valor: Datos[K]) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
    setTocados((prev) => new Set(prev).add(campo));
    setErroresServidor({});
    setErrorServidor(null);
  };
  const props = (id: keyof Datos) => ({
    id: `pre-${id}`,
    name: id,
    'aria-invalid': errorDe(id) ? true : undefined,
    'aria-describedby': errorDe(id) ? `pre-${id}-error` : undefined,
    onBlur: () => setTocados((prev) => new Set(prev).add(id)),
    disabled: enviando,
  });

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setIntento(true);
    setErrorServidor(null);
    const primero = Object.keys(errores)[0];
    if (primero) {
      document.querySelector<HTMLElement>(`#preinscripcion [name="${primero}"]`)?.focus();
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
      setErrorServidor(Object.keys(campos).length ? t('Revisa los campos marcados.') : mensajeError(err));
    } finally {
      setEnviando(false);
    }
  };

  const fechaLarga = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <section id="preinscripcion" aria-labelledby="titulo-preinscripcion" className="relative py-24 bg-page overflow-hidden">
      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="mb-10 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-end">
          <div>
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">{t('Matrícula')}</span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(2.75rem,7vw,6rem)] text-text mt-3">
              <span id="titulo-preinscripcion">
                <MaskLine>{t('Preinscríbete')}</MaskLine>
                <MaskLine delay={150}><span className="text-blush">{t('en línea')}</span></MaskLine>
              </span>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <div className="flex flex-col items-start gap-4">
              <p className="font-body text-text-soft text-lg leading-relaxed">
                {estado?.abierta && estado.periodo
                  ? t('{periodo}: preinscripción abierta hasta el {fin}.', { periodo: estado.periodo.nombre, fin: fechaLarga(estado.periodo.fecha_fin) })
                  : t('La preinscripción se abre durante los periodos de matrícula.')}
              </p>
              <Button size="md" variant="outline" onClick={() => setVerPasos(true)}>{t('¿Cómo funciona la preinscripción?')}</Button>
            </div>
          </Reveal>
        </div>

        {errorCarga && (
          <p role="status" className="border border-border bg-surface p-6 font-body text-text-soft">
            {t('No pudimos consultar si la preinscripción está abierta. Intenta más tarde o acércate a tu sede.')}
          </p>
        )}

        {estado && !estado.abierta && (
          <div className="border border-border bg-surface p-6 md:p-8">
            <p className="display text-3xl text-text">{t('Preinscripción cerrada')}</p>
            <p className="mt-2 max-w-2xl font-body text-text-soft">
              {t('En este momento no hay un periodo de matrícula abierto. Puedes inscribirte en persona en cualquiera de nuestras sedes.')}
            </p>
            <Button size="md" className="mt-5" onClick={() => document.querySelector('#sedes')?.scrollIntoView({ behavior: 'smooth' })}>{t('Ver sedes')}</Button>
          </div>
        )}

        {estado?.abierta && enviada && (
          <div role="status" className="border border-emerald-500/40 bg-emerald-500/10 p-6 md:p-8 text-emerald-900 dark:text-emerald-100">
            <p className="display text-3xl">{t('¡Recibimos tu preinscripción!')}</p>
            <p className="mt-2 max-w-2xl font-body">
              {enviada.correoEnviado
                ? t('Enviamos un enlace a {correo}. Ábrelo en las próximas 48 horas para confirmar tu correo; después la sede te contactará.', { correo: enviada.email })
                : t('Quedó registrada, pero no pudimos enviar el correo de confirmación a {correo}. La sede revisará tu preinscripción y te contactará por teléfono.', { correo: enviada.email })}
            </p>
          </div>
        )}

        {estado?.abierta && !enviada && (
          <form onSubmit={enviar} noValidate className="grid gap-10 border border-border bg-surface p-6 md:p-10 lg:grid-cols-2">
            <fieldset className="flex flex-col gap-6">
              <legend className="mb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('1. Datos del aspirante')}</legend>
              <div className="grid sm:grid-cols-2 gap-6">
                <Campo id="idTipoDocumento" etiqueta="Tipo de documento" error={errorDe('idTipoDocumento')}>
                  <select {...props('idTipoDocumento')} className={inputClass + ' cursor-pointer'} value={datos.idTipoDocumento} onChange={(e) => cambiar('idTipoDocumento', e.target.value)}>
                    <option value="" className="bg-surface">{t('Selecciona')}</option>
                    {tipos.map((x) => <option key={x.id} value={x.id} className="bg-surface">{t(x.nombre)}</option>)}
                  </select>
                </Campo>
                <Campo id="documento" etiqueta="Número de documento" error={errorDe('documento')}>
                  <input {...props('documento')} inputMode="numeric" maxLength={20} className={inputClass} value={datos.documento} onChange={(e) => cambiar('documento', e.target.value)} />
                </Campo>
              </div>
              <div className="grid sm:grid-cols-2 gap-6">
                <Campo id="fecha_nacimiento" etiqueta="Fecha de nacimiento" error={errorDe('fecha_nacimiento')} ayuda={menor ? 'Menor de edad: se piden los datos del acudiente.' : undefined}>
                  <input {...props('fecha_nacimiento')} type="date" max={new Date().toISOString().slice(0, 10)} className={inputClass} value={datos.fecha_nacimiento} onChange={(e) => cambiar('fecha_nacimiento', e.target.value)} />
                </Campo>
                <Campo id="nombre" etiqueta="Nombre completo" error={errorDe('nombre')}>
                  <input {...props('nombre')} autoComplete="name" maxLength={100} className={inputClass} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
                </Campo>
              </div>
              <Campo id="telefono" etiqueta="Teléfono" error={errorDe('telefono')}>
                <input {...props('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="3001234567" className={inputClass} value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
              </Campo>
              <div className="grid sm:grid-cols-2 gap-6">
                <Campo id="email" etiqueta="Correo electrónico" error={errorDe('email')} ayuda="Te enviaremos un enlace para confirmarlo.">
                  <input {...props('email')} type="email" autoComplete="email" maxLength={100} className={inputClass} value={datos.email} onChange={(e) => cambiar('email', e.target.value)} />
                </Campo>
                <Campo id="confirmarEmail" etiqueta="Confirma tu correo" error={errorDe('confirmarEmail')}>
                  <input {...props('confirmarEmail')} type="email" autoComplete="email" maxLength={100} className={inputClass} value={datos.confirmarEmail} onChange={(e) => cambiar('confirmarEmail', e.target.value)} onPaste={(e) => e.preventDefault()} />
                </Campo>
              </div>
            </fieldset>

            <div className="flex flex-col gap-10">
              <fieldset className="flex flex-col gap-6">
                <legend className="mb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('2. Sede y preferencias')}</legend>
                <Campo id="idSede" etiqueta="Sede" error={errorDe('idSede')}>
                  <select {...props('idSede')} className={inputClass + ' cursor-pointer'} value={datos.idSede} onChange={(e) => cambiar('idSede', e.target.value)}>
                    <option value="" className="bg-surface">{t('Selecciona una sede')}</option>
                    {sedes.map((s) => <option key={s.idSede} value={s.idSede} className="bg-surface">{s.nombre}</option>)}
                  </select>
                </Campo>
                <div className="grid sm:grid-cols-2 gap-6">
                  <Campo id="idEstilo" etiqueta="Estilo de interés" requerido={false}>
                    <select {...props('idEstilo')} className={inputClass + ' cursor-pointer'} value={datos.idEstilo} onChange={(e) => cambiar('idEstilo', e.target.value)}>
                      <option value="" className="bg-surface">{t('Aún no sé')}</option>
                      {estilos.map((x) => <option key={x.idEstilo} value={x.idEstilo} className="bg-surface">{x.nombre}</option>)}
                    </select>
                  </Campo>
                  <Campo id="idPlan" etiqueta="Plan de interés" requerido={false}>
                    <select {...props('idPlan')} className={inputClass + ' cursor-pointer'} value={datos.idPlan} onChange={(e) => cambiar('idPlan', e.target.value)}>
                      <option value="" className="bg-surface">{t('Aún no sé')}</option>
                      {planes.map((p) => <option key={p.idPlan} value={p.idPlan} className="bg-surface">{t(p.nombre)}</option>)}
                    </select>
                  </Campo>
                </div>
              </fieldset>

              {menor && (
                <fieldset className="flex flex-col gap-6">
                  <legend className="mb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('3. Acudiente (menor de edad)')}</legend>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Campo id="nombre_acudiente" etiqueta="Nombre del acudiente" error={errorDe('nombre_acudiente')}>
                      <input {...props('nombre_acudiente')} maxLength={100} className={inputClass} value={datos.nombre_acudiente} onChange={(e) => cambiar('nombre_acudiente', e.target.value)} />
                    </Campo>
                    <Campo id="telefono_acudiente" etiqueta="Teléfono del acudiente" error={errorDe('telefono_acudiente')}>
                      <input {...props('telefono_acudiente')} type="tel" inputMode="tel" placeholder="3001234567" className={inputClass} value={datos.telefono_acudiente} onChange={(e) => cambiar('telefono_acudiente', e.target.value)} />
                    </Campo>
                  </div>
                </fieldset>
              )}

              <fieldset className="flex flex-col gap-3">
                <legend className="mb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{t(menor ? '4. Términos y condiciones' : '3. Términos y condiciones')}</legend>
                <label className="flex items-start gap-3 font-body text-sm text-text-soft">
                  <input
                    type="checkbox"
                    name="acepta"
                    checked={datos.acepta}
                    disabled={enviando}
                    onChange={(e) => cambiar('acepta', e.target.checked)}
                    aria-invalid={errorDe('acepta') ? true : undefined}
                    aria-describedby={errorDe('acepta') ? 'pre-acepta-error' : undefined}
                    className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span>
                    {t('Leí y acepto los términos y condiciones y autorizo el tratamiento de mis datos personales')}
                    {menor ? ` ${t('(como acudiente del menor)')}` : ''}.{' '}
                    <button type="button" onClick={() => setVerTerminos(true)} className="text-accent underline underline-offset-4 hover:text-accent-strong">
                      {t('Leer el texto completo')}
                    </button>
                  </span>
                </label>
                {errorDe('acepta') && <p id="pre-acepta-error" className="font-body text-xs font-medium text-red-600 dark:text-red-300">{t(errorDe('acepta')!)}</p>}
              </fieldset>

              {errorServidor && <p role="alert" className="border border-red-500/30 bg-red-500/10 p-3 font-body text-sm text-red-700 dark:text-red-300">{errorServidor}</p>}
              <Button type="submit" size="lg" fullWidth disabled={enviando}>{enviando ? t('Enviando…') : t('Enviar preinscripción')}</Button>
            </div>
          </form>
        )}
      </div>

      {verPasos && <ComoFunciona onCerrar={() => setVerPasos(false)} />}
      {verTerminos && <DocumentoLegal titulo={t('Términos y condiciones')} secciones={TERMINOS} onCerrar={() => setVerTerminos(false)} />}
    </section>
  );
}
