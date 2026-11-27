import { useEffect, useState } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import { sitioPublico, type SedePublica } from '../servicios/sitioPublico';

/*
 * Cierre de «Nuestros estilos»: los horarios de cada estilo dependen de la sede.
 * Inspirado en el «CTA with vertical marquee» de 21st.dev, adaptado a la marca:
 * a la izquierda la acción y el horario de atención real de cada sede (tabla sede);
 * a la derecha, los estilos pasan en dos columnas verticales en sentidos opuestos.
 */

const irA = (selector: string) => document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });

function ColumnaMarquesina({ estilos, inversa = false }: { estilos: string[]; inversa?: boolean }) {
  // Cuatro copias: la mitad siempre cubre el alto de la columna y el ciclo es continuo
  const lista = [...estilos, ...estilos, ...estilos, ...estilos];
  return (
    <div className="marquesina-y overflow-hidden" aria-hidden="true">
      <ul className={`marquesina-y-pista flex flex-col gap-3 ${inversa ? 'marquesina-y-inversa' : ''}`}>
        {lista.map((nombre, i) => (
          <li
            key={`${nombre}-${i}`}
            className={`display whitespace-nowrap text-[clamp(2.5rem,5vw,4.25rem)] leading-[0.95] ${
              (i + (inversa ? 1 : 0)) % 2 === 0 ? 'text-text' : 'stroke-text'
            }`}
          >
            {nombre}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function HorariosPorSede({ estilos }: { estilos: string[] }) {
  const { t } = useIdioma();
  const [sedes, setSedes] = useState<SedePublica[] | null>(null);

  useEffect(() => {
    sitioPublico.sedes().then(setSedes).catch(() => setSedes([]));
  }, []);

  const mitad = Math.ceil(estilos.length / 2);

  return (
    <Reveal as="div" delay={100} className="mt-16">
      <section
        aria-labelledby="titulo-horarios-sede"
        className="grain relative grid overflow-hidden rounded-3xl border border-border bg-surface-alt lg:grid-cols-[1.1fr_1fr]"
      >
        {/* Acción */}
        <div className="relative z-10 flex flex-col gap-8 p-8 md:p-12">
          <div>
            <span className="font-condensed text-sm font-semibold uppercase tracking-[0.25em] text-accent">{t('Horarios')}</span>
            <h3 id="titulo-horarios-sede" className="display mt-3 text-[clamp(2.5rem,5.5vw,4.5rem)] text-text">
              <MaskLine>{t('Cada sede,')}</MaskLine>
              <MaskLine delay={120}><span className="text-blush">{t('su agenda')}</span></MaskLine>
            </h3>
            <p className="mt-4 max-w-md font-body text-text-soft">
              {t('Los grupos de cada estilo se abren por sede y nivel. Mira la tuya y aparta tu cupo.')}
            </p>
          </div>

          {/* Horario de atención real de cada sede */}
          <ul className="divide-y divide-border border-y border-border">
            {sedes === null
              ? [0, 1].map((i) => <li key={i} className="py-4"><div className="esqueleto h-10" /></li>)
              : sedes.map((sede) => (
                  <li key={sede.idSede}>
                    <button
                      type="button"
                      onClick={() => irA('#sedes')}
                      className="group flex w-full items-center justify-between gap-4 py-4 text-left transition-colors hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
                    >
                      <span>
                        <span className="block font-condensed text-lg font-bold uppercase tracking-wider text-text group-hover:text-accent">
                          {sede.nombre}
                        </span>
                        <span className="block font-body text-sm text-text-muted tabular-nums">
                          {sede.horaApertura && sede.horaCierre
                            ? t('Todos los días · {a} – {c}', { a: sede.horaApertura, c: sede.horaCierre })
                            : t('Horario en la sede')}
                        </span>
                      </span>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-5 w-5 shrink-0 text-text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </li>
                ))}
          </ul>

          <div className="flex flex-wrap gap-3">
            <Button size="md" onClick={() => irA('#sedes')}>{t('Ver sedes y horarios')}</Button>
            <Button size="md" variant="outline" onClick={() => irA('#preinscripcion')}>{t('Preinscríbete')}</Button>
          </div>
        </div>

        {/* Marquesina vertical de estilos (decorativa) */}
        <div className="relative hidden min-h-[26rem] grid-cols-2 gap-6 border-t border-border px-8 lg:grid lg:border-l lg:border-t-0">
          <ColumnaMarquesina estilos={estilos.slice(0, mitad)} />
          <ColumnaMarquesina estilos={[...estilos.slice(mitad), estilos[0]]} inversa />
        </div>

        {/* En móvil: una franja horizontal con los estilos */}
        <div className="marquesina-x overflow-hidden border-t border-border py-4 lg:hidden" aria-hidden="true">
          <ul className="marquesina-x-pista flex w-max gap-8">
            {[...estilos, ...estilos].map((nombre, i) => (
              <li key={`${nombre}-${i}`} className={`display whitespace-nowrap text-4xl ${i % 2 === 0 ? 'text-text' : 'stroke-text'}`}>
                {nombre}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </Reveal>
  );
}
