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
        <div className="mb-10">
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
          <>
            <ul className={`grid items-stretch gap-5 ${estado.planes.length >= 3 ? 'lg:grid-cols-3' : 'md:grid-cols-2'}`}>
              {estado.planes.map((plan, i) => {
                const porMes = Number(plan.valor) / plan.meses;
                // La tarjeta central usa el violeta de la marca (como .tarjeta-estilo-morada); no es una recomendación
                const destacada = estado.planes.length >= 3 && i === 1;
                const suave = destacada ? 'text-white/75' : 'text-text-soft';
                const tenue = destacada ? 'text-white/60' : 'text-text-muted';
                const linea = destacada ? 'border-white/20' : 'border-border';
                return (
                  <Reveal key={plan.idPlan} delay={i * 120} as="li" className="h-full">
                    <article
                      aria-labelledby={`plan-${plan.idPlan}`}
                      className={`group relative flex h-full flex-col overflow-hidden rounded-[1.75rem] p-7 transition-[translate,box-shadow] duration-500 hover:-translate-y-1.5 md:p-8 ${
                        destacada
                          ? 'tarjeta-estilo-morada grain text-white shadow-[0_30px_60px_-30px_rgba(46,34,64,0.7)]'
                          : 'border border-border bg-page text-text shadow-[0_1px_2px_rgba(46,34,64,0.06)] hover:shadow-[0_30px_50px_-30px_rgba(46,34,64,0.45)]'
                      }`}
                    >
                      <div className="relative flex items-center justify-between gap-3">
                        <span className={`font-condensed text-xs font-semibold uppercase tracking-[0.25em] ${tenue}`}>
                          {t('Plan')} {String(i + 1).padStart(2, '0')}
                        </span>
                        <span className={`rounded-full border px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-wider ${destacada ? 'border-white/30 text-white' : 'border-border text-text-soft'}`}>
                          {plan.meses === 1 ? t('1 mes') : t('{n} meses', { n: plan.meses })}
                        </span>
                      </div>

                      <h3 id={`plan-${plan.idPlan}`} className="display relative mt-6 text-5xl md:text-6xl">{t(plan.nombre)}</h3>
                      {plan.descripcion && <p className={`relative mt-2 font-body text-sm ${suave}`}>{t(plan.descripcion)}</p>}

                      <p className="relative mt-8 flex items-end gap-2">
                        <span className="display text-5xl leading-none tabular-nums md:text-[3.5rem]">{pesosCop(plan.valor)}</span>
                      </p>
                      <p className={`relative mt-2 font-body text-sm tabular-nums ${suave}`}>
                        {plan.meses === 1 ? t('Valor total') : t('Equivale a {v} al mes', { v: pesosCop(porMes) })}
                      </p>

                      {/* Meses cubiertos sobre un año: compara los planes de un vistazo */}
                      <div className="relative mt-7" role="img" aria-label={t('Cubre {n} de 12 meses', { n: plan.meses })}>
                        <div className="grid grid-cols-12 gap-1">
                          {Array.from({ length: 12 }, (_, m) => (
                            <span
                              key={m}
                              className={`h-2 rounded-full transition-colors duration-500 ${
                                m < plan.meses ? (destacada ? 'bg-white' : 'bg-accent') : destacada ? 'bg-white/20' : 'bg-border'
                              }`}
                            />
                          ))}
                        </div>
                        <p className={`mt-2 font-condensed text-[11px] uppercase tracking-[0.2em] ${tenue}`}>{t('Meses cubiertos en el año')}</p>
                      </div>

                      <ul className={`relative mt-7 flex flex-1 flex-col gap-3 border-t pt-6 ${linea}`}>
                        {[
                          t(formaDePago(plan.meses)),
                          t('Clases regulares del nivel asignado'),
                          t('Inscripción y cupo confirmados en la sede'),
                        ].map((texto) => (
                          <li key={texto} className="flex items-start gap-3 font-body text-sm">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`mt-px h-5 w-5 shrink-0 ${destacada ? 'text-white' : 'text-accent'}`} aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                            <span className={destacada ? 'text-white' : 'text-text'}>{texto}</span>
                          </li>
                        ))}
                      </ul>

                      <Button
                        size="md"
                        variant={destacada ? 'secondary' : 'outline'}
                        fullWidth
                        className={`relative mt-8 ${destacada ? 'bg-white! text-purple-900! hover:bg-purple-50!' : ''}`}
                        onClick={() => irA('#preinscripcion')}
                      >
                        {t('Quiero este plan')}
                      </Button>
                    </article>
                  </Reveal>
                );
              })}
            </ul>
            <p className="mt-6 max-w-2xl font-body text-sm text-text-muted">
              {t('Todos los planes tienen el mismo valor mensual; cambia cuántos meses pagas de una vez. Los precios están en pesos colombianos.')}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
