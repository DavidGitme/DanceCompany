import { useRef, type PointerEvent as EventoPuntero } from 'react';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

/*
 * Estilos que enseña la academia. Los rasgos y el origen salen literalmente de cada descripción;
 * el origen queda vacío cuando la descripción no lo menciona (no se inventa).
 */
// Fotos de Unsplash (provisionales hasta tener fotos propias de cada clase)
const foto = (id: string) => `https://images.unsplash.com/photo-${id}?w=900&h=1100&fit=crop&auto=format`;

const estilos = [
  {
    nombre: 'Hip Hop',
    foto: foto('1601128422269-0874c1bb0332'),
    rasgos: ['Groove', 'Bounce', 'Rock'],
    origen: 'Bronx · años 70',
    descripcion:
      'La danza social que nació en el Bronx en los años 70. Groove, bounce y rock al ritmo de la música: la base de todos los estilos urbanos.',
  },
  {
    nombre: 'Breaking',
    foto: foto('1508700929628-666bc8bd84ea'),
    rasgos: ['Toprock', 'Footwork', 'Freezes', 'Power moves'],
    origen: '',
    descripcion:
      'El estilo original del hip hop. Toprock, footwork, freezes y power moves en el piso que combinan fuerza, control y creatividad.',
  },
  {
    nombre: 'Popping',
    foto: foto('1761882628233-1e23102da76d'),
    rasgos: ['Waving', 'Robot'],
    origen: 'California · años 70',
    descripcion:
      'Contracciones rápidas de los músculos al ritmo de la música, con ilusiones como el waving y el robot. Nació en California en los años 70.',
  },
  {
    nombre: 'Locking',
    foto: foto('1611418608118-e6afdb56c35e'),
    rasgos: ['Points', 'Wrist rolls'],
    origen: 'Los Ángeles',
    descripcion:
      'Movimientos amplios y llenos de humor que se congelan en el tiempo, con points, wrist rolls y mucha actitud. Lo creó Don Campbell en Los Ángeles.',
  },
  {
    nombre: 'New Style',
    foto: foto('1621976360623-004223992275'),
    rasgos: ['Musicalidad', 'Fluidez', 'Transiciones'],
    origen: 'Años 90 y 2000',
    descripcion:
      'Hip hop coreográfico de los 90 y 2000: musicalidad, fluidez y transiciones limpias. Muy presente en competencias y montajes.',
  },
  {
    nombre: 'Krump',
    foto: foto('1454486837617-ce8e1ba5ebfe'),
    rasgos: ['Stomps', 'Chest pops', 'Arm swings'],
    origen: 'Los Ángeles',
    descripcion:
      'Un estilo expresivo y de alta energía surgido en Los Ángeles. Stomps, chest pops y arm swings para canalizar las emociones.',
  },
  {
    nombre: 'Freestyle',
    foto: foto('1511929958725-bd96f4db195f'),
    rasgos: ['Improvisación', 'Batallas'],
    origen: '',
    descripcion:
      'Improvisación pura: escuchar la música y responder en el momento con tu propio vocabulario. Es la clave de las batallas.',
  },
];

/**
 * Tarjeta partida (split image): media foto, media texto. El lado de la foto se alterna como un
 * damero para que la cuadrícula tenga ritmo. Es informativa (no es un botón): con mouse, el brillo
 * lila sigue al cursor sobre el texto y la foto pasa del duotono morado a color.
 */
function TarjetaEstilo({
  estilo,
  indice,
  fotoDerecha,
  ancha,
}: {
  estilo: (typeof estilos)[number];
  indice: number;
  fotoDerecha: boolean;
  ancha: boolean;
}) {
  const { t } = useIdioma();
  const ref = useRef<HTMLElement>(null);
  const morada = fotoDerecha;
  const numero = String(indice + 1).padStart(2, '0');

  const mover = (e: EventoPuntero<HTMLElement>) => {
    if (e.pointerType !== 'mouse') return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--gx', `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}%`);
    el.style.setProperty('--gy', `${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`);
  };

  return (
    <article
      ref={ref}
      onPointerMove={mover}
      aria-labelledby={`estilo-${indice}`}
      className={['tarjeta-split', fotoDerecha ? 'tarjeta-split-invertida' : '', ancha ? 'tarjeta-split-ancha' : ''].join(' ')}
    >
      <div className="tarjeta-split-foto" aria-hidden="true">
        <img src={estilo.foto} alt="" loading="lazy" decoding="async" />
        <span className="tarjeta-split-indice display">{numero}</span>
      </div>

      <div className={['tarjeta-split-texto', morada ? 'tarjeta-estilo-morada' : 'tarjeta-estilo-clara'].join(' ')}>
        <div className="relative z-10 flex h-full flex-col">
          <span className={`font-condensed text-xs uppercase tracking-[0.2em] ${morada ? 'text-white/85' : 'text-[#5a4577] dark:text-text-muted'}`}>
            {estilo.origen ? t(estilo.origen) : `(${numero})`}
          </span>
          <h3 id={`estilo-${indice}`} className="tarjeta-estilo-nombre display mt-3 text-4xl leading-none xl:text-5xl">
            {estilo.nombre}
          </h3>
          <p className={`mt-3 font-body text-sm leading-relaxed xl:text-[0.95rem] ${morada ? 'text-white' : 'text-text-soft'}`}>
            {t(estilo.descripcion)}
          </p>
          <ul className="mt-auto flex flex-wrap gap-1.5 pt-5" aria-label={t('Lo que vas a entrenar')}>
            {estilo.rasgos.map((rasgo) => (
              <li
                key={rasgo}
                className={[
                  'rounded-full px-2.5 py-1 font-condensed text-[0.7rem] font-semibold uppercase tracking-wider',
                  morada ? 'bg-white/15 text-white' : 'bg-purple-700/[0.08] text-[#5a4577] dark:bg-white/10 dark:text-text-soft',
                ].join(' ')}
              >
                {t(rasgo)}
              </li>
            ))}
          </ul>
        </div>
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

        {/* Split image grid: 2 columnas en damero; la última tarjeta (impar) ocupa el ancho completo */}
        <ul className="grid gap-4 md:grid-cols-2 xl:gap-5">
          {estilos.map((estilo, i) => {
            const fila = Math.floor(i / 2);
            const ancha = i === estilos.length - 1 && estilos.length % 2 === 1;
            return (
              <Reveal as="li" key={estilo.nombre} delay={(i % 2) * 90} className={ancha ? 'md:col-span-2' : ''}>
                <TarjetaEstilo estilo={estilo} indice={i} fotoDerecha={(i + fila) % 2 === 1} ancha={ancha} />
              </Reveal>
            );
          })}
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
