import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

const benefits = [
  { title: 'Reduce el estrés', description: 'El movimiento libera endorfinas y cortisol disminuye hasta un 40% después de bailar.' },
  { title: 'Mejora la concentración', description: 'Memorizar rutinas y coordinar cuerpo con música entrena la mente tanto como el gimnasio.' },
  { title: 'Fortalece la confianza', description: 'Superar retos físicos y artísticos construye una autoestima sólida y duradera.' },
  { title: 'Conecta con otros', description: 'La danza es un idioma universal. Aquí encontrarás tu tribu y vínculos auténticos.' },
];

export default function DanceWellness() {
  const { t } = useIdioma();
  return (
    <section id="bienestar" className="relative py-28 bg-page overflow-hidden">
      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="grid lg:grid-cols-[0.9fr_1.1fr] gap-16 items-start">
          {/* Imagen */}
          <Reveal className="relative order-2 lg:order-1 lg:sticky lg:top-28">
            <div className="relative max-w-md mx-auto lg:mx-0">
              <img
                src="https://images.unsplash.com/photo-1770739723922-a4fd700bdb3b?w=700&h=900&fit=crop&auto=format"
                alt={t('Bailarina expresando emoción bajo luz de neón')}
                loading="lazy"
                className="block w-full aspect-[3/4] object-cover object-center grayscale-[35%] transition-all duration-700 hover:grayscale-0"
              />
              <div className="absolute inset-0 bg-purple-900/35 mix-blend-multiply pointer-events-none" />
              <span className="pointer-events-none absolute -left-3 -top-3 h-10 w-10 border-l border-t border-accent" />
              <span className="pointer-events-none absolute -right-3 -bottom-3 h-10 w-10 border-r border-b border-accent" />
              <div className="absolute bottom-0 left-0 bg-page/90 backdrop-blur px-6 py-5 border-t border-r border-border">
                <div className="display text-5xl text-blush">(40%)</div>
                <div className="font-condensed text-xs uppercase tracking-wider text-text-soft mt-1">
                  {t('Reducción del estrés')}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Contenido */}
          <div className="order-1 lg:order-2">
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">
                (04) {t('Danza y bienestar')}
              </span>
            </Reveal>
            {/* Jerarquía: frase corta pequeña, la idea central muy grande y el remate mediano */}
            <Reveal variant="mask" as="h2" className="mt-5 mb-10 text-text">
              <MaskLine>
                <span className="block font-condensed text-[clamp(1.4rem,2.6vw,2.25rem)] font-semibold uppercase tracking-[0.3em] text-text-soft">
                  {t('El cuerpo')}
                </span>
              </MaskLine>
              <MaskLine delay={120}>
                <span className="display block text-[clamp(3.6rem,9vw,8.5rem)] leading-[0.88] text-blush">{t('que baila')}</span>
              </MaskLine>
              <MaskLine delay={240}>
                <span className="mt-3 flex items-center gap-4">
                  <span className="h-px w-12 bg-accent md:w-20" aria-hidden="true" />
                  <span className="display text-[clamp(2rem,4.2vw,3.75rem)] leading-none">{t('no miente')}</span>
                </span>
              </MaskLine>
            </Reveal>
            <Reveal delay={150}>
              <p className="font-body text-text-soft text-lg leading-relaxed mb-10 max-w-xl">
                {t('La ciencia lo confirma: bailar mejora la salud mental, fortalece vínculos sociales y desarrolla inteligencia emocional. Más allá de la técnica, la danza urbana es una herramienta de transformación personal que actúa desde adentro.')}
              </p>
            </Reveal>

            <ul className="border-t border-border mb-10">
              {benefits.map((b, i) => (
                <Reveal as="li" key={b.title} delay={i * 80} className="group border-b border-border">
                  <div className="grid sm:grid-cols-[60px_1fr] gap-2 sm:gap-6 py-5 transition-colors hover:bg-surface-alt px-2">
                    <span className="font-condensed text-sm text-text-muted pt-1">({String(i + 1).padStart(2, '0')})</span>
                    <div>
                      <h4 className="font-condensed font-bold uppercase text-xl tracking-wider text-text group-hover:text-accent transition-colors">
                        {t(b.title)}
                      </h4>
                      <p className="font-body text-sm text-text-soft leading-relaxed mt-1">{t(b.description)}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </ul>

            <Button size="lg" onClick={() => document.querySelector('#alquiler')?.scrollIntoView({ behavior: 'smooth' })}>
              {t('Descubre cómo')}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}