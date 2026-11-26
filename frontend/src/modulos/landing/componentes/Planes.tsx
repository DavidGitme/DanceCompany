import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

const plans = [
  {
    id: 'monthly',
    name: 'MENSUALIDAD',
    tagline: 'Flexibilidad total',
    description:
      'Perfecto para quienes quieren comenzar sin compromisos. Accede a todas las clases del nivel asignado con libertad mes a mes.',
    benefits: [
      'Acceso a todas las clases de tu nivel',
      'Evaluación inicial gratuita',
      'Acceso a la comunidad F&A',
      'Descuento en eventos y batallas',
      'Clases de recuperación disponibles',
    ],
    recommended: false,
    cta: 'Empieza ya',
  },
  {
    id: 'annual',
    name: 'ANUAL',
    tagline: 'El plan del comprometido',
    description:
      'Para quien sabe que la danza es su camino. El mejor valor, con acceso completo, prioridad en inscripciones y beneficios exclusivos.',
    benefits: [
      'Todo lo del plan mensual',
      'Prioridad en inscripción a talleres especiales',
      'Acceso a masterclasses de invitados',
      'Kit de bienvenida F&A exclusivo',
      'Descuento en alquiler de aulas',
      '2 meses gratis (vs mensual)',
    ],
    recommended: true,
    cta: 'Elige este plan',
  },
];

export default function Plans() {
  const { t } = useIdioma();
  return (
    <section id="planes" className="relative py-20 bg-surface-alt overflow-hidden">
      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="mb-10 grid lg:grid-cols-[1.4fr_1fr] gap-6 items-end">
          <div>
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(05) {t('Membresías')}</span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(2.75rem,7vw,6rem)] text-text mt-3">
              <MaskLine>{t('Elige tu')}</MaskLine>
              <MaskLine delay={150}><span className="text-blush">{t('ritmo')}</span></MaskLine>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="font-body text-text-soft text-lg leading-relaxed">
              {t('Sin excusas. Elige el plan que se adapta a tu estilo de vida y empieza a bailar hoy.')}
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-5">
          {plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 120}>
              <div
                className={[
                  'relative flex h-full flex-col p-6 md:p-8 border transition-all duration-500 hover:-translate-y-1',
                  plan.recommended ? 'border-accent bg-surface' : 'border-border bg-page hover:border-accent/60',
                ].join(' ')}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="font-condensed text-sm text-text-muted">({String(i + 1).padStart(2, '0')})</span>
                  {plan.recommended && (
                    <span className="bg-accent text-on-accent font-condensed font-bold text-xs uppercase tracking-widest px-3 py-1">
                      {t('Recomendado')}
                    </span>
                  )}
                </div>

                <div className="font-condensed text-sm uppercase tracking-[0.25em] text-accent mb-2">{t(plan.tagline)}</div>
                <h3 className="display text-5xl md:text-6xl text-text mb-3">{t(plan.name)}</h3>
                <p className="font-body text-base text-text-soft leading-relaxed mb-5">{t(plan.description)}</p>

                <ul className="grid sm:grid-cols-2 sm:gap-x-6 mb-6 flex-1 content-start border-t border-border">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-3 py-2.5 border-b border-border">
                      <span className="font-condensed text-accent leading-6" aria-hidden="true">+</span>
                      <span className="font-body text-sm text-text-soft">{t(b)}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="md"
                  variant={plan.recommended ? 'primary' : 'outline'}
                  fullWidth
                  onClick={() => document.querySelector('#alquiler')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {t(plan.cta)}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-5 font-body text-xs text-text-soft">
          {t('Consulta disponibilidad y condiciones en cada sede. Los planes incluyen acceso a clases regulares de lunes a sábado.')}
        </p>
      </div>
    </section>
  );
}