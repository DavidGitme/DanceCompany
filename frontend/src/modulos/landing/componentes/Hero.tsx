import { useEffect, useRef } from 'react';
import Button from '@/compartido/ui/Button';
import Marquee from '@/compartido/ui/Marquee';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';

const estilos = ['Breaking', 'Popping', 'Locking', 'New Style', 'Krump', 'Freestyle'];
const stats = [
  { value: '500+', label: 'Estudiantes activos' },
  { value: '8+', label: 'Años de experiencia' },
  { value: '2', label: 'Sedes en Antioquia' },
];

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (!fine) return;
    let raf = 0;
    const isInteractive = (t: EventTarget | null) => !!(t as HTMLElement)?.closest?.('button, a, input');

    const onMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = (e.clientX / window.innerWidth - 0.5) * 18;
        const y = (e.clientY / window.innerHeight - 0.5) * 8;
        if (textRef.current) textRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        const label = labelRef.current;
        if (label) {
          const inside = !!sectionRef.current?.contains(e.target as Node) && !isInteractive(e.target);
          label.style.opacity = inside ? '1' : '0';
          label.style.transform = `translate3d(${e.clientX + 18}px, ${e.clientY + 18}px, 0) rotate(-6deg)`;
        }
      });
    };
    const onClick = (e: MouseEvent) => {
      if (sectionRef.current?.contains(e.target as Node) && !isInteractive(e.target)) {
        document.querySelector('#instructores')?.scrollIntoView({ behavior: 'smooth' });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('click', onClick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('click', onClick);
    };
  }, []);

  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="inicio" ref={sectionRef} className="relative bg-[#0c0a11] text-purple-50 lg:cursor-none">
      {/* Etiqueta que sigue al cursor */}
      <div
        ref={labelRef}
        aria-hidden="true"
        className="cursor-label pointer-events-none fixed left-0 top-0 z-[60] opacity-0 transition-opacity duration-200"
      >
        <span className="font-condensed text-sm font-bold uppercase tracking-[0.2em] text-purple-50 bg-[#0c0a11]/70 backdrop-blur px-3 py-1.5 rounded-full border border-white/20">
          Ver clases
        </span>
      </div>

      <div className="relative min-h-screen flex flex-col overflow-hidden grain">
        {/* Imagen + tinte violeta unificador */}
        <img
          src="https://images.unsplash.com/photo-1761882619891-6529ff92df0a?w=1600&h=1000&fit=crop&auto=format"
          alt="Bailarín de hip hop en estudio"
          className="absolute inset-0 w-full h-full object-cover object-center grayscale-[55%] contrast-110 opacity-70"
        />
        <div className="absolute inset-0 bg-purple-900/50 mix-blend-multiply" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a11] via-[#0c0a11]/30 to-[#0c0a11]/70" />
        <div className="absolute inset-0 grid-lines opacity-[0.35]" />

        {/* Marcos de esquina */}
        <span className="pointer-events-none absolute left-6 top-28 h-10 w-10 border-l border-t border-[#dcc8db]/60" />
        <span className="pointer-events-none absolute right-6 top-28 h-10 w-10 border-r border-t border-[#dcc8db]/60" />
        <span className="pointer-events-none absolute left-6 bottom-28 hidden md:block h-10 w-10 border-l border-b border-[#dcc8db]/60" />
        <span className="pointer-events-none absolute right-6 bottom-28 hidden md:block h-10 w-10 border-r border-b border-[#dcc8db]/60" />

        <div ref={textRef} className="relative z-10 flex flex-1 flex-col justify-between max-w-[88rem] w-full mx-auto px-6 pt-32 pb-10 transition-transform duration-100 ease-out will-change-transform">
          {/* Fila superior */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10">
            <Reveal delay={200}>
              <p className="font-condensed text-sm uppercase tracking-[0.2em] leading-relaxed text-purple-50/85 max-w-[16rem]">
                La academia de Hip Hop urbano. Tu historia, nuestra pista de baile.
              </p>
            </Reveal>

            <ul className="font-condensed text-lg md:text-xl uppercase tracking-wide md:text-right">
              {estilos.map((e, i) => (
                <Reveal as="li" key={e} delay={300 + i * 70} className="flex md:justify-end gap-3 py-0.5">
                  <span className="text-xs text-purple-50/60 pt-1.5">{String(i + 1).padStart(2, '0')}</span>
                  <span>({e})</span>
                </Reveal>
              ))}
            </ul>
          </div>

          {/* Titular */}
          <div className="mt-16">
            <Reveal variant="mask" as="h1" className="display text-[clamp(3.6rem,14.5vw,13.5rem)]">
              <MaskLine delay={100}>Bailamos sin</MaskLine>
              <MaskLine delay={260}>
                <span className="text-[#dcc8db]">límites</span>
                <span className="ml-4 align-top font-condensed text-[clamp(1rem,2.4vw,2rem)] tracking-wider text-purple-50/80 normal-case">
                  (est. 2016)
                </span>
              </MaskLine>
            </Reveal>

            <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
              <Reveal delay={500} className="max-w-xl">
                <p className="font-body text-base md:text-lg leading-relaxed text-purple-50/85">
                  La única academia especializada 100% en Hip Hop urbano. Entrena con los mejores,
                  expresa quién eres y transforma tu vida a través del movimiento.
                </p>
                <div className="mt-7 flex flex-col sm:flex-row gap-4">
                  <Button size="lg" onClick={() => scrollTo('#alquiler')}>Regístrate ahora</Button>
                  <Button size="lg" variant="outline" className="!text-purple-50 !border-purple-50/50 hover:!bg-purple-50 hover:!text-[#1b1326]" onClick={() => scrollTo('#nosotros')}>
                    Conoce más
                  </Button>
                </div>
              </Reveal>

              <Reveal delay={650} className="flex gap-10 border-t border-white/20 pt-5 lg:border-0 lg:pt-0">
                {stats.map((s) => (
                  <div key={s.label}>
                    <div className="display text-4xl text-[#dcc8db]">{s.value}</div>
                    <div className="font-condensed text-xs uppercase tracking-wider text-purple-50/75 mt-1">{s.label}</div>
                  </div>
                ))}
              </Reveal>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-page text-text">
        <Marquee items={['Hip Hop', 'Breaking', 'Popping', 'Locking', 'New Style', 'Krump', 'Freestyle']} />
      </div>
    </section>
  );
}