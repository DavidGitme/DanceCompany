import { useState } from 'react';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';

interface Sede {
  name: string;
  address: string;
  schedule: string;
  description: string;
  tag: string;
  /*
   * Foto real de la sede. Para agregarla: guardar el archivo en
   * src/recursos/sedes/ (p. ej. bello.jpg), importarlo arriba y asignarlo aquí.
   * Sin foto se muestra el fondo de marca, nunca una imagen de otro lugar.
   */
  photo?: string;
  photoAlt?: string;
}

const locations: Sede[] = [
  {
    name: 'Bello',
    address: 'Calle 33 #48-12, Bello, Antioquia',
    schedule: 'Lun – Sáb · 7:00 AM – 9:00 PM',
    description:
      'Nuestra sede principal, con 3 salones equipados, espejos profesionales, sistema de sonido de alta fidelidad y zona de entrenamiento libre.',
    tag: 'Sede principal',
  },
  {
    name: 'Copacabana',
    address: 'Carrera 50 #21-80, Copacabana, Antioquia',
    schedule: 'Lun – Sáb · 8:00 AM – 8:00 PM',
    description:
      'Sede moderna con 2 salones de práctica, aire acondicionado, vestieres y estacionamiento propio para un entrenamiento sin contratiempos.',
    tag: 'Nueva sede',
  },
];

const mapsUrl = (address: string) =>
  `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/* Iconos Heroicons outline (trazo 1.5), el mismo estilo del resto del sitio */
function IconoUbicacion({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </svg>
  );
}

function IconoReloj({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={className} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

// Imagen de la sede con respaldo de marca si no existe o no carga
function ImagenSede({ sede }: { sede: Sede }) {
  const [fallo, setFallo] = useState(false);

  if (sede.photo && !fallo) {
    return (
      <img
        src={sede.photo}
        alt={sede.photoAlt ?? `Instalaciones de la sede ${sede.name} de F&A Dance Company`}
        loading="lazy"
        decoding="async"
        onError={() => setFallo(true)}
        className="h-full w-full object-cover grayscale-[40%] transition-all duration-700 group-hover:scale-105 group-hover:grayscale-0 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    );
  }

  return (
    <div
      className="absolute inset-0 grid place-items-center bg-[#2e2240] pb-20 sm:pb-16"
      style={{
        // Cuadrícula tenue fija: se ve igual en modo claro y oscuro
        backgroundImage:
          'linear-gradient(to right, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(135deg, #5a4577, #2e2240 55%, #0c0a11)',
        backgroundSize: '72px 72px, 72px 72px, 100% 100%',
      }}
      aria-hidden="true"
    >
      <span className="grid h-20 w-20 place-items-center rounded-full border border-white/20 bg-white/5 text-white/70 transition-transform duration-700 group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100 sm:h-28 sm:w-28">
        <IconoUbicacion className="h-9 w-9 sm:h-12 sm:w-12" />
      </span>
    </div>
  );
}

export default function Locations() {
  return (
    <section id="sedes" aria-labelledby="titulo-sedes" className="relative py-28 bg-page overflow-hidden">
      <div className="max-w-[88rem] mx-auto px-6">
        <div className="mb-16">
          <Reveal>
            <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(05) Dónde entrenar</span>
          </Reveal>
          <Reveal variant="mask" as="h2" className="display text-[clamp(3rem,9vw,8rem)] text-text mt-4">
            <span id="titulo-sedes">
              <MaskLine>Nuestras</MaskLine>
              <MaskLine delay={150}><span className="text-blush">sedes</span></MaskLine>
            </span>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {locations.map((loc, i) => (
            <Reveal key={loc.name} delay={i * 120}>
              <article aria-labelledby={`sede-${i}`} className="group relative flex h-full flex-col overflow-hidden border border-border bg-surface">
                <div className="relative aspect-[4/3] overflow-hidden bg-purple-900">
                  <ImagenSede sede={loc} />
                  {loc.photo && <div className="absolute inset-0 bg-purple-900/40 mix-blend-multiply" aria-hidden="true" />}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" aria-hidden="true" />
                  <div className="absolute top-4 left-4 flex items-center gap-3">
                    <span className="font-condensed text-sm text-white/80" aria-hidden="true">({String(i + 1).padStart(2, '0')})</span>
                    <span className="bg-white/15 backdrop-blur border border-white/25 font-condensed text-xs uppercase tracking-widest text-white px-3 py-1">
                      {loc.tag}
                    </span>
                  </div>
                  <h3 id={`sede-${i}`} className="absolute bottom-5 left-6 display text-6xl md:text-7xl text-white">
                    <span className="sr-only">Sede </span>{loc.name}
                  </h3>
                </div>

                <div className="flex flex-1 flex-col p-6">
                  <dl className="flex flex-col gap-3 mb-4 font-body text-sm text-text-soft">
                    <div className="flex gap-3">
                      <dt className="flex w-28 shrink-0 items-center gap-2 font-condensed uppercase tracking-wider text-accent">
                        <IconoUbicacion className="h-4 w-4" /> Dirección
                      </dt>
                      <dd>{loc.address}</dd>
                    </div>
                    <div className="flex gap-3">
                      <dt className="flex w-28 shrink-0 items-center gap-2 font-condensed uppercase tracking-wider text-accent">
                        <IconoReloj className="h-4 w-4" /> Horario
                      </dt>
                      <dd>{loc.schedule}</dd>
                    </div>
                  </dl>
                  <p className="font-body text-sm text-text-soft leading-relaxed mb-5">{loc.description}</p>
                  <a
                    href={mapsUrl(loc.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Cómo llegar a la sede ${loc.name} (abre Google Maps en una pestaña nueva)`}
                    className="mt-auto inline-flex w-fit items-center justify-center gap-2 rounded-full border border-accent px-5 py-2 font-condensed text-sm font-bold uppercase tracking-wider text-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent hover:text-on-accent active:translate-y-0 motion-reduce:hover:translate-y-0"
                  >
                    <IconoUbicacion className="h-4 w-4" /> Cómo llegar
                    <span aria-hidden="true">→</span>
                  </a>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
