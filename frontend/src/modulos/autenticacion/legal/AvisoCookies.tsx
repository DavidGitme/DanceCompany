import { useState } from "react"
import DocumentoLegal from "./DocumentoLegal"
import { COOKIES } from "./textosLegales"

const CLAVE = "fna-aviso-cookies"
const VERSION = "1"

// localStorage puede fallar (modo privado, almacenamiento bloqueado): el aviso se vuelve a mostrar
const leer = () => {
  try {
    return window.localStorage.getItem(CLAVE)
  } catch {
    return null
  }
}

/*
 * Aviso de cookies. La plataforma solo usa una cookie técnica necesaria (la sesión),
 * que no requiere consentimiento; el aviso informa y guarda que la persona lo vio.
 */
export default function AvisoCookies() {
  const [visto, setVisto] = useState(() => {
    try {
      return JSON.parse(leer() ?? "null")?.version === VERSION
    } catch {
      return false
    }
  })
  const [detalle, setDetalle] = useState(false)

  if (visto) return null

  const aceptar = () => {
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify({ version: VERSION, fecha: new Date().toISOString() }))
    } catch {
      // Sin almacenamiento solo se cierra por esta visita
    }
    setVisto(true)
  }

  return (
    <>
      <div role="region" aria-label="Aviso de cookies" className="fixed inset-x-3 bottom-3 z-[85] mx-auto max-w-3xl rounded-2xl border border-border bg-surface p-4 shadow-2xl sm:flex sm:items-center sm:gap-4">
        <p className="font-body text-sm text-text-soft">
          Usamos solo una cookie técnica necesaria para mantener tu sesión segura. No usamos cookies de publicidad ni de
          analítica.{" "}
          <button type="button" onClick={() => setDetalle(true)} className="font-semibold text-accent underline-offset-4 hover:underline">
            Más información
          </button>
        </p>
        <button type="button" onClick={aceptar} className="mt-3 w-full shrink-0 rounded-full bg-accent px-5 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider text-on-accent sm:mt-0 sm:w-auto">
          Entendido
        </button>
      </div>
      {detalle && <DocumentoLegal titulo="Política de cookies" secciones={COOKIES} onCerrar={() => setDetalle(false)} />}
    </>
  )
}
