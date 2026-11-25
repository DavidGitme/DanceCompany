import { useEffect, useRef } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

const estilos = ['Breaking', 'Popping', 'Locking', 'New Style', 'Krump', 'Freestyle'];
const stats = [
  { value: '500+', label: 'Estudiantes activos' },
  { value: '8+', label: 'Años de experiencia' },
  { value: '2', label: 'Sedes en Antioquia' },
];

// Foto de fondo del modo oscuro (con tinte violeta)
const FOTO_OSCURO = 'https://images.unsplash.com/photo-1761882619891-6529ff92df0a?w=1600&h=1000&fit=crop&auto=format';
/*
 * Foto a color del modo claro. Para usar una foto propia de la academia: guardarla en
 * src/recursos/ (por ejemplo hero-claro.jpg), importarla aquí y asignarla a esta constante.
 */
const FOTO_CLARO = 'https://images.unsplash.com/photo-1730350251024-3dba1909bc60?w=1000&h=1250&fit=crop&crop=faces,entropy&auto=format';

export default function Hero() {
  const { t } = useIdioma();
  const textRef = useRef<HTMLDivElement>(null);

  // Leve desplazamiento del texto con el mouse (solo en pantallas con puntero)
  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine || reduce) return;
    let raf = 0;
    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 14;
        const y = (e.clientY / window.innerHeight - 0.5) * 6;
        if (textRef.current) textRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
    };
  }, []);

  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="inicio" className="relative bg-[var(--color-hero)] text-[#1d1528] dark:text-purple-50">
      <div className="relative min-h-screen flex flex-col overflow-hidden grain">
        {/* Modo oscuro: foto a pantalla completa con tinte violeta y cuadrícula */}
        <div className="hidden dark:block" aria-hidden="true">
          <img
            src={FOTO_OSCURO}
            alt=""
            className="absolute inset-0 w-full h-full object-cover object-center grayscale-[55%] contrast-110 opacity-75"
          />
          <div className="absolute inset-0 bg-purple-900/45 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--color-hero)] via-[var(--color-hero)]/25 to-[var(--color-hero)]/65" />
          <div className="absolute inset-0 grid-lines opacity-[0.35]" />
        </div>

        {/* Modo claro: fondo blanco y persona a color a la derecha */}
        <div className="dark:hidden">
          <div className="absolute inset-y-0 right-0 hidden md:block w-[46%] lg:w-[42%]">
            <div className="absolute inset-x-6 top-28 bottom-10 overflow-hidden rounded-t-[999px] bg-purple-100">
              <img
                src={FOTO_CLARO}
                alt={t('Bailarín de hip hop a color')}
                className="h-full w-full object-cover object-[center_20%]"
              />
            </div>
          </div>
        </div>

        {/* Marcos de esquina */}
        <span className="pointer-events-none absolute left-6 top-28 h-10 w-10 border-l border-t border-purple-700/50 dark:border-[#dcc8db]/60" />
        <span className="pointer-events-none absolute left-6 bottom-28 hidden md:block h-10 w-10 border-l border-b border-purple-700/50 dark:border-[#dcc8db]/60" />
        <span className="pointer-events-none absolute right-6 top-28 hidden dark:block h-10 w-10 border-r border-t border-[#dcc8db]/60" />
        <span className="pointer-events-none absolute right-6 bottom-28 hidden dark:md:block h-10 w-10 border-r border-b border-[#dcc8db]/60" />

        <div ref={textRef} className="relative z-10 flex flex-1 flex-col justify-between max-w-[88rem] w-full mx-auto px-6 pt-32 pb-10 transition-transform duration-100 ease-out will-change-transform">
          {/* Fila superior */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            <Reveal delay={200}>
              <p className="font-condensed text-sm uppercase tracking-[0.2em] leading-relaxed text-[#5a4577] dark:text-purple-50/85 max-w-[16rem]">
                {t('La academia de Hip Hop urbano. Tu historia, nuestra pista de baile.')}
              </p>
            </Reveal>

            <ul className="hidden dark:block font-condensed text-lg md:text-xl uppercase tracking-wide md:text-right">
              {estilos.map((e, i) => (
                <Reveal as="li" key={e} delay={300 + i * 70} className="flex md:justify-end gap-3 py-0.5">
                  <span className="text-xs text-purple-50/60 pt-1.5">{String(i + 1).padStart(2, '0')}</span>
                  <span>({e})</span>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Modo claro en móvil: la persona a color va bajo el texto superior */}
          <div className="dark:hidden">
            <div className="md:hidden mx-auto mt-10 aspect-[4/5] w-56 overflow-hidden rounded-t-full bg-purple-100">
              <img src={FOTO_CLARO} alt="" className="h-full w-full object-cover object-[center_20%]" />
            </div>
          </div>

          {/* Titular */}
          <div className="mt-16 md:max-w-[56%] dark:md:max-w-none">
            <Reveal variant="mask" as="h1" className="display text-[clamp(3.6rem,13vw,13.5rem)] md:text-[clamp(3.6rem,9vw,8.5rem)] dark:md:text-[clamp(3.6rem,14.5vw,13.5rem)]">
              <MaskLine delay={100}>{t('Bailamos sin')}</MaskLine>
              <MaskLine delay={260}>
                <span className="text-purple-700 dark:text-[#dcc8db]">{t('límites')}</span>
                <span className="ml-4 align-top font-condensed text-[clamp(1rem,2.4vw,2rem)] tracking-wider text-[#5a4577] dark:text-purple-50/80 normal-case">
                  (est. 2016)
                </span>
              </MaskLine>
            </Reveal>

            <div className="mt-10 grid gap-8 dark:lg:grid-cols-[1fr_auto] dark:lg:items-end">
              <Reveal delay={500} className="max-w-xl">
                <p className="font-body text-base md:text-lg leading-relaxed text-[#3d3050] dark:text-purple-50/85">
                  {t('La única academia especializada 100% en Hip Hop urbano. Entrena con los mejores, expresa quién eres y transforma tu vida a través del movimiento.')}
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-4">
                  <Button size="lg" onClick={() => scrollTo('#sedes')}>{t('Inscríbete en una sede')}</Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className="!text-purple-700 !border-purple-700/50 hover:!bg-purple-700 hover:!text-white dark:!text-purple-50 dark:!border-purple-50/50 dark:hover:!bg-purple-50 dark:hover:!text-[#1b1326]"
                    onClick={() => scrollTo('#nosotros')}
                  >
                    {t('Conoce más')}
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={650} className="flex gap-10 border-t border-purple-700/20 pt-5 dark:border-white/20 dark:lg:border-0 dark:lg:pt-0">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="display text-4xl text-purple-700 dark:text-[#dcc8db]">{s.value}</div>
                    <div className="font-condensed text-xs uppercase tracking-wider text-[#5a4577] dark:text-purple-50/75 mt-1">{t(s.label)}</div>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
