import { useEffect, useState } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import { pesosCop, sitioPublico, type PlanPublico } from '../servicios/sitioPublico';

/*
 * Planes de la tabla `plan` (bd/07_sitio_publico.sql). El valor es el total del plan:
 * semestral y anual equivalen a la mensualidad por el número de meses (sin descuento
 * definido por la academia). Solo se muestra lo que está en la base: precio, duración
 * y forma de pago; no se anuncian beneficios que la academia no haya definido.
 */

type Estado = { tipo: 'cargando' } | { tipo: 'listo'; planes: PlanPublico[] } | { tipo: 'error' };

const formaDePago = (meses: number) => (meses === 1 ? 'Pago mes a mes' : `Un solo pago por ${meses} meses`);

export default function Plans() {
  const { t } = useIdioma();
  const [estado, setEstado] = useState<Estado>({ tipo: 'cargando' });

  useEffect(() => {
    sitioPublico
      .planes()
      .then((planes) => setEstado({ tipo: 'listo', planes }))
      .catch(() => setEstado({ tipo: 'error' }));
  }, []);

  const irA = (selector: string) => document.querySelector(selector)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="planes" aria-labelledby="titulo-planes" className="relative py-20 bg-surface-alt overflow-hidden">
      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="mb-10 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-end">
          <div>
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(05) {t('Planes')}</span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(2.75rem,7vw,6rem)] text-text mt-3">
              <span id="titulo-planes">
                <MaskLine>{t('Elige tu')}</MaskLine>
                <MaskLine delay={150}><span className="text-blush">{t('plan')}</span></MaskLine>
              </span>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="font-body text-text-soft text-lg leading-relaxed">
              {t('Mismas clases, distinta forma de pago. Compara el valor total y lo que equivale por mes.')}
            </p>
          </Reveal>
        </div>

        {estado.tipo === 'cargando' && (
          <div className="grid gap-5 md:grid-cols-3" aria-label={t('Cargando planes')}>
            {[0, 1, 2].map((i) => <div key={i} className="esqueleto h-72" />)}
          </div>
        )}

        {estado.tipo === 'error' && (
          <p role="status" className="border border-border bg-page p-6 font-body text-text-soft">
            {t('No pudimos cargar los planes en este momento. Consulta los valores en tu sede.')}
          </p>
        )}

        {estado.tipo === 'listo' && estado.planes.length === 0 && (
          <p className="border border-border bg-page p-6 font-body text-text-soft">{t('La academia todavía no ha publicado planes.')}</p>
        )}

        {estado.tipo === 'listo' && estado.planes.length > 0 && (
          <ul className={`grid gap-5 ${estado.planes.length >= 3 ? 'md:grid-cols-3' : 'md:grid-cols-2'}`}>
            {estado.planes.map((plan, i) => {
              const porMes = Number(plan.valor) / plan.meses;
              return (
                <Reveal key={plan.idPlan} delay={i * 120} as="li">
                  <article
                    aria-labelledby={`plan-${plan.idPlan}`}
                    className="relative flex h-full flex-col border border-border bg-page p-6 transition-all duration-500 hover:-translate-y-1 hover:border-accent/60 md:p-8"
                  >
                    <span className="font-condensed text-sm text-text-muted" aria-hidden="true">({String(i + 1).padStart(2, '0')})</span>
                    <h3 id={`plan-${plan.idPlan}`} className="display mt-3 text-5xl text-text md:text-6xl">{t(plan.nombre)}</h3>
                    {plan.descripcion && <p className="mt-2 font-body text-sm text-text-soft">{t(plan.descripcion)}</p>}

                    <p className="mt-6">
                      <span className="display text-4xl text-text tabular-nums">{pesosCop(plan.valor)}</span>
                      <span className="block font-condensed text-xs uppercase tracking-[0.2em] text-text-muted">{t('Valor total')}</span>
                    </p>

                    {/* Mismas filas en todos los planes para poder compararlos */}
                    <dl className="mt-6 flex-1 border-t border-border">
                      {[
                        ['Duración', plan.meses === 1 ? t('1 mes') : t('{n} meses', { n: plan.meses })],
                        ['Equivale por mes', pesosCop(porMes)],
                        ['Forma de pago', t(formaDePago(plan.meses))],
                        ['Incluye', t('Clases regulares del nivel asignado')],
                      ].map(([etiqueta, valor]) => (
                        <div key={etiqueta} className="flex items-baseline justify-between gap-4 border-b border-border py-2.5">
                          <dt className="font-condensed text-xs uppercase tracking-wider text-text-muted">{t(etiqueta)}</dt>
                          <dd className="text-right font-body text-sm text-text tabular-nums">{valor}</dd>
                        </div>
                      ))}
                    </dl>

                    <Button size="md" variant={i === 0 ? 'primary' : 'outline'} fullWidth className="mt-6" onClick={() => irA('#preinscripcion')}>
                      {t('Quiero este plan')}
                    </Button>
                  </article>
                </Reveal>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
