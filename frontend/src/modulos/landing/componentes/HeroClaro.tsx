import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useIdioma } from '@/nucleo/i18n/useIdioma';
import bailarina from '@/recursos/hero-bailarina.webp';

/*
 * Portada del modo claro, adaptada del hero editorial de referencia (titular gigante en dos líneas,
 * persona recortada encima y un foco de "tinta" que sigue al mouse). Sin librerías de animación:
 * variables CSS + requestAnimationFrame.
 *
 * Capas (de atrás hacia adelante): titular base, titular "tinta" (contorno lila), persona base,
 * persona "tinta" (duotono morado). Las capas base se ocultan dentro del foco y las de tinta solo
 * se ven dentro de él.
 */

const RADIO_FOCO = 145;
const FOCO_LISTO_MS = 2100;

/** Filtros SVG: contorno de las letras (banda de 2px dentro de la silueta) y duotono morado/lila de la persona. */
function FiltrosTinta() {
  return (
    <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
      <filter id="fa-tinta-duotono" colorInterpolationFilters="sRGB">
        <feColorMatrix type="matrix" values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0" />
        <feComponentTransfer>
          <feFuncR type="table" tableValues="0.231 0.353 0.765 1" />
          <feFuncG type="table" tableValues="0.176 0.271 0.659 1" />
          <feFuncB type="table" tableValues="0.322 0.467 0.941 1" />
        </feComponentTransfer>
      </filter>
      <filter id="fa-tinta-contorno">
        <feMorphology in="SourceAlpha" operator="erode" radius="2" result="dentro" />
        <feComposite in="SourceGraphic" in2="dentro" operator="out" />
      </filter>
    </svg>
  );
}

/** Palabra que entra letra por letra desde una máscara (de abajo o de arriba). */
function PalabraEnmascarada({ texto, retraso, desde, inversa = false }: { texto: string; retraso: number; desde: 'abajo' | 'arriba'; inversa?: boolean }) {
  const letras = [...texto];
  return (
    <span aria-hidden="true" className="inline-block whitespace-nowrap">
      {letras.map((letra, i) => {
        const orden = inversa ? letras.length - 1 - i : i;
        return (
          <span key={`${letra}-${i}`} className="hc-letra-mascara inline-block">
            <span
              className={`hc-letra inline-block ${desde === 'abajo' ? 'hc-desde-abajo' : 'hc-desde-arriba'}`}
              style={{ animationDelay: `${retraso + orden * 0.045}s` } as CSSProperties}
            >
              {letra === ' ' ? ' ' : letra}
            </span>
          </span>
        );
      })}
    </span>
  );
}

