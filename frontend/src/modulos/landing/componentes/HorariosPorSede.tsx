import { useEffect, useState } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import { aMinutos, sitioPublico, type SedePublica } from '../servicios/sitioPublico';

/*
 * Cierre de «Nuestros estilos»: los horarios dependen de la sede.
 * Estructura tomada del patrón «schedule / timeline card» de 21st.dev, con la marca:
 * a la izquierda la acción; a la derecha una agenda por sede con su franja de atención
 * real (tabla sede: hora_apertura / hora_cierre) sobre una línea del día y una marca de
 * «ahora» calculada con la hora de Colombia. Sin animaciones en bucle.
 */

const irA = (selector: string) => document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });

// Rango visible de la línea del día
const INICIO = 6 * 60;
const FIN = 23 * 60;
const MARCAS = [6, 9, 12, 15, 18, 21];
const posicion = (minutos: number) => `${((Math.min(Math.max(minutos, INICIO), FIN) - INICIO) / (FIN - INICIO)) * 100}%`;

// Minutos transcurridos del día en Colombia (la academia está en Antioquia)
function minutosEnColombia() {
  const partes = new Intl.DateTimeFormat('es-CO', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const valor = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? 0);
  return valor('hour') * 60 + valor('minute');
}

function useAhora() {
  const [ahora, setAhora] = useState(minutosEnColombia);
  useEffect(() => {
    const id = window.setInterval(() => setAhora(minutosEnColombia()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return ahora;
}

const relojIcono = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

function FilaSede({ sede, ahora, indice }: { sede: SedePublica; ahora: number; indice: number }) {
  const { t } = useIdioma();
  const tieneHorario = Boolean(sede.horaApertura && sede.horaCierre);
  const abre = tieneHorario ? aMinutos(sede.horaApertura!) : 0;
  const cierra = tieneHorario ? aMinutos(sede.horaCierre!) : 0;
  const abierta = tieneHorario && ahora >= abre && ahora < cierra;
  const ahoraVisible = ahora >= INICIO && ahora <= FIN;

  return (
    <li>
      <button
        type="button"
        onClick={() => irA('#sedes')}
        className="group block w-full rounded-2xl border border-border bg-page p-5 text-left transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-[0_18px_40px_-28px_rgba(46,34,64,0.45)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent md:p-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="font-condensed text-xs font-semibold tabular-nums tracking-[0.2em] text-text-muted">
              {String(indice + 1).padStart(2, '0')}
            </span>
            <span className="mt-1 block font-display text-3xl uppercase leading-none text-text">{sede.nombre}</span>
            {sede.direccion && <span className="mt-1.5 block truncate font-body text-sm text-text-muted">{sede.direccion}</span>}
          </div>
          {tieneHorario && (
            <span
              className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-wider ${
                abierta ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border text-text-muted'
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${abierta ? 'bg-accent' : 'bg-text-muted/60'}`} aria-hidden="true" />
              {t(abierta ? 'Abierta ahora' : 'Cerrada ahora')}
            </span>
          )}
        </div>

        {tieneHorario ? (
          <div className="mt-6">
            {/* Línea del día: la franja es el horario de atención; la marca vertical es la hora actual */}
            <div className="relative h-9 rounded-lg bg-surface-alt" role="img" aria-label={t('Atiende de {a} a {c}', { a: sede.horaApertura!, c: sede.horaCierre! })}>
              {MARCAS.map((h) => (
                <span key={h} className="absolute inset-y-0 w-px bg-border" style={{ left: posicion(h * 60) }} aria-hidden="true" />
              ))}
              <span
                className="absolute inset-y-1.5 rounded-md border border-accent/50 bg-accent/20 transition-colors group-hover:bg-accent/30"
                style={{ left: posicion(abre), right: `calc(100% - ${posicion(cierra)})` }}
              />
              {ahoraVisible && (
                <span className="absolute -inset-y-1 w-0.5 rounded-full bg-text" style={{ left: posicion(ahora) }} aria-hidden="true">
                  <span className="absolute -top-1 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full bg-text" />
                </span>
              )}
            </div>
            <div className="relative mt-2 h-4 font-condensed text-[11px] tabular-nums tracking-wider text-text-muted" aria-hidden="true">
              {MARCAS.map((h) => (
                <span key={h} className="absolute -translate-x-1/2" style={{ left: posicion(h * 60) }}>
                  {String(h).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-4 border-t border-border pt-4">
          <span className="inline-flex items-center gap-2 font-body text-sm text-text-soft tabular-nums">
            {relojIcono}
            {tieneHorario
              ? t('Todos los días · {a} – {c}', { a: sede.horaApertura!, c: sede.horaCierre! })
              : t('Horario en la sede')}
          </span>
          <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap font-condensed text-sm font-semibold uppercase tracking-wider text-accent">
            <span className="max-sm:sr-only">{t('Ver sede')}</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </span>
        </div>
      </button>
    </li>
  );
}

export default function HorariosPorSede({ estilos }: { estilos: string[] }) {
  const { t } = useIdioma();
  const [sedes, setSedes] = useState<SedePublica[] | null>(null);
  const ahora = useAhora();

  useEffect(() => {
    sitioPublico.sedes().then(setSedes).catch(() => setSedes([]));
  }, []);

  return (
    <Reveal as="div" delay={100} className="mt-16">
      <section
        aria-labelledby="titulo-horarios-sede"
        className="grid gap-10 rounded-3xl border border-border bg-surface p-6 md:p-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-14 lg:p-12"
      >
        {/* Acción */}
        <div className="flex flex-col">
          <span className="inline-flex items-center gap-2 font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-accent">
            {relojIcono}
            {t('Horarios')}
          </span>
          <h3 id="titulo-horarios-sede" className="display mt-4 text-[clamp(2.5rem,5vw,4.25rem)] text-text">
            <MaskLine>{t('Cada sede,')}</MaskLine>
            <MaskLine delay={120}><span className="text-blush">{t('su agenda')}</span></MaskLine>
          </h3>
          <p className="mt-5 max-w-md font-body text-text-soft">
            {t('Los grupos de cada estilo se abren por sede y nivel. Mira la tuya y aparta tu cupo.')}
          </p>

          <ul className="mt-8 flex flex-wrap gap-2" aria-label={t('Estilos')}>
            {estilos.map((nombre) => (
              <li key={nombre} className="rounded-full border border-border px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
                {t(nombre)}
              </li>
            ))}
          </ul>

          <div className="mt-10 flex flex-wrap gap-3">
            <Button size="md" onClick={() => irA('#sedes')}>{t('Ver sedes y horarios')}</Button>
            <Button size="md" variant="outline" onClick={() => irA('#preinscripcion')}>{t('Preinscríbete')}</Button>
          </div>
        </div>

        {/* Agenda por sede */}
        <ul className="flex flex-col gap-4" aria-label={t('Horario de atención por sede')}>
          {sedes === null
            ? [0, 1].map((i) => <li key={i}><div className="esqueleto h-48 rounded-2xl" /></li>)
            : sedes.length === 0
              ? (
                <li className="rounded-2xl border border-border p-6 font-body text-text-soft">
                  {t('Consulta el horario directamente en tu sede.')}
                </li>
              )
              : sedes.map((sede, i) => <FilaSede key={sede.idSede} sede={sede} ahora={ahora} indice={i} />)}
          <li className="px-1 font-body text-xs text-text-muted">{t('Hora de Colombia. La franja marca el horario de atención; los grupos tienen su propio horario.')}</li>
        </ul>
      </section>
    </Reveal>
  );
}
