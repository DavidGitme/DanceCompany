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
    if (clave.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.")
    if (!/[A-Za-z]/.test(clave) || !/\d/.test(clave)) return setError("Usa al menos una letra y un número.")
    if (clave !== confirmar) return setError("Las contraseñas no coinciden.")
    setEnviando(true)
    try {
      setListo(await autenticacionServicio.restablecerClave(token, clave))
      // El enlace ya se usó: se quita de la barra de direcciones
      window.history.replaceState(null, "", "/")
    } catch (err) {
      setError((err as { mensaje?: string })?.mensaje ?? "No fue posible actualizar la contraseña.")
    } finally {
      setEnviando(false)
    }
  }

  const entrada =
    "w-full bg-white/5 border border-purple-400/20 text-purple-50 placeholder:text-purple-100/30 px-4 py-3.5 font-body text-sm focus:outline-none focus:border-purple-400"

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0D0A10] px-6">
      <div className="w-full max-w-md">
        <h1 className="mb-2 text-center font-display text-4xl uppercase text-purple-50">Nueva contraseña</h1>
        <p className="mb-8 text-center font-body text-sm text-purple-100/50">Tu usuario sigue siendo tu número de documento.</p>
        {listo ? (
          <div className="flex flex-col gap-4">
            <p role="status" className="border border-emerald-400/30 bg-emerald-400/10 p-4 font-body text-sm text-emerald-200">{listo}</p>
            <Button size="lg" fullWidth onClick={onIrALogin}>Iniciar sesión</Button>
          </div>
        ) : (
          <form onSubmit={enviar} className="flex flex-col gap-4" noValidate>
            <div>
              <label htmlFor="nueva-clave" className="mb-1.5 block font-condensed text-xs uppercase tracking-wider text-purple-400">Contraseña nueva</label>
              <input id="nueva-clave" type="password" autoComplete="new-password" className={entrada} value={clave} maxLength={128} onChange={(e) => setClave(e.target.value)} />
              <p className="mt-1 font-body text-xs text-purple-100/40">Mínimo 8 caracteres, con letras y números.</p>
            </div>
            <div>
              <label htmlFor="confirmar-clave" className="mb-1.5 block font-condensed text-xs uppercase tracking-wider text-purple-400">Confirmar contraseña</label>
              <input id="confirmar-clave" type="password" autoComplete="new-password" className={entrada} value={confirmar} maxLength={128} onChange={(e) => setConfirmar(e.target.value)} />
            </div>
            {error && <p role="alert" className="font-body text-sm text-red-400">{error}</p>}
            <Button type="submit" size="lg" fullWidth>{enviando ? "Guardando..." : "Guardar contraseña"}</Button>
            <button type="button" onClick={onIrALogin} className="font-body text-sm text-purple-400 hover:text-purple-300">← Volver a iniciar sesión</button>
          </form>
        )}
      </div>
    </main>
  )
}
