import Reveal, { MaskLine } from '@/compartido/ui/Reveal';

const values = [
  {
    title: '100% Hip Hop Urbano',
    description:
      'Especialización única en Colombia. Breakdance, Locking, Popping, New Style y más estilos auténticos de la cultura urbana.',
  },
  {
    title: 'Para todas las edades',
    description:
      'Desde niños de 5 años hasta adultos mayores. Grupos por nivel y edad para garantizar un aprendizaje cómodo y efectivo.',
  },
  {
    title: 'Comunidad real',
    description:
      'Más que clases: una familia. Eventos, batallas, viajes y conexiones que duran toda la vida dentro de la cultura hip hop.',
  },
  {
    title: 'Entrena tu mente',
    description:
      'La danza urbana desarrolla disciplina, creatividad, memoria muscular y resiliencia emocional. Más que pasos: un estilo de vida.',
  },
];

export default function ValueProposition() {
  return (
    <section id="nosotros" className="relative py-28 bg-page overflow-hidden">
      <div className="absolute inset-0 grid-lines opacity-40 pointer-events-none [mask-image:linear-gradient(to_bottom,black,transparent_70%)]" />

      <div className="relative max-w-[88rem] mx-auto px-6">
        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-10 mb-20 items-end">
          <div>
            <Reveal>
              <span className="font-condensed text-sm uppercase tracking-[0.25em] text-accent font-semibold">
                (01) Por qué elegirnos
              </span>
            </Reveal>
            <Reveal variant="mask" as="h2" className="display text-[clamp(3rem,9vw,8rem)] text-text mt-4">
              <MaskLine>Más que</MaskLine>
              <MaskLine delay={150}><span className="text-blush">una academia</span></MaskLine>
            </Reveal>
          </div>
          <Reveal delay={200}>
            <p className="font-body text-text-soft text-lg leading-relaxed">
              F&A Dance Company nació de la pasión por el Hip Hop auténtico. Somos la única
              academia en Antioquia enfocada 100% en la cultura urbana, con metodología real
              y sin atajos.
            </p>
          </Reveal>
        </div>

        <ul className="border-t border-border">
          {values.map((v, i) => (
            <Reveal as="li" key={v.title} delay={i * 80} className="group border-b border-border">
              <div className="grid md:grid-cols-[80px_1.1fr_1fr_40px] gap-3 md:gap-8 items-baseline py-8 px-2 transition-colors duration-300 hover:bg-surface-alt">
                <span className="font-condensed text-sm text-text-muted">({String(i + 1).padStart(2, '0')})</span>
                <h3 className="display text-3xl md:text-5xl text-text transition-all duration-500 group-hover:translate-x-3 group-hover:text-accent">
                  {v.title}
                </h3>
                <p className="font-body text-sm md:text-base text-text-soft leading-relaxed">{v.description}</p>
                <span className="hidden md:block text-2xl text-accent opacity-0 -translate-x-3 transition-all duration-500 group-hover:opacity-100 group-hover:translate-x-0" aria-hidden="true">
                  →
                </span>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}