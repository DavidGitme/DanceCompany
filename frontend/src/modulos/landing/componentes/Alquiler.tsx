import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import { errorNombrePersona } from '@/compartido/ui/PantallaRecurso';
import { erroresDeCampo, mensajeError } from '@/compartido/api/recursos';
import { errorTelefono } from '@/modulos/estudiantes/componentes/formulario';
import { aHora, aMinutos, sitioPublico, type Disponibilidad, type SedePublica } from '../servicios/sitioPublico';

/*
 * «Solicita tu espacio»: la persona elige sede, fecha, aula y franja viendo lo que está
 * libre y ocupado (clases de los grupos y otras solicitudes). La solicitud se guarda en
 * solicitud_espacio como Pendiente y la sede la aprueba o rechaza en el panel.
 */

interface Datos {
  idSede: string;
  fecha: string;
  idAula: string;
  horaInicio: string;
  horaFin: string;
  personas: string;
  nombre: string;
  email: string;
  telefono: string;
  mensaje: string;
}

const vacio: Datos = { idSede: '', fecha: '', idAula: '', horaInicio: '', horaFin: '', personas: '', nombre: '', email: '', telefono: '', mensaje: '' };
const PASO = 30; // minutos entre opciones de hora
const hoyIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function validar(d: Datos, disp: Disponibilidad | null): Partial<Record<keyof Datos, string>> {
  const e: Partial<Record<keyof Datos, string>> = {};
  if (!d.idSede) e.idSede = 'Elige una sede.';
  if (!d.fecha) e.fecha = 'Elige una fecha.';
  else if (d.fecha < hoyIso()) e.fecha = 'Elige una fecha que no haya pasado.';
  if (!d.idAula) e.idAula = 'Elige un aula.';
  if (!d.horaInicio) e.horaInicio = 'Elige la hora de inicio.';
  if (!d.horaFin) e.horaFin = 'Elige la hora de fin.';
  else if (d.horaInicio && aMinutos(d.horaFin) <= aMinutos(d.horaInicio)) e.horaFin = 'Debe ser posterior a la hora de inicio.';
  const aula = disp?.aulas.find((a) => String(a.idAula) === d.idAula);
  if (aula && d.horaInicio && d.horaFin && !e.horaFin) {
    const [ini, fin] = [aMinutos(d.horaInicio), aMinutos(d.horaFin)];
    if (aula.ocupado.some((f) => ini < aMinutos(f.horaFin) && aMinutos(f.horaInicio) < fin)) e.horaFin = 'Esa franja se cruza con un horario ocupado.';
  }
  if (d.fecha === hoyIso() && d.horaInicio) {
    const ahora = new Date();
    if (aMinutos(d.horaInicio) <= ahora.getHours() * 60 + ahora.getMinutes()) e.horaInicio = 'Esa hora ya pasó.';
  }
  const personas = Number(d.personas);
  if (!d.personas) e.personas = 'Indica cuántas personas.';
  else if (!Number.isInteger(personas) || personas < 1) e.personas = 'Escribe un número entero mayor que 0.';
  else if (aula && personas > aula.capacidad) e.personas = `El aula admite máximo ${aula.capacidad} personas.`;
  e.nombre = !d.nombre.trim() ? 'Escribe tu nombre.' : errorNombrePersona(d.nombre);
  if (!d.email.trim()) e.email = 'Escribe tu correo.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email.trim())) e.email = 'Escribe un correo válido.';
  e.telefono = !d.telefono.trim() ? 'Escribe tu teléfono.' : errorTelefono(d.telefono);
  if (d.mensaje.length > 300) e.mensaje = 'Máximo 300 caracteres.';
  return Object.fromEntries(Object.entries(e).filter(([, v]) => v)) as Partial<Record<keyof Datos, string>>;
}

const labelClass = 'font-condensed text-xs uppercase tracking-[0.18em] text-text-soft mb-1 block';

// Fuera del formulario: definido adentro, React lo recrearía en cada tecla y el campo perdería el foco
function Campo({ id, etiqueta, children, error, ayuda }: { id: keyof Datos; etiqueta: string; children: ReactNode; error?: string; ayuda?: string }) {
  const { t } = useIdioma();
  return (
    <div>
      <label htmlFor={`alq-${id}`} className={labelClass}>
        {t(etiqueta)} <span className="text-red-500" aria-hidden="true">*</span>
      </label>
      {children}
      {ayuda && !error && <p className="mt-1 font-body text-xs text-text-muted">{t(ayuda)}</p>}
      {error && <p id={`alq-${id}-error`} className="mt-1 font-body text-xs font-medium text-red-600 dark:text-red-300">{t(error)}</p>}
    </div>
  );
}