export default function HeroClaro() {
  const { t } = useIdioma();
  const lienzoRef = useRef<HTMLDivElement>(null);
  const [focoActivo, setFocoActivo] = useState(false);

  const linea1 = t('Bailamos');
  const linea2 = t('sin límites');
  const altPersona = t('Bailarina urbana agachada estirando la mano hacia la cámara');

  // El foco solo existe con mouse, en la composición ancha y sin movimiento reducido; se activa tras la entrada
  useEffect(() => {
    const consulta = window.matchMedia(
      '(hover: hover) and (pointer: fine) and (min-width: 1024px) and (min-aspect-ratio: 5/4) and (prefers-reduced-motion: no-preference)',
    );
    let timer = 0;
    const actualizar = () => {
      window.clearTimeout(timer);
      if (consulta.matches) timer = window.setTimeout(() => setFocoActivo(true), FOCO_LISTO_MS);
      else setFocoActivo(false);
    };
    actualizar();
    consulta.addEventListener('change', actualizar);
    return () => {
      window.clearTimeout(timer);
      consulta.removeEventListener('change', actualizar);
    };
  }, []);

  // Profundidad + foco: el puntero mueve un objetivo y cada cuadro se acerca suavemente (como un resorte)
  useEffect(() => {
    const lienzo = lienzoRef.current;
    const seccion = lienzo?.parentElement;
    if (!lienzo || !seccion) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const obj = { px: 0, py: 0, x: 0, y: 0, r: 0 };
    const act = { px: 0, py: 0, x: 0, y: 0, r: 0 };
    let raf = 0;

    const cuadro = () => {
      act.px += (obj.px - act.px) * 0.06;
      act.py += (obj.py - act.py) * 0.06;
      act.x += (obj.x - act.x) * 0.28;
      act.y += (obj.y - act.y) * 0.28;
      act.r += (obj.r - act.r) * 0.14;
      const s = lienzo.style;
      s.setProperty('--px', act.px.toFixed(4));
      s.setProperty('--py', act.py.toFixed(4));
      s.setProperty('--spot-x', `${act.x.toFixed(1)}px`);
      s.setProperty('--spot-y', `${act.y.toFixed(1)}px`);
      s.setProperty('--spot-r', `${Math.max(0, act.r).toFixed(1)}px`);
      const quieto =
        Math.abs(obj.px - act.px) < 0.001 &&
        Math.abs(obj.py - act.py) < 0.001 &&
        Math.abs(obj.x - act.x) < 0.3 &&
        Math.abs(obj.y - act.y) < 0.3 &&
        Math.abs(obj.r - act.r) < 0.3;
      raf = quieto ? 0 : requestAnimationFrame(cuadro);
    };
    const pedir = () => {
      if (!raf) raf = requestAnimationFrame(cuadro);
    };

    const mover = (e: PointerEvent) => {
      obj.px = (e.clientX / window.innerWidth) * 2 - 1;
      obj.py = (e.clientY / window.innerHeight) * 2 - 1;
      const r = lienzo.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (lienzo.dataset.foco === 'si') {
        // Cerrado por completo, se coloca bajo el cursor para abrirse ahí y no deslizarse desde otro punto
        if (act.r < 1) {
          act.x = x;
          act.y = y;
        }
        obj.r = RADIO_FOCO;
      }
      obj.x = x;
      obj.y = y;
      pedir();
    };
    const salir = () => {
      obj.px = 0;
      obj.py = 0;
      obj.r = 0;
      pedir();
    };

    seccion.addEventListener('pointermove', mover);
    seccion.addEventListener('pointerleave', salir);
    return () => {
      cancelAnimationFrame(raf);
      seccion.removeEventListener('pointermove', mover);
      seccion.removeEventListener('pointerleave', salir);
    };
  }, []);

  const scrollTo = (href: string) => document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="hc relative isolate overflow-hidden bg-white text-[#1d1528]">
      <FiltrosTinta />

      <div ref={lienzoRef} className="hc-lienzo" data-foco={focoActivo ? 'si' : 'no'}>
        {/* Titular base */}
        <div className="hc-capa hc-capa-titular hc-capa-base">
          <h1 className="hc-titular display uppercase">
            <span className="sr-only">
              {linea1} {linea2}
            </span>
            <span className="hc-linea1 text-purple-700">
              <PalabraEnmascarada texto={linea1} retraso={0.1} desde="abajo" />
            </span>
            <span className="hc-linea2 text-[#1d1528]">
              <PalabraEnmascarada texto={linea2} retraso={0.25} desde="arriba" inversa />
            </span>
          </h1>
        </div>

        {/* Titular tinta: letras en contorno lila dentro del foco */}
        {focoActivo && (
          <div aria-hidden="true" className="hc-capa hc-capa-titular hc-capa-tinta">
            <div className="hc-titular display uppercase">
              <span className="hc-linea1 hc-tinta-letras">{linea1}</span>
              <span className="hc-linea2 hc-tinta-letras">{linea2}</span>
            </div>
          </div>
        )}

        {/* Persona base */}
        <div className="hc-capa hc-capa-persona hc-capa-base">
          <img src={bailarina} alt={altPersona} width={632} height={980} fetchPriority="high" decoding="async" className="hc-persona hc-persona-entra" />
        </div>

        {/* Persona tinta: duotono morado dentro del foco */}
        {focoActivo && (
          <div aria-hidden="true" className="hc-capa hc-capa-persona hc-capa-tinta">
            <img src={bailarina} alt="" width={632} height={980} decoding="async" className="hc-persona hc-tinta-persona" />
          </div>
        )}

        {/* Pequeños detalles: llamadas a la acción y sedes */}
        <div className="hc-acciones">
          <p className="hc-roles font-condensed uppercase text-[#5a4577]">
            Hip Hop <span className="text-purple-700/50">/</span> Breaking <span className="text-purple-700/50">/</span> Popping
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => scrollTo('#sedes')}
              className="whitespace-nowrap rounded-full bg-purple-700 px-6 py-3 font-condensed text-sm font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-[#2e2240] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
            >
              {t('Inscríbete en una sede')}
            </button>
            <button
              type="button"
              onClick={() => scrollTo('#nosotros')}
              className="whitespace-nowrap rounded-full border border-purple-700/40 bg-white px-6 py-3 font-condensed text-sm font-semibold uppercase tracking-[0.15em] text-purple-700 transition-colors hover:bg-purple-700 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-700"
            >
              {t('Conoce más')}
            </button>
          </div>
        </div>

        <button type="button" onClick={() => scrollTo('#sedes')} className="hc-sedes group font-condensed uppercase text-[#5a4577]">
          <span>(est. 2016)</span>
          <span className="text-[#1d1528]">Bello / Copacabana</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-purple-700 text-white transition-transform duration-300 group-hover:rotate-45 motion-reduce:transition-none" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 17 17 7M9 7h8v8" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  );
}
