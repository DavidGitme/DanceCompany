import { useRef, type PointerEvent as EventoPuntero } from 'react';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

/*
 * Estilos que enseña la academia. Los rasgos y el origen salen literalmente de cada descripción;
 * el origen queda vacío cuando la descripción no lo menciona (no se inventa).
 */
const estilos = [
  {
    nombre: 'Hip Hop',
    rasgos: ['Groove', 'Bounce', 'Rock'],
    origen: 'Bronx · años 70',
    descripcion:
      'La danza social que nació en el Bronx en los años 70. Groove, bounce y rock al ritmo de la música: la base de todos los estilos urbanos.',
  },
  {
    nombre: 'Breaking',
    rasgos: ['Toprock', 'Footwork', 'Freezes', 'Power moves'],
    origen: '',
    descripcion:
      'El estilo original del hip hop. Toprock, footwork, freezes y power moves en el piso que combinan fuerza, control y creatividad.',
  },
  {
    nombre: 'Popping',
    rasgos: ['Waving', 'Robot'],
    origen: 'California · años 70',
    descripcion:
      'Contracciones rápidas de los músculos al ritmo de la música, con ilusiones como el waving y el robot. Nació en California en los años 70.',
  },
  {
    nombre: 'Locking',
    rasgos: ['Points', 'Wrist rolls'],
    origen: 'Los Ángeles',
    descripcion:
      'Movimientos amplios y llenos de humor que se congelan en el tiempo, con points, wrist rolls y mucha actitud. Lo creó Don Campbell en Los Ángeles.',
  },
  {
    nombre: 'New Style',
    rasgos: ['Musicalidad', 'Fluidez', 'Transiciones'],
    origen: 'Años 90 y 2000',
    descripcion:
      'Hip hop coreográfico de los 90 y 2000: musicalidad, fluidez y transiciones limpias. Muy presente en competencias y montajes.',
  },
  {
    nombre: 'Krump',
    rasgos: ['Stomps', 'Chest pops', 'Arm swings'],
    origen: 'Los Ángeles',
    descripcion:
      'Un estilo expresivo y de alta energía surgido en Los Ángeles. Stomps, chest pops y arm swings para canalizar las emociones.',
  },
  {
    nombre: 'Freestyle',
    rasgos: ['Improvisación', 'Batallas'],
    origen: '',
    descripcion:
      'Improvisación pura: escuchar la música y responder en el momento con tu propio vocabulario. Es la clave de las batallas.',
  },
];

/**
 * Tarjeta informativa (no es un botón): aparece al hacer scroll y, con mouse, se inclina levemente
 * y muestra un brillo lila que sigue al cursor. Idea tomada del "Spotlight Card" de 21st.dev,
 * hecha aquí con variables CSS y sin dependencias.
 */
function TarjetaEstilo({ estilo, indice, morada }: { estilo: (typeof estilos)[number]; indice: number; morada: boolean }) {
  const { t } = useIdioma();
  const ref = useRef<HTMLElement>(null);

  const mover = (e: EventoPuntero<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width;
    const y = (e.clientY - r.top) / r.height;
    el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    el.style.setProperty('--rx', `${((0.5 - y) * 5).toFixed(2)}deg`);
    el.style.setProperty('--ry', `${((x - 0.5) * 6).toFixed(2)}deg`);
  };
  const salir = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <article
      ref={ref}
      onPointerMove={mover}
      onPointerLeave={salir}
      aria-labelledby={`estilo-${indice}`}
      className={['tarjeta-estilo', morada ? 'tarjeta-estilo-morada' : 'tarjeta-estilo-clara'].join(' ')}
    >
      <div className="relative z-10 flex h-full flex-col">
        <div className="flex items-start justify-between gap-4">
          <span className={`font-condensed text-sm ${morada ? 'text-white/80' : 'text-text-muted'}`}>({String(indice + 1).padStart(2, '0')})</span>
          {estilo.origen && (
            <span className={`font-condensed text-xs uppercase tracking-[0.2em] ${morada ? 'text-white/85' : 'text-[#5a4577] dark:text-text-muted'}`}>
              {t(estilo.origen)}
            </span>
          )}
        </div>
        <h3 id={`estilo-${indice}`} className="tarjeta-estilo-nombre display mt-6 text-5xl leading-none md:text-6xl">
          {estilo.nombre}
        </h3>
        <p className={`mt-4 font-body text-base leading-relaxed ${morada ? 'text-white' : 'text-text-soft'}`}>{t(estilo.descripcion)}</p>
        <ul className="mt-auto flex flex-wrap gap-2 pt-6" aria-label={t('Lo que vas a entrenar')}>
          {estilo.rasgos.map((rasgo) => (
            <li
              key={rasgo}
              className={[
                'rounded-full px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-wider',
                morada ? 'bg-white/15 text-white' : 'bg-purple-700/[0.08] text-[#5a4577] dark:bg-white/10 dark:text-text-soft',
              ].join(' ')}
            >
              {t(rasgo)}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export default function Estilos() {
  const { t } = useIdioma();
  const irASedes = () => document.querySelector('#sedes')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <section id="estilos" aria-labelledby="titulo-estilos" className="relative py-28 bg-page overflow-hidden">
      <div className="max-w-[88rem] mx-auto px-6">
        <div className="mb-12 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
          <div>
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">
                (02) {t('Lo que enseñamos')}
              </span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(3rem,9vw,8rem)] text-text mt-4">
              <span id="titulo-estilos">
                <MaskLine>{t('Nuestros')}</MaskLine>
                <MaskLine delay={150}><span className="text-blush">{t('estilos')}</span></MaskLine>
              </span>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="font-body text-text-soft text-lg leading-relaxed">
              {t('Siete estilos de la cultura urbana: de dónde viene cada uno y qué vas a entrenar en clase.')}
            </p>
          </Reveal>
        </div>

        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 [perspective:1200px]">
          {estilos.map((estilo, i) => (
            <Reveal as="li" key={estilo.nombre} delay={(i % 4) * 90} className={i === 0 ? 'xl:col-span-2' : ''}>
              <TarjetaEstilo estilo={estilo} indice={i} morada={i % 2 === 0} />
            </Reveal>
          ))}
        </ul>

        {/* Única acción real de la sección: los horarios están en cada sede */}
        <Reveal delay={150} className="mt-10 flex flex-col items-start gap-4 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-body text-text-soft">{t('Los horarios de cada estilo dependen de la sede.')}</p>
          <button
            type="button"
            onClick={irASedes}
            className="inline-flex items-center gap-3 rounded-full bg-purple-700 px-6 py-3 font-condensed text-sm font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#2e2240] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700 dark:bg-purple-400 dark:text-[#1b1326] dark:hover:bg-purple-100"
          >
            {t('Ver sedes y horarios')}
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </button>
        </Reveal>
      </div>
    </section>
  );
}