export default function RentalForm() {
  const { t } = useIdioma();
  const [sedes, setSedes] = useState<SedePublica[]>([]);
  const [datos, setDatos] = useState<Datos>(vacio);
  const [tocados, setTocados] = useState<Set<keyof Datos>>(new Set());
  const [intento, setIntento] = useState(false);
  const [disp, setDisp] = useState<Disponibilidad | null>(null);
  const [cargandoDisp, setCargandoDisp] = useState(false);
  const [errorDisp, setErrorDisp] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorServidor, setErrorServidor] = useState<string | null>(null);
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({});
  const [resultado, setResultado] = useState<{ idSolicitud: number; correoEnviado: boolean } | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    sitioPublico.sedes().then(setSedes).catch(() => setErrorDisp(t('No pudimos cargar las sedes. Intenta más tarde.')));
  }, [t]);

  // La disponibilidad se recarga al cambiar la sede o la fecha
  useEffect(() => {
    if (!datos.idSede || !datos.fecha) {
      setDisp(null);
      return;
    }
    let vigente = true;
    setCargandoDisp(true);
    setErrorDisp(null);
    sitioPublico
      .disponibilidad(Number(datos.idSede), datos.fecha)
      .then((d) => vigente && setDisp(d))
      .catch((e) => vigente && (setDisp(null), setErrorDisp(mensajeError(e))))
      .finally(() => vigente && setCargandoDisp(false));
    return () => {
      vigente = false;
    };
  }, [datos.idSede, datos.fecha, version]);

  const errores = useMemo(() => validar(datos, disp), [datos, disp]);
  const errorDe = (campo: keyof Datos) => erroresServidor[campo === 'horaInicio' ? 'hora_inicio' : campo === 'horaFin' ? 'hora_fin' : campo] || ((intento || tocados.has(campo)) && errores[campo]) || undefined;

  const cambiar = (campo: keyof Datos, valor: string) => {
    setDatos((prev) => {
      const sig = { ...prev, [campo]: valor };
      // Al cambiar sede, fecha o aula, la franja elegida deja de valer
      if (campo === 'idSede') Object.assign(sig, { idAula: '', horaInicio: '', horaFin: '' });
      if (campo === 'fecha' || campo === 'idAula') Object.assign(sig, { horaInicio: '', horaFin: '' });
      if (campo === 'horaInicio' && sig.horaFin && aMinutos(sig.horaFin) <= aMinutos(valor)) sig.horaFin = '';
      return sig;
    });
    setTocados((prev) => new Set(prev).add(campo));
    setErroresServidor({});
    setErrorServidor(null);
  };

  const aula = disp?.aulas.find((a) => String(a.idAula) === datos.idAula);
  const apertura = disp?.horaApertura ? aMinutos(disp.horaApertura) : null;
  const cierre = disp?.horaCierre ? aMinutos(disp.horaCierre) : null;
  const ocupadoEn = (min: number) => aula?.ocupado.some((f) => aMinutos(f.horaInicio) <= min && min < aMinutos(f.horaFin));
  const horasInicio = apertura !== null && cierre !== null
    ? Array.from({ length: (cierre - apertura) / PASO }, (_, i) => apertura + i * PASO)
    : [];
  const horasFin = datos.horaInicio && cierre !== null
    ? (() => {
        const inicio = aMinutos(datos.horaInicio);
        const lista: number[] = [];
        for (let m = inicio + PASO; m <= cierre; m += PASO) {
          if (ocupadoEn(m - PASO)) break; // no puede atravesar una franja ocupada
          lista.push(m);
        }
        return lista;
      })()
    : [];

  const enviar = async (e: FormEvent) => {
    e.preventDefault();
    setIntento(true);
    setErrorServidor(null);
    if (Object.keys(errores).length) {
      document.querySelector<HTMLElement>(`#alquiler [name="${Object.keys(errores)[0]}"]`)?.focus();
      return;
    }
    setEnviando(true);
    try {
      const r = await sitioPublico.solicitarEspacio({
        nombre: datos.nombre.trim(),
        email: datos.email.trim(),
        telefono: datos.telefono.trim(),
        idAula: Number(datos.idAula),
        fecha: datos.fecha,
        hora_inicio: datos.horaInicio,
        hora_fin: datos.horaFin,
        personas: Number(datos.personas),
        mensaje: datos.mensaje.trim() || undefined,
      });
      setResultado(r);
      setDatos(vacio);
      setTocados(new Set());
      setIntento(false);
      setVersion((v) => v + 1);
    } catch (err) {
      const campos = erroresDeCampo(err);
      setErroresServidor(campos);
      setErrorServidor(Object.keys(campos).length ? t('Revisa los campos marcados.') : mensajeError(err));
      setVersion((v) => v + 1); // la franja pudo ocuparse mientras tanto
    } finally {
      setEnviando(false);
    }
  };

  const inputClass =
    'bg-transparent border-0 border-b border-border text-text placeholder:text-text-muted px-0 py-3 font-body text-base w-full focus:outline-none focus:border-accent transition-colors duration-200 disabled:opacity-50 aria-[invalid=true]:border-red-500 [color-scheme:light] dark:[color-scheme:dark]';
  const props = (id: keyof Datos) => ({
    id: `alq-${id}`,
    name: id,
    'aria-invalid': errorDe(id) ? true : undefined,
    'aria-describedby': errorDe(id) ? `alq-${id}-error` : undefined,
    onBlur: () => setTocados((prev) => new Set(prev).add(id)),
    disabled: enviando,
  });

  // Línea del día de cada aula: libre, clase, reservado o en revisión
  const linea = (ocupado: Disponibilidad['aulas'][number]['ocupado']) => {
    if (apertura === null || cierre === null) return null;
    const total = cierre - apertura;
    return (
      <div className="relative h-3 overflow-hidden bg-emerald-500/20" aria-hidden="true">
        {ocupado.map((f, i) => (
          <span
            key={i}
            className={`absolute inset-y-0 ${f.motivo === 'Clase' ? 'bg-accent' : f.motivo === 'Reservado' ? 'bg-red-500/70' : 'bg-amber-500/70'}`}
            style={{ left: `${((aMinutos(f.horaInicio) - apertura) / total) * 100}%`, width: `${((aMinutos(f.horaFin) - aMinutos(f.horaInicio)) / total) * 100}%` }}
          />
        ))}
      </div>
    );
  };

  return (
    <section id="alquiler" aria-labelledby="titulo-alquiler" className="relative py-28 bg-surface-alt overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-30 pointer-events-none" />

      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-16 items-start">
          {/* Info */}
          <div className="lg:sticky lg:top-28">
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(07) {t('Espacio profesional')}</span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(2.8rem,7vw,6.5rem)] text-text mt-4 mb-6">
              <span id="titulo-alquiler">
                <MaskLine>{t('¿Necesitas')}</MaskLine>
                <MaskLine delay={120}>{t('un espacio')}</MaskLine>
                <MaskLine delay={240}><span className="text-blush">{t('para bailar?')}</span></MaskLine>
              </span>
            </Reveal>
            <Reveal delay={150}>
              <p className="font-body text-text-soft text-lg leading-relaxed mb-8 max-w-lg">
                {t('Alquila nuestras aulas por horas para ensayos, audiciones, rodajes o clases particulares. Elige la fecha y mira qué franjas están libres.')}
              </p>
              <ol className="border-t border-border max-w-lg">
                {['Elige sede, fecha y aula', 'Escoge una franja libre', 'Deja tus datos de contacto', 'La sede aprueba o rechaza y te avisa'].map((paso, i) => (
                  <li key={paso} className="flex items-baseline gap-4 py-3 border-b border-border">
                    <span className="font-condensed text-xs text-text-muted">({String(i + 1).padStart(2, '0')})</span>
                    <span className="font-condensed text-sm uppercase tracking-wider text-text-soft">{t(paso)}</span>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>

          {/* Formulario */}
          <Reveal delay={100}>
            <div className="bg-surface border border-border p-8 md:p-10">
              <h3 className="display text-3xl text-text mb-2">{t('Solicita tu espacio')}</h3>
              <p className="mb-8 font-body text-xs text-text-muted">{t('Todos los campos con * son obligatorios.')}</p>

              {resultado && (
                <div role="status" className="mb-8 border border-emerald-500/40 bg-emerald-500/10 p-4 font-body text-sm text-emerald-800 dark:text-emerald-200">
                  <p className="font-semibold">{t('Recibimos tu solicitud n.º {n}.', { n: resultado.idSolicitud })}</p>
                  <p className="mt-1">
                    {resultado.correoEnviado
                      ? t('Te enviamos un correo de confirmación. La sede revisará la franja y te responderá.')
                      : t('La sede revisará la franja y te contactará al correo o teléfono que dejaste.')}
                  </p>
                </div>
              )}

              <form onSubmit={enviar} noValidate className="flex flex-col gap-8">
                {/* 1. Espacio */}
                <fieldset className="flex flex-col gap-6">
                  <legend className="mb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('1. Espacio y horario')}</legend>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Campo id="idSede" etiqueta="Sede" error={errorDe('idSede')}>
                      <select {...props('idSede')} className={inputClass + ' cursor-pointer'} value={datos.idSede} onChange={(e) => cambiar('idSede', e.target.value)}>
                        <option value="" className="bg-surface">{t('Selecciona una sede')}</option>
                        {sedes.map((s) => <option key={s.idSede} value={s.idSede} className="bg-surface">{s.nombre}</option>)}
                      </select>
                    </Campo>
                    <Campo id="fecha" etiqueta="Fecha" error={errorDe('fecha')}>
                      <input {...props('fecha')} type="date" min={hoyIso()} className={inputClass} value={datos.fecha} onChange={(e) => cambiar('fecha', e.target.value)} />
                    </Campo>
                  </div>

                  {/* Disponibilidad de las aulas en la fecha elegida */}
                  <div aria-live="polite">
                    {!datos.idSede || !datos.fecha ? (
                      <p className="font-body text-sm text-text-muted">{t('Elige sede y fecha para ver las aulas y sus horarios.')}</p>
                    ) : cargandoDisp ? (
                      <div className="esqueleto h-24" aria-label={t('Cargando disponibilidad')} />
                    ) : errorDisp ? (
                      <p role="alert" className="font-body text-sm text-red-600 dark:text-red-300">{errorDisp}</p>
                    ) : disp && !disp.abierta ? (
                      <p className="font-body text-sm text-text-soft">{t('La sede no tiene horario de atención registrado para ese día.')}</p>
                    ) : disp && disp.aulas.length === 0 ? (
                      <p className="font-body text-sm text-text-soft">{t('Esta sede no tiene aulas disponibles.')}</p>
                    ) : disp ? (
                      <fieldset>
                        <legend className={labelClass}>
                          {t('Aula')} <span className="text-red-500" aria-hidden="true">*</span>
                          <span className="ml-2 normal-case tracking-normal text-text-muted">{t('Atención de {a} a {c}', { a: disp.horaApertura ?? '', c: disp.horaCierre ?? '' })}</span>
                        </legend>
                        <div className="mt-2 grid gap-3">
                          {disp.aulas.map((a) => {
                            const elegida = String(a.idAula) === datos.idAula;
                            return (
                              <label key={a.idAula} className={`cursor-pointer border p-3 transition-colors focus-within:outline-2 focus-within:outline-accent ${elegida ? 'border-accent bg-accent/5' : 'border-border hover:border-accent/50'}`}>
                                <span className="mb-2 flex items-center justify-between gap-3">
                                  <span className="flex items-center gap-2 font-condensed text-sm uppercase tracking-wider text-text">
                                    <input type="radio" name="idAula" value={a.idAula} checked={elegida} onChange={() => cambiar('idAula', String(a.idAula))} disabled={enviando} className="accent-[var(--color-accent)]" />
                                    {a.nombre}
                                  </span>
                                  <span className="font-body text-xs text-text-muted">{t('Hasta {n} personas', { n: a.capacidad })}</span>
                                </span>
                                {linea(a.ocupado)}
                                <span className="mt-1 flex justify-between font-body text-[11px] tabular-nums text-text-muted" aria-hidden="true">
                                  <span>{disp.horaApertura}</span>
                                  <span>{disp.horaCierre}</span>
                                </span>
                                <span className="mt-2 block font-body text-xs text-text-soft">
                                  {a.ocupado.length === 0
                                    ? t('Libre todo el día')
                                    : `${t('Ocupado')}: ${a.ocupado.map((f) => `${f.horaInicio}–${f.horaFin} (${t(f.motivo)})`).join(' · ')}`}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                        <p className="mt-2 flex flex-wrap gap-4 font-body text-xs text-text-muted">
                          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-emerald-500/20" aria-hidden="true" />{t('Libre')}</span>
                          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-accent" aria-hidden="true" />{t('Clase')}</span>
                          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-red-500/70" aria-hidden="true" />{t('Reservado')}</span>
                          <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 bg-amber-500/70" aria-hidden="true" />{t('En revisión')}</span>
                        </p>
                        {errorDe('idAula') && <p className="mt-1 font-body text-xs font-medium text-red-600 dark:text-red-300">{t(errorDe('idAula')!)}</p>}
                      </fieldset>
                    ) : null}
                  </div>

                  <div className="grid sm:grid-cols-3 gap-6">
                    <Campo id="horaInicio" etiqueta="Desde" error={errorDe('horaInicio')}>
                      <select {...props('horaInicio')} disabled={enviando || !aula} className={inputClass + ' cursor-pointer'} value={datos.horaInicio} onChange={(e) => cambiar('horaInicio', e.target.value)}>
                        <option value="" className="bg-surface">{aula ? t('Hora') : t('Elige un aula')}</option>
                        {horasInicio.map((m) => (
                          <option key={m} value={aHora(m)} disabled={ocupadoEn(m)} className="bg-surface">
                            {aHora(m)}{ocupadoEn(m) ? ` · ${t('ocupado')}` : ''}
                          </option>
                        ))}
                      </select>
                    </Campo>
                    <Campo id="horaFin" etiqueta="Hasta" error={errorDe('horaFin')}>
                      <select {...props('horaFin')} disabled={enviando || !datos.horaInicio} className={inputClass + ' cursor-pointer'} value={datos.horaFin} onChange={(e) => cambiar('horaFin', e.target.value)}>
                        <option value="" className="bg-surface">{t('Hora')}</option>
                        {horasFin.map((m) => <option key={m} value={aHora(m)} className="bg-surface">{aHora(m)}</option>)}
                      </select>
                    </Campo>
                    <Campo id="personas" etiqueta="Personas" error={errorDe('personas')} ayuda={aula ? `Máximo ${aula.capacidad}` : undefined}>
                      <input {...props('personas')} type="number" inputMode="numeric" min={1} max={aula?.capacidad} placeholder={t('Ej: 10')} className={inputClass} value={datos.personas} onChange={(e) => cambiar('personas', e.target.value)} />
                    </Campo>
                  </div>
                </fieldset>

                {/* 2. Contacto */}
                <fieldset className="flex flex-col gap-6">
                  <legend className="mb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent">{t('2. Tus datos de contacto')}</legend>
                  <Campo id="nombre" etiqueta="Nombre completo" error={errorDe('nombre')}>
                    <input {...props('nombre')} autoComplete="name" maxLength={100} placeholder={t('Tu nombre')} className={inputClass} value={datos.nombre} onChange={(e) => cambiar('nombre', e.target.value)} />
                  </Campo>
                  <div className="grid sm:grid-cols-2 gap-6">
                    <Campo id="email" etiqueta="Correo electrónico" error={errorDe('email')}>
                      <input {...props('email')} type="email" autoComplete="email" maxLength={100} placeholder={t('tu@correo.com')} className={inputClass} value={datos.email} onChange={(e) => cambiar('email', e.target.value)} />
                    </Campo>
                    <Campo id="telefono" etiqueta="Teléfono" error={errorDe('telefono')}>
                      <input {...props('telefono')} type="tel" inputMode="tel" autoComplete="tel" placeholder="3001234567" className={inputClass} value={datos.telefono} onChange={(e) => cambiar('telefono', e.target.value)} />
                    </Campo>
                  </div>
                  <div>
                    <label htmlFor="alq-mensaje" className={labelClass}>{t('Mensaje adicional')}</label>
                    <textarea
                      id="alq-mensaje"
                      name="mensaje"
                      className={inputClass + ' resize-none'}
                      rows={3}
                      maxLength={300}
                      disabled={enviando}
                      placeholder={t('Cuéntanos el motivo del alquiler, estilo de danza, equipamiento especial, etc.')}
                      value={datos.mensaje}
                      onChange={(e) => cambiar('mensaje', e.target.value)}
                    />
                    <p className="mt-1 text-right font-body text-xs text-text-muted">{datos.mensaje.length}/300</p>
                  </div>
                </fieldset>

                {errorServidor && (
                  <p role="alert" className="border border-red-500/30 bg-red-500/10 p-3 font-body text-sm text-red-700 dark:text-red-300">{errorServidor}</p>
                )}

                <Button type="submit" size="lg" fullWidth disabled={enviando}>
                  {enviando ? t('Enviando…') : t('Enviar solicitud')}
                </Button>
              </form>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
