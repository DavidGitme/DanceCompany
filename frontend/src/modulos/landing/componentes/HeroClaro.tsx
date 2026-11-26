import { useEffect, useRef, type CSSProperties } from 'react';
import Button from '@/compartido/ui/Button';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

/*
 * Bailarín recortado (PNG con fondo transparente) en src/recursos/hero-bailarin.png.
 * Si el archivo no existe, se muestra la foto de respaldo dentro de un arco.
 */
const recortes = import.meta.glob('../../../recursos/hero-bailarin.{png,webp}', {
  eager: true,
  import: 'default',
}) as Record<string, string>;
const FOTO_RECORTADA: string | undefined = Object.values(recortes)[0];
const FOTO_RESPALDO = 'https://images.unsplash.com/photo-1730350251024-3dba1909bc60?w=900&h=1125&fit=crop&crop=faces,entropy&auto=format';

/** Las dos palabras gigantes. Se dibujan dos veces: color normal y capa de tinta lila. */
function Palabras({ linea1, linea2, tinta = false }: { linea1: string; linea2: string; tinta?: boolean }) {
  return (
    <div className="hero-claro-letras display flex flex-col leading-[0.86] text-[clamp(4.2rem,18vw,8rem)] md:text-[clamp(5rem,13vw,14rem)]">
      <span className={['self-center md:self-start whitespace-nowrap', tinta ? 'text-[#c3a8f0]' : 'text-purple-700'].join(' ')}>
        {linea1}
      </span>
      <span className={['self-center md:self-end whitespace-nowrap', tinta ? 'text-[#c3a8f0]' : 'text-[#1d1528]'].join(' ')}>
        {linea2}
      </span>
    </div>
  );
}

/** Hero del modo claro, inspirado en un titular editorial con la persona recortada al centro. */
export default function HeroClaro() {
  const { t } = useIdioma();
  const ref = useRef<HTMLDivElement>(null);

  // Foco de tinta lila que sigue el puntero y leve paralaje (solo con mouse)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
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
        el.style.setProperty('--px', (actual.x / r.width - 0.5).toFixed(3));
        el.style.setProperty('--py', (actual.y / r.height - 0.5).toFixed(3));
      }
      raf = Math.abs(objetivo.x - actual.x) > 0.3 || Math.abs(objetivo.y - actual.y) > 0.3 ? requestAnimationFrame(pintar) : 0;
    };

    const mover = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      objetivo.x = e.clientX - r.left;
      objetivo.y = e.clientY - r.top;
      if (!el.classList.contains('foco-activo')) {
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
    <div
      ref={ref}
      className="hero-claro relative isolate flex min-h-[100svh] flex-col overflow-hidden bg-white text-[#1d1528]"
      style={{ '--px': 0, '--py': 0 } as CSSProperties}
    >
      <h1 className="sr-only">
        {linea1} {linea2}
      </h1>

      {/* Halo lila suave que sigue el puntero */}
      <div aria-hidden="true" className="hero-claro-halo pointer-events-none absolute inset-0 -z-10" />

      {/* Escena */}
      <div className="relative flex-1 min-h-[36rem] md:min-h-[31rem]">
        {/* Palabras base */}
        <div aria-hidden="true" className="hero-claro-entra absolute inset-x-0 top-24 z-10 mx-auto max-w-[94rem] px-5 md:top-28 md:px-10">
          <Palabras linea1={linea1} linea2={linea2} />
        </div>

        {/* Tinta lila: copia de las palabras visible solo dentro del foco */}
        <div aria-hidden="true" className="hero-claro-tinta pointer-events-none absolute inset-0 z-[15]">
          <div className="absolute inset-x-0 top-24 mx-auto max-w-[94rem] px-5 md:top-28 md:px-10">
            <Palabras linea1={linea1} linea2={linea2} tinta />
          </div>
        </div>

        {/* Persona al centro, delante de las letras */}
        <div className="hero-claro-persona pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center md:pr-[14%]">
          {FOTO_RECORTADA ? (
            <img
              src={FOTO_RECORTADA}
              alt={t('Bailarín de hip hop a color')}
              className="hero-claro-entra h-[min(54svh,23rem)] w-auto max-w-[96vw] object-contain object-bottom md:h-[min(84svh,56rem)]"
            />
          ) : (
            <div className="hero-claro-entra aspect-[4/5] w-[min(58vw,18rem)] overflow-hidden rounded-t-full bg-purple-100 md:w-[22rem]">
              <img src={FOTO_RESPALDO} alt={t('Bailarín de hip hop a color')} className="h-full w-full object-cover object-[center_20%]" />
            </div>
          )}
        </div>
      </div>

      {/* Pequeños detalles inferiores */}
      <div className="relative z-30 mx-auto flex w-full max-w-[94rem] flex-col gap-6 px-5 pb-8 pt-6 md:absolute md:inset-x-0 md:bottom-0 md:flex-row md:items-end md:justify-between md:px-10 md:pt-0">
        <div>
          <p className="flex items-center gap-2 font-condensed text-xs uppercase tracking-[0.25em] text-[#5a4577]">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-700" aria-hidden="true" />
            Hip Hop · Breaking · Popping
          </p>
          <div className="mt-4 flex flex-wrap gap-3 [&>button]:whitespace-nowrap">
            <Button onClick={() => scrollTo('#sedes')}>{t('Inscríbete en una sede')}</Button>
            <Button
              variant="outline"
              className="!text-purple-700 !border-purple-700/50 hover:!bg-purple-700 hover:!text-white"
              onClick={() => scrollTo('#nosotros')}
            >
              {t('Conoce más')}
            </Button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => scrollTo('#sedes')}
          className="group flex items-center gap-3 self-start font-condensed text-sm uppercase tracking-[0.2em] text-[#5a4577] md:self-end"
        >
          (est. 2016) · Bello · Copacabana
          <span className="grid h-9 w-9 place-items-center rounded-full bg-[#c3a8f0] text-[#2e2240] transition-transform duration-300 group-hover:rotate-45 motion-reduce:transition-none" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
