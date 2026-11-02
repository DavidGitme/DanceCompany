import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';

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
  return (
    <section id="planes" className="relative py-28 bg-surface-alt overflow-hidden">
      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="mb-16 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(04) Membresías</span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(3rem,9vw,8rem)] text-text mt-4">
              <MaskLine>Elige tu</MaskLine>
              <MaskLine delay={150}><span className="text-blush">ritmo</span></MaskLine>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="font-body text-text-soft text-lg leading-relaxed">
              Sin excusas. Elige el plan que se adapta a tu estilo de vida y empieza a bailar hoy.
            </p>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {plans.map((plan, i) => (
            <Reveal key={plan.id} delay={i * 120}>
              <div
                className={[
                  'relative flex h-full flex-col p-8 md:p-10 border transition-all duration-500 hover:-translate-y-1',
                  plan.recommended ? 'border-accent bg-surface' : 'border-border bg-page hover:border-accent/60',
                ].join(' ')}
              >
                <div className="flex items-start justify-between mb-8">
                  <span className="font-condensed text-sm text-text-muted">({String(i + 1).padStart(2, '0')})</span>
                  {plan.recommended && (
                    <span className="bg-accent text-on-accent font-condensed font-bold text-xs uppercase tracking-widest px-3 py-1">
                      Recomendado
                    </span>
                  )}
                </div>

                <div className="font-condensed text-sm uppercase tracking-[0.25em] text-accent mb-2">{plan.tagline}</div>
                <h3 className="display text-6xl md:text-7xl text-text mb-6">{plan.name}</h3>
                <p className="font-body text-base text-text-soft leading-relaxed mb-8">{plan.description}</p>

                <ul className="flex flex-col mb-10 flex-1 border-t border-border">
                  {plan.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-4 py-3 border-b border-border">
                      <span className="font-condensed text-accent leading-6" aria-hidden="true">+</span>
                      <span className="font-body text-sm text-text-soft">{b}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  size="lg"
                  variant={plan.recommended ? 'primary' : 'outline'}
                  fullWidth
                  onClick={() => document.querySelector('#alquiler')?.scrollIntoView({ behavior: 'smooth' })}
                >
                  {plan.cta}
                </Button>
              </div>
            </Reveal>
          ))}
        </div>

        <p className="mt-8 font-body text-xs text-text-soft">
          Consulta disponibilidad y condiciones en cada sede. Los planes incluyen acceso a clases regulares de lunes a sábado.
        </p>
      </div>
    </section>
  );
}