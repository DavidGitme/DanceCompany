import { useState } from 'react';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';
import { useIdioma } from '@/nucleo/i18n/useIdioma';

const estilos = [
  {
    nombre: 'Hip Hop',
    descripcion:
      'La danza social que nació en el Bronx en los años 70. Groove, bounce y rock al ritmo de la música: la base de todos los estilos urbanos.',
  },
  {
    nombre: 'Breaking',
    descripcion:
      'El estilo original del hip hop. Toprock, footwork, freezes y power moves en el piso que combinan fuerza, control y creatividad.',
  },
  {
    nombre: 'Popping',
    descripcion:
      'Contracciones rápidas de los músculos al ritmo de la música, con ilusiones como el waving y el robot. Nació en California en los años 70.',
  },
  {
    nombre: 'Locking',
    descripcion:
      'Movimientos amplios y llenos de humor que se congelan en el tiempo, con points, wrist rolls y mucha actitud. Lo creó Don Campbell en Los Ángeles.',
  },
  {
    nombre: 'New Style',
    descripcion:
      'Hip hop coreográfico de los 90 y 2000: musicalidad, fluidez y transiciones limpias. Muy presente en competencias y montajes.',
  },
  {
    nombre: 'Krump',
    descripcion:
      'Un estilo expresivo y de alta energía surgido en Los Ángeles. Stomps, chest pops y arm swings para canalizar las emociones.',
  },
  {
    nombre: 'Freestyle',
    descripcion:
      'Improvisación pura: escuchar la música y responder en el momento con tu propio vocabulario. Es la clave de las batallas.',
  },
];

// Acordeón vertical: un estilo abierto a la vez, fondos alternos blanco y morado
export default function Estilos() {
  const { t } = useIdioma();
  const [abierto, setAbierto] = useState<number | null>(0);

  return (
    <section id="estilos" aria-labelledby="titulo-estilos" className="relative py-28 bg-page overflow-hidden">
      <div className="max-w-[88rem] mx-auto px-6">
        <div className="mb-14 grid lg:grid-cols-[1.4fr_1fr] gap-8 items-end">
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
              {t('Abre cada estilo para conocer de dónde viene y qué vas a entrenar en clase.')}
            </p>
          </Reveal>
        </div>

        <ul className="overflow-hidden rounded-3xl border border-border">
          {estilos.map((estilo, i) => {
            const esAbierto = abierto === i;
            const morado = i % 2 === 1;
            const idPanel = `estilo-panel-${i}`;
            const idBoton = `estilo-boton-${i}`;
            return (
              <li
                key={estilo.nombre}
                className={[
                  morado ? 'bg-purple-700 text-white' : 'bg-white text-[#1d1528] dark:bg-surface dark:text-text',
                  i > 0 ? (morado ? 'border-t border-purple-900/30' : 'border-t border-border') : '',
                ].join(' ')}
              >
                <h3>
                  <button
                    type="button"
                    id={idBoton}
                    aria-expanded={esAbierto}
                    aria-controls={idPanel}
                    onClick={() => setAbierto(esAbierto ? null : i)}
                    className="group flex w-full items-center gap-5 px-6 py-6 text-left md:px-10 md:py-8"
                  >
                    <span className={`font-condensed text-sm ${morado ? 'text-white/70' : 'text-text-muted'}`}>
                      ({String(i + 1).padStart(2, '0')})
                    </span>
                    <span className="display flex-1 text-4xl md:text-6xl transition-transform duration-500 group-hover:translate-x-2 motion-reduce:transition-none">
                      {estilo.nombre}
                    </span>
                    <span
                      aria-hidden="true"
                      className={[
                        'grid h-11 w-11 shrink-0 place-items-center rounded-full border transition-transform duration-500 motion-reduce:transition-none',
                        morado ? 'border-white/40' : 'border-current/25',
                        esAbierto ? 'rotate-45' : '',
                      ].join(' ')}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5">
                        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                </h3>
                <div id={idPanel} role="region" aria-labelledby={idBoton} className="acordeon-panel" data-abierto={esAbierto} aria-hidden={!esAbierto}>
                  <div>
                    <p
                      className={[
                        'max-w-3xl px-6 pb-8 font-body text-base leading-relaxed md:pl-[6.5rem] md:pr-10 md:text-lg',
                        morado ? 'text-white/90' : 'text-text-soft',
                      ].join(' ')}
                    >
                      {t(estilo.descripcion)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
