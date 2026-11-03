export default function Marquee({ items }: { items: string[] }) {
  return (
    <div className="overflow-hidden border-y border-border py-4" aria-hidden="true">
      <div className="marquee-track flex w-max">
        {[0, 1].map((k) => (
          <div key={k} className="flex shrink-0 items-center gap-10 pr-10">
            {items.map((item, i) => (
              <span
                key={`${k}-${item}`}
                className={[
                  "display text-4xl md:text-5xl whitespace-nowrap",
                  i % 2 === 0 ? "text-text" : "stroke-text",
                ].join(" ")}
              >
                {item}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}