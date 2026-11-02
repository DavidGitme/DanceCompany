import {
  createElement,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

interface RevealProps {
  children: ReactNode
  className?: string
  delay?: number
  /** fade: aparece subiendo. mask: solo activa las MaskLine internas. */
  variant?: "fade" | "mask"
  as?: "div" | "li" | "p" | "h1" | "h2" | "h3" | "span"
}

export default function Reveal({
  children,
  className = "",
  delay = 0,
  variant = "fade",
  as = "div",
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          io.disconnect()
        }
      },
      { threshold: 0.15 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return createElement(
    as,
    {
      ref,
      className: [variant === "fade" ? "reveal" : "", visible ? "is-visible" : "", className]
        .filter(Boolean)
        .join(" "),
      style: { "--d": `${delay}ms` } as CSSProperties,
    },
    children,
  )
}

/** Línea de titular que sube desde una máscara. Úsala dentro de <Reveal variant="mask">. */
export function MaskLine({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  return (
    <span className="mask">
      <span className="mask-inner" style={{ "--d": `${delay}ms` } as CSSProperties}>
        {children}
      </span>
    </span>
  )
}