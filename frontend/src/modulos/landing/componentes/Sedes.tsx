import Button from '@/compartido/ui/Button';
import Reveal, { MaskLine } from '@/compartido/ui/Reveal';

const locations = [
  {
    name: 'BELLO',
    address: 'Calle 33 #48-12, Bello, Antioquia',
    schedule: 'Lun – Sáb · 7:00 AM – 9:00 PM',
    description:
      'Nuestra sede principal, con 3 salones equipados, espejos profesionales, sistema de sonido de alta fidelidad y zona de entrenamiento libre.',
    img: 'https://images.unsplash.com/photo-1783824246318-0d06b33b3d1d?w=900&h=700&fit=crop&auto=format',
    tag: 'Sede principal',
  },
  {
    name: 'COPACABANA',
    address: 'Carrera 50 #21-80, Copacabana, Antioquia',
    schedule: 'Lun – Sáb · 8:00 AM – 8:00 PM',
    description:
      'Sede moderna con 2 salones de práctica, aire acondicionado, vestieres y estacionamiento propio para un entrenamiento sin contratiempos.',
    img: 'https://images.unsplash.com/photo-1524594152303-9fd13543fe6e?w=900&h=700&fit=crop&auto=format',
    tag: 'Nueva sede',
  },
];

export default function Locations() {
  return (
    <section id="sedes" className="relative py-28 bg-page overflow-hidden">
      <div className="max-w-[88rem] mx-auto px-6">
        <div className="mb-16">
          <Reveal>
            <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">(05) Dónde entrenar</span>
          </Reveal>
          <Reveal variant="mask" as="h2" className="display text-[clamp(3rem,9vw,8rem)] text-text mt-4">
            <MaskLine>Nuestras</MaskLine>
            <MaskLine delay={150}><span className="text-blush">sedes</span></MaskLine>
          </Reveal>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {locations.map((loc, i) => (
            <Reveal key={loc.name} delay={i * 120}>
              <article className="group relative overflow-hidden border border-border bg-surface">
                <div className="relative aspect-[4/3] overflow-hidden bg-purple-900">
                  <img
                    src={loc.img}
                    alt={`Sede ${loc.name}`}
                    className="w-full h-full object-cover grayscale-[40%] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
                  />
                  <div className="absolute inset-0 bg-purple-900/40 mix-blend-multiply" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/10 to-transparent" />
                  <div className="absolute top-4 left-4 flex items-center gap-3">
                    <span className="font-condensed text-sm text-white/80">({String(i + 1).padStart(2, '0')})</span>
                    <span className="bg-white/15 backdrop-blur border border-white/25 font-condensed text-xs uppercase tracking-widest text-white px-3 py-1">
                      {loc.tag}
                    </span>
                  </div>
                  <h3 className="absolute bottom-5 left-6 display text-6xl md:text-7xl text-white">{loc.name}</h3>
                </div>

                <div className="p-6">
                  <dl className="flex flex-col gap-2 mb-4 font-body text-sm text-text-soft">
                    <div className="flex gap-3"><dt className="font-condensed uppercase tracking-wider text-accent w-24 shrink-0">Dirección</dt><dd>{loc.address}</dd></div>
                    <div className="flex gap-3"><dt className="font-condensed uppercase tracking-wider text-accent w-24 shrink-0">Horario</dt><dd>{loc.schedule}</dd></div>
                  </dl>
                  <p className="font-body text-sm text-text-soft leading-relaxed mb-5">{loc.description}</p>
                  <Button variant="outline" size="sm">Ver sede →</Button>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}