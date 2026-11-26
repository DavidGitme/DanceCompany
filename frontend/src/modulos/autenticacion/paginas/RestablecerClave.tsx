import { tr } from "@/nucleo/i18n/IdiomaContext"
import ThemeToggle from "@/compartido/ui/ThemeToggle"
import { useState } from "react"
import Button from "@/compartido/ui/Button"
import { autenticacionServicio } from "../servicios/autenticacionServicio"

interface Props {
  token: string
  onIrALogin: () => void
}

// Página del enlace del correo: crear o recuperar la contraseña
export default function RestablecerClave({ token, onIrALogin }: Props) {
  const [clave, setClave] = useState("")
  const [confirmar, setConfirmar] = useState("")
  const [error, setError] = useState("")
  const [listo, setListo] = useState("")
  const [enviando, setEnviando] = useState(false)

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    if (clave.length < 8) return setError(tr("La contraseña debe tener al menos 8 caracteres."))
    if (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return setError(tr("Usa al menos una letra y un número."))
    if (clave !== confirmar) return setError(tr("Las contraseñas no coinciden."))
    setEnviando(true)
    try {
      setListo(await autenticacionServicio.restablecerClave(token, clave))
      // El enlace ya se usó: se quita de la barra de direcciones
      window.history.replaceState(null, "", "/")
    } catch (err) {
      setError((err as { mensaje?: string })?.mensaje ?? tr("No fue posible actualizar la contraseña."))
    } finally {
      setEnviando(false)
    }
  }

  const entrada =
    "w-full rounded-xl bg-surface border border-border text-text placeholder:text-text-muted px-4 py-3.5 font-body text-sm transition-colors focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"

  return (
    <main className="relative flex min-h-screen items-center justify-center bg-page px-6 text-text">
      <div className="absolute right-6 top-5 text-text-soft">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center font-display text-4xl uppercase text-text">{tr("Nueva contraseña")}</h1>
        <p className="mb-8 text-center font-body text-sm text-text-soft">{tr("Tu usuario sigue siendo tu número de documento.")}</p>
        {listo ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4 font-body text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">{listo}</p>
            <Button size="lg" fullWidth onClick={onIrALogin}>{tr("Iniciar sesión")}</Button>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="nueva-clave" className="mb-1.5 block font-condensed text-xs uppercase tracking-wider font-semibold text-text-soft">{tr("Contraseña nueva")}</label>
              <input id="nueva-clave" type="password" autoComplete="new-password" className={entrada} value={clave} maxLength={128} onChange={(e) => setClave(e.target.value)} />
              <p className="mt-1 font-body text-xs text-text-muted">{tr("Mínimo 8 caracteres, con letras y números.")}</p>
            </div>
            <div>
              <label htmlFor="confirmar-clave" className="mb-1.5 block font-condensed text-xs uppercase tracking-wider font-semibold text-text-soft">{tr("Confirmar contraseña")}</label>
              <input id="confirmar-clave" type="password" autoComplete="new-password" className={entrada} value={confirmar} maxLength={128} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
            {error && <p role="alert" className="rounded-xl border border-red-600/30 bg-red-600/10 px-4 py-3 font-body text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">{error}</p>}
            <Button type="submit" size="lg" fullWidth>{enviando ? tr("Guardando...") : tr("Guardar contraseña")}</Button>
            <button type="button" onClick={onIrALogin} className="rounded font-body text-sm text-accent hover:text-accent-strong hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">{tr("← Volver a iniciar sesión")}</button>
          </form>
        )}
      </div>
    </main>
  )
}
