import { useEffect, useState } from "react"
import Button from "@/compartido/ui/Button"
import { mensajeError } from "@/compartido/api/recursos"
import { useIdioma } from "@/nucleo/i18n/useIdioma"
import { sitioPublico } from "../servicios/sitioPublico"

// Enlace del correo: /confirmar-preinscripcion?token=...
export default function ConfirmarPreinscripcion({ token, onVolver }: { token: string; onVolver: () => void }) {
  const { t } = useIdioma()
  const [estado, setEstado] = useState<{ tipo: "cargando" } | { tipo: "ok" | "error"; mensaje: string }>({ tipo: "cargando" })

  useEffect(() => {
    sitioPublico
      .confirmarPreinscripcion(token)
      .then((r) => setEstado({ tipo: "ok", mensaje: r.mensaje }))
      .catch((e) => setEstado({ tipo: "error", mensaje: mensajeError(e) }))
  }, [token])

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md border border-border bg-surface p-8 text-center" aria-live="polite">
        <h1 className="display text-4xl text-text">{t("Confirmación de correo")}</h1>
        {estado.tipo === "cargando" ? (
          <p className="mt-4 font-body text-sm text-text-soft">{t("Confirmando tu preinscripción…")}</p>
        ) : (
          <p
            role={estado.tipo === "error" ? "alert" : "status"}
            className={`mt-4 font-body text-sm ${estado.tipo === "ok" ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
          >
            {t(estado.mensaje)}
          </p>
        )}
        {estado.tipo === "error" && (
          <p className="mt-2 font-body text-xs text-text-muted">{t("Si el enlace venció, vuelve a preinscribirte o comunícate con tu sede.")}</p>
        )}
        <Button size="md" className="mt-6" onClick={onVolver}>{t("Ir al sitio")}</Button>
      </div>
    </main>
  )
}
