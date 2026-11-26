import { useEffect, useRef, type CSSProperties } from 'react';
import Button from '@/compartido/ui/Button';
import Reveal from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

const stats = [
  { value: '500+', label: 'Estudiantes activos' },
  { value: '8+', label: 'Años de experiencia' },
  { value: '2', label: 'Sedes en Antioquia' },
];

/*
 * Foto del bailarín. Si existe src/recursos/hero-bailarin.png (o .webp) con el fondo
 * recortado (PNG transparente), se usa como figura recortada en el centro. Si no existe,
 * se muestra la foto de respaldo dentro de un arco.
 */
const recortes = import.meta.glob('../../../recursos/hero-bailarin.{png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const FOTO_RECORTADA: string | undefined = Object.values(recortes)[0];
const FOTO_RESPALDO = 'https://images.unsplash.com/photo-1730350251024-3dba1909bc60?w=900&h=1125&fit=crop&crop=faces,entropy&auto=format';

/** Las dos líneas del titular. Se dibujan dos veces: base y capa de "tinta" lila. */
function Titular({ linea1, linea2, tinta = false }: { linea1: string; linea2: string; tinta?: boolean }) {
  return (
    <div className="hero-titular display text-center leading-[0.84] text-[clamp(3.6rem,19vw,7rem)] md:text-[clamp(4rem,15.5vw,16rem)]">
      <span className={['block', tinta ? 'text-[var(--hero-tinta)]' : 'text-[#1d1528] dark:text-purple-50'].join(' ')}>
        {linea1}
      </span>
      <span className={['block', tinta ? 'text-[var(--hero-tinta)]' : 'hero-contorno'].join(' ')}>{linea2}</span>
    </div>
  );
}

export default function Hero() {
  const { t } = useIdioma();
  const ref = useRef<HTMLElement>(null);

  // Foco de "tinta" lila que sigue el puntero + leve paralaje (solo con mouse)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fino) return;
    const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const objetivo = { x: 0, y: 0 };
    const actual = { x: 0, y: 0 };
    let raf = 0;

    const pintar = () => {
      const k = reducir ? 1 : 0.16;
      actual.x += (objetivo.x - actual.x) * k;
      actual.y += (objetivo.y - actual.y) * k;
      const r = el.getBoundingClientRect();
      el.style.setProperty('--spot-x', `${actual.x}px`);
      el.style.setProperty('--spot-y', `${actual.y}px`);
      if (!reducir) {
        el.style.setProperty('--px', ((actual.x / r.width) - 0.5).toFixed(3));
        el.style.setProperty('--py', ((actual.y / r.height) - 0.5).toFixed(3));
      }
      if (Math.abs(objetivo.x - actual.x) > 0.3 || Math.abs(objetivo.y - actual.y) > 0.3) {
        raf = requestAnimationFrame(pintar);
      } else {
        raf = 0;
      }
    };

    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      objetivo.x = e.clientX - r.left;
      objetivo.y = e.clientY - r.top;
      if (!el.classList.contains('foco-activo')) {
        // Al entrar, el foco aparece donde está el puntero (sin deslizarse desde la esquina)
        actual.x = objetivo.x;
        actual.y = objetivo.y;
        el.classList.add('foco-activo');
      }
      if (!raf) raf = requestAnimationFrame(pintar);
    };
    const salir = () => el.classList.remove('foco-activo');

    el.addEventListener('pointermove', mover);
    el.addEventListener('pointerleave', salir);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', mover);
      el.removeEventListener('pointerleave', salir);
    };
  }, []);

  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });
  const linea1 = t('Bailamos');
  const linea2 = t('sin límites');

  return (
    <section
      id="inicio"
      ref={ref}
      aria-labelledby="titulo-hero"
      className="hero-urbano relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-[var(--color-hero)] text-[#1d1528] dark:text-purple-50"
      style={{ '--px': 0, '--py': 0 } as CSSProperties}
    >
      {/* Fondo: degradado lila suave (claro) y cuadrícula tenue (oscuro) */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_85%,#efe6fb_0%,transparent_62%)] dark:bg-[radial-gradient(ellipse_at_50%_85%,rgba(166,146,196,0.22)_0%,transparent_62%)]" />
        <div className="absolute inset-0 hidden dark:block grid-lines opacity-25" />
      </div>
      {/* Halo lila que sigue el puntero */}
      <div aria-hidden="true" className="hero-halo pointer-events-none absolute inset-0 -z-[5]" />

      <h1 id="titulo-hero" className="sr-only">
        {linea1} {linea2}
      </h1>

      {/* Detalles superiores */}
      <div className="relative z-40 mx-auto flex w-full max-w-[88rem] items-start justify-between px-6 pt-28 font-condensed text-xs uppercase tracking-[0.25em] text-[#5a4577] dark:text-purple-50/75 md:text-sm">
        <Reveal delay={150}>(est. 2016)</Reveal>
        <Reveal delay={250} className="text-right">Bello · Copacabana</Reveal>
      </div>

      {/* Escena: titular, persona y capa de tinta */}
      <div className="relative flex-1 min-h-[25rem] md:min-h-[30rem]">
        {/* Titular base (detrás de la persona) */}
        <div aria-hidden="true" className="absolute inset-x-0 top-[4%] z-10 px-4">
          <div className="hero-capa-letras">
            <Titular linea1={linea1} linea2={linea2} />
          </div>
        </div>

        {/* Persona */}
        <div aria-hidden={!FOTO_RECORTADA} className="hero-capa-persona absolute inset-x-0 bottom-0 z-20 flex justify-center pointer-events-none">
          {FOTO_RECORTADA ? (
            <img
              src={FOTO_RECORTADA}
              alt={t('Bailarín de hip hop a color')}
              className="h-[min(78svh,52rem)] w-auto max-w-[92vw] object-contain object-bottom drop-shadow-[0_30px_60px_rgba(46,34,64,0.25)]"
            />
          ) : (
            <div className="mb-0 aspect-[4/5] w-[min(56vw,19rem)] lg:w-[21rem] overflow-hidden rounded-t-full border border-purple-700/15 bg-purple-100 shadow-[0_30px_80px_-20px_rgba(46,34,64,0.35)] dark:border-white/10">
              <img
                src={FOTO_RESPALDO}
                alt={t('Bailarín de hip hop a color')}
                className="h-full w-full object-cover object-[center_20%]"
              />
            </div>
          )}
        </div>

        {/* Tinta lila: copia del titular visible solo dentro del foco del puntero */}
        <div aria-hidden="true" className="hero-tinta pointer-events-none absolute inset-0 z-30">
          <div className="absolute inset-x-0 top-[4%] px-4">
            <div className="hero-capa-letras">
              <Titular linea1={linea1} linea2={linea2} tinta />
            </div>
          </div>
        </div>
      </div>

      {/* Franja inferior: llamada a la acción y cifras */}
      <div className="relative z-40 mx-auto flex w-full max-w-[88rem] flex-col gap-8 px-6 pb-8 pt-8 md:absolute md:inset-x-0 md:bottom-0 md:flex-row md:items-end md:justify-between md:pt-0">
        <Reveal delay={450} className="md:max-w-[19rem]">
          <p className="font-body text-sm leading-relaxed text-[#3d3050] dark:text-purple-50/85 md:text-base">
            {t('La única academia 100% Hip Hop urbano de Antioquia.')}
          </p>
          <div className="mt-5 flex flex-wrap gap-3 [&>button]:whitespace-nowrap">
            <Button onClick={() => scrollTo('#sedes')}>{t('Inscríbete en una sede')}</Button>
            <Button
              variant="outline"
              className="!text-purple-700 !border-purple-700/50 hover:!bg-purple-700 hover:!text-white dark:!text-purple-50 dark:!border-purple-50/50 dark:hover:!bg-purple-50 dark:hover:!text-[#1b1326]"
              onClick={() => scrollTo('#nosotros')}
            >
              {t('Conoce más')}
            </Button>
          </div>
        </Reveal>

        <Reveal delay={600} className="flex gap-7 md:flex-col md:gap-4 md:text-right">
          {stats.map((s) => (
            <div key={s.label}>
              <div className="display text-3xl text-purple-700 dark:text-[#dcc8db]">{s.value}</div>
              <div className="mt-1 font-condensed text-[0.7rem] uppercase tracking-wider text-[#5a4577] dark:text-purple-50/75">{t(s.label)}</div>
            </div>
          ))}
        </Reveal>
      </div>
    </section>
  );
}
