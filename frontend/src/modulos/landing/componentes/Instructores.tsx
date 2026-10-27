import { useState, type KeyboardEvent } from "react"
import Button from "@/compartido/ui/Button"

const instructors = [
  {
    name: 'Carlos "Krazy" Vélez',
    specialty: "Breaking & Power Moves",
    description:
      "Campeón nacional de Breaking, 12 años de experiencia en competencias internacionales. Formado en la escuela neoyorquina.",
    img: "https://images.unsplash.com/photo-1769535348339-b004086b6809?w=400&h=400&fit=crop&auto=format",
  },
  {
    name: 'Valentina "Flame" Reyes',
    specialty: "New Style & Coreografía",
    description:
      "Coreógrafa y bailarina con presentaciones en festivales de toda Latinoamérica. Especialista en fusión urbana contemporánea.",
    img: "https://images.unsplash.com/photo-1759720107956-1cbad755e952?w=400&h=400&fit=crop&auto=format",
  },
  {
    name: 'Andrés "Flex" Montoya',
    specialty: "Popping & Locking",
    description:
      "Referente del Popping en Colombia, discípulo directo de maestros de la Costa Oeste. Instructor certificado internacionalmente.",
    img: "https://images.unsplash.com/photo-1724439692201-b991c941709f?w=400&h=400&fit=crop&auto=format",
  },
  {
    name: 'Daniela "Storm" García',
    specialty: "Freestyle & Krump",
    description:
      "Finalista del Battle of the Year Colombia 2022. Especialista en movimiento libre, expresión corporal y entrenamiento mental.",
    img: "https://images.unsplash.com/photo-1777158375313-60eb6dc76413?w=400&h=400&fit=crop&auto=format",
  },
]

export default function Instructors() {
  // Siempre hay un panel abierto: el primero por defecto.
  const [activeIdx, setActiveIdx] = useState(0)

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, i: number) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      setActiveIdx(i)
    }
    if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIdx((i + 1) % instructors.length)
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIdx((i - 1 + instructors.length) % instructors.length)
    }
  }

  return (
    <section
      id="instructores"
      className="relative py-28 bg-surface-alt overflow-hidden"
    >
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="mb-16">
          <span className="font-condensed text-sm uppercase tracking-[0.3em] text-accent font-600">
            El equipo
          </span>
          <h2 className="font-display text-[clamp(3rem,6vw,5rem)] leading-none uppercase text-text mt-3">
            NUESTROS
            <br />
            <span className="text-accent">INSTRUCTORES</span>
          </h2>
        </div>

        {/* Paneles expansivos */}
        <div
          className="flex flex-col lg:flex-row gap-2 lg:h-[560px]"
          role="list"
          aria-label="Instructores"
        >
          {instructors.map((inst, i) => {
            const active = activeIdx === i
            return (
              <div
                key={inst.name}
                role="listitem"
                tabIndex={0}
                aria-current={active}
                onMouseEnter={() => setActiveIdx(i)}
                onFocus={() => setActiveIdx(i)}
                onClick={() => setActiveIdx(i)}
                onKeyDown={(e) => onKeyDown(e, i)}
                className={[
                  "group relative overflow-hidden cursor-pointer bg-surface outline-none",
                  "focus-visible:ring-2 focus-visible:ring-accent",
                  "transition-[flex-grow,height] duration-700 ease-[cubic-bezier(0.77,0,0.18,1)]",
                  "motion-reduce:transition-none",
                  // Móvil: acordeón vertical por altura. Escritorio: flex-grow.
                  active
                    ? "h-[26rem] lg:h-auto lg:flex-[6]"
                    : "h-20 lg:h-auto lg:flex-[1]",
                  "lg:basis-0 lg:min-w-0",
                ].join(" ")}
              >
                {/* Imagen */}
                <img
                  src={inst.img}
                  alt={inst.name}
                  className={[
                    "absolute inset-0 w-full h-full object-cover transition-all duration-700",
                    "motion-reduce:transition-none",
                    active ? "scale-100 grayscale-0" : "scale-110 grayscale",
                  ].join(" ")}
                />

                {/* Degradado para legibilidad */}
                <div
                  className={[
                    "absolute inset-0 bg-gradient-to-t transition-opacity duration-500",
                    active
                      ? "from-black/90 via-black/20 to-transparent opacity-100"
                      : "from-black/70 to-black/50 opacity-100",
                  ].join(" ")}
                />

                {/* Nombre cuando el panel está cerrado */}
                <span
                  className={[
                    "absolute font-display uppercase text-white tracking-wide transition-opacity duration-300",
                    "left-6 top-1/2 -translate-y-1/2 text-xl",
                    "lg:left-1/2 lg:top-auto lg:bottom-8 lg:-translate-x-1/2 lg:translate-y-0",
                    "lg:text-3xl lg:[writing-mode:vertical-rl] lg:rotate-180",
                    active ? "opacity-0" : "opacity-100 delay-300",
                  ].join(" ")}
                >
                  {inst.name.replace(/ ".*" /, " ")}
                </span>

                {/* Contenido cuando el panel está abierto */}
                <div
                  className={[
                    "absolute left-0 bottom-0 p-6 lg:p-8 w-full lg:w-[28rem]",
                    "transition-all duration-500",
                    "motion-reduce:transition-none",
                    active
                      ? "opacity-100 translate-y-0 delay-300"
                      : "opacity-0 translate-y-4 pointer-events-none",
                  ].join(" ")}
                >
                  <span className="font-condensed text-sm tracking-widest text-purple-300">
                    {inst.specialty}
                  </span>
                  <h3 className="font-display text-4xl lg:text-5xl leading-none uppercase text-white mt-2 mb-3">
                    {inst.name}
                  </h3>
                  <p className="font-body text-sm text-white/75 leading-relaxed">
                    {inst.description}
                  </p>
                </div>
              </div>
            )
          })}
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button variant="outline" size="lg">
            Ver todos los instructores
          </Button>
        </div>
      </div>
    </section>
  )
}
