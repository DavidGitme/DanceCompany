import { useEffect, useState } from "react"
import { useIdioma } from "@/nucleo/i18n/useIdioma"

/** Botón flotante con chevrón: aparece al bajar y vuelve al inicio de la página. */
export default function BotonVolverArriba({ className = "" }: { className?: string }) {
  const { t } = useIdioma()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const alDesplazar = () => setVisible(window.scrollY > 600)
    alDesplazar()
    window.addEventListener("scroll", alDesplazar, { passive: true })
    return () => window.removeEventListener("scroll", alDesplazar)
  }, [])

  const subir = () => {
    const reducir = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    window.scrollTo({ top: 0, behavior: reducir ? "auto" : "smooth" })
  }

  return (
    <button
      type="button"
      onClick={subir}
      aria-label={t("Volver arriba")}
      title={t("Volver arriba")}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
      className={[
        "fixed z-40 grid h-12 w-12 place-items-center rounded-full bg-purple-700 text-white shadow-lg shadow-purple-900/30",
        "transition-all duration-300 hover:-translate-y-1 hover:bg-purple-900 motion-reduce:transition-none",
        visible ? "opacity-100" : "pointer-events-none translate-y-4 opacity-0",
        className,
      ].join(" ")}
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-5 w-5" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
      </svg>
    </button>
  )
}
