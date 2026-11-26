import SelectorIdioma from "@/compartido/ui/SelectorIdioma"
import ThemeToggle from "@/compartido/ui/ThemeToggle"
import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useState } from "react"
import logoFna from "@/recursos/logo-fna.png"
import Button from "@/compartido/ui/Button"
import { useAuth } from "@/nucleo/auth/useAuth"
import type { UsuarioSesion } from "../dtos/autenticacionDto"
import { autenticacionServicio } from "../servicios/autenticacionServicio"

// Retrato de Unsplash (provisional hasta tener fotos propias de la academia)
const FOTO_LOGIN = "https://images.unsplash.com/photo-1574022597485-46926298c9f9?w=1400&h=1800&fit=crop&auto=format"

interface LoginProps {
  onBack: () => void
  onLogin?: (usuario: UsuarioSesion) => void
}

export default function Login({ onBack, onLogin }: LoginProps) {
  const { iniciarSesion } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)
  // "¿Olvidaste tu contraseña?" se resuelve en la misma tarjeta
  const [recuperando, setRecuperando] = useState(false)
  const [mensajeRecuperacion, setMensajeRecuperacion] = useState("")

  const solicitarRecuperacion = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    const documento = email.replace(/[\s.-]/g, "")
    if (!/^[A-Za-z0-9]{5,20}$/.test(documento)) {
      setError(tr("Escribe tu número de documento (5 a 20 caracteres, sin espacios)."))
      return
    }
    setEnviando(true)
    try {
      setMensajeRecuperacion(await autenticacionServicio.solicitarRecuperacion(documento))
    } catch (err) {
      setError((err as { mensaje?: string })?.mensaje ?? tr("No fue posible enviar la solicitud. Intenta de nuevo."))
    } finally {
      setEnviando(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setEnviando(true)
    try {
      const usuario = await iniciarSesion({ documento: email, clave: password })
      onLogin?.(usuario)
    } catch (err) {
      // La API ya trae un mensaje claro (clave incorrecta, demasiados intentos, cuenta bloqueada)
      const mensaje = (err as { mensaje?: string })?.mensaje
      setError(mensaje ?? tr("Documento o clave incorrectos."))
    } finally {
      setEnviando(false)
    }
  }

  // Campos con tokens semánticos: funcionan igual en modo claro y oscuro
  const inputClass =
    "w-full rounded-xl bg-surface border border-border text-text placeholder:text-text-muted px-4 py-3.5 font-body text-sm transition-colors duration-200 hover:border-accent/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
  const labelClass = "font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft mb-1.5 block"
  const enlaceClass =
    "font-body text-sm text-accent underline-offset-4 hover:underline hover:text-accent-strong transition-colors cursor-pointer rounded focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"

  return (
    <div className="min-h-screen bg-page text-text lg:grid lg:grid-cols-2">
      {/* Columna del formulario: es lo prioritario en todos los tamaños */}
      <div className="relative flex min-h-screen flex-col px-6 py-6 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-2 rounded font-condensed text-sm uppercase tracking-widest text-text-soft transition-colors hover:text-accent cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            ← <span className="hidden sm:inline">{tr("Volver al inicio")}</span>
            <span className="sm:hidden">{tr("Volver")}</span>
          </button>
          <div className="flex items-center gap-2 text-text-soft">
            <SelectorIdioma />
            <ThemeToggle />
          </div>
        </header>

        {/* Franja de imagen en móvil: corta para no desplazar el formulario */}
        <div className="relative mt-6 h-28 overflow-hidden rounded-2xl lg:hidden" aria-hidden="true">
          <img src={FOTO_LOGIN} alt="" className="h-full w-full object-cover object-[50%_30%] grayscale" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#2e2240]/90 via-[#5a4577]/60 to-transparent" />
          <p className="absolute bottom-3 left-4 font-display text-2xl uppercase leading-none text-white">
            {tr("BAILA.")} <span className="text-purple-100">{tr("CRECE.")}</span> {tr("REGRESA.")}
          </p>
        </div>

        <div className="flex flex-1 items-center justify-center py-6 sm:py-10">
        <div className="w-full max-w-md">
          {/* Logo: oscuro en claro, original en oscuro */}
          <img
            src={logoFna}
            alt={tr("F&A Dance Company")}
            className="mb-6 h-12 w-auto object-contain sm:mb-10 brightness-0 opacity-85 dark:brightness-100 dark:opacity-100"
          />

          <h1 className="font-display text-5xl uppercase leading-none text-text mb-3">
            {recuperando ? tr("RECUPERAR ACCESO") : tr("BIENVENIDO")}
          </h1>
          <p className="font-body text-text-soft text-sm mb-8 sm:mb-10">
            {recuperando
              ? tr("Te enviaremos un enlace al correo registrado en tu cuenta.")
              : tr("Inicia sesión con tu número de documento")}
          </p>

          {recuperando ? (
            <form onSubmit={solicitarRecuperacion} className="flex flex-col gap-4" noValidate>
              {mensajeRecuperacion ? (
                <p role="status" className="rounded-xl border border-emerald-600/30 bg-emerald-600/10 p-4 font-body text-sm text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-400/10 dark:text-emerald-200">
                  {mensajeRecuperacion}
                </p>
              ) : (
                <>
                  <div>
                    <label htmlFor="recuperar-documento" className={labelClass}>
                      {tr("Número de documento")}
                    </label>
                    <input
                      id="recuperar-documento"
                      type="text"
                      inputMode="numeric"
                      autoComplete="username"
                      className={inputClass}
                      placeholder={tr("Ej. 1000000001")}
                      value={email}
                      maxLength={20}
                      onChange={(e) => setEmail(e.target.value)}
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "login-error" : undefined}
                    />
                  </div>
                  <Button type="submit" size="lg" fullWidth className="mt-2">
                    {enviando ? tr("Enviando...") : tr("Enviar enlace")}
                  </Button>
                </>
              )}
              {error && (
                <p id="login-error" role="alert" className="rounded-xl border border-red-600/30 bg-red-600/10 px-4 py-3 font-body text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
                  {error}
                </p>
              )}
              <button
                type="button"
                onClick={() => { setRecuperando(false); setMensajeRecuperacion(""); setError("") }}
                className={enlaceClass}
              >
                ← {tr("Volver a iniciar sesión")}
              </button>
            </form>
          ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Documento: es el usuario de todas las cuentas */}
            <div>
              <label htmlFor="login-documento" className={labelClass}>
                {tr("Número de documento")}
              </label>
              <input
                id="login-documento"
                type="text"
                inputMode="numeric"
                autoComplete="username"
                className={inputClass}
                placeholder={tr("Ej. 1000000001")}
                value={email}
                maxLength={30}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="login-clave" className={labelClass}>
                {tr("Contraseña")}
              </label>
              <div className="relative">
                <input
                  id="login-clave"
                  type={showPass ? "text" : "password"}
                  autoComplete="current-password"
                  className={inputClass + " pr-12"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  aria-label={showPass ? tr("Ocultar contraseña") : tr("Mostrar contraseña")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 grid h-8 w-8 place-items-center rounded-full text-text-muted hover:text-accent transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {showPass ? (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88"
                      />
                    </svg>
                  ) : (
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => { setRecuperando(true); setError("") }}
                className={enlaceClass}
              >
                {tr("¿Olvidaste tu contraseña?")}
              </button>
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" fullWidth className="mt-2">
              {enviando ? tr("Ingresando...") : tr("Iniciar sesión")}
            </Button>
            {error && (
              <p role="alert" className="rounded-xl border border-red-600/30 bg-red-600/10 px-4 py-3 font-body text-sm text-red-800 dark:border-red-400/30 dark:bg-red-400/10 dark:text-red-200">
                {error}
              </p>
            )}

            {/* Las cuentas las crea la academia al inscribir al estudiante */}
            <p className="mt-4 border-t border-border pt-6 text-center font-body text-sm text-text-muted">
              {tr("¿No tienes cuenta? La academia la crea cuando te inscribes en tu sede.")}
            </p>
          </form>
          )}
        </div>
        </div>
      </div>

      {/* Columna de imagen (escritorio): retrato con capas para dar profundidad */}
      <aside className="relative hidden overflow-hidden bg-surface-alt lg:block" aria-hidden="true">
        <div className="absolute inset-0 grid-lines opacity-60" />
        {/* Halo de marca detrás del retrato */}
        <div className="absolute -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-accent/25 blur-3xl" />
        <div className="absolute inset-y-10 left-10 right-10 xl:left-16 xl:right-16">
          {/* Plano trasero desplazado */}
          <div className="absolute inset-0 translate-x-5 translate-y-5 rounded-[2rem] bg-[#5a4577] dark:bg-[#3a2c50]" />
          <figure className="relative h-full overflow-hidden rounded-[2rem] shadow-2xl shadow-[#2e2240]/40">
            <img
              src={FOTO_LOGIN}
              alt=""
              className="absolute inset-0 h-full w-full scale-105 object-cover object-[50%_25%] grayscale contrast-125"
            />
            {/* Duotono morado corporativo + viñeta inferior para el texto */}
            <div className="absolute inset-0 bg-[#5a4577] mix-blend-multiply opacity-60" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1b1326] via-[#1b1326]/30 to-transparent" />
            <figcaption className="absolute inset-x-0 bottom-0 p-10 xl:p-12">
              <p className="font-display text-6xl uppercase leading-[0.95] text-white xl:text-7xl">
                {tr("BAILA.")}
                <br />
                <span className="text-purple-100/80">{tr("CRECE.")}</span>
                <br />
                {tr("REGRESA.")}
              </p>
              <p className="mt-5 max-w-sm font-body text-sm leading-relaxed text-white/80">
                {tr("Tu cuenta F&A te da acceso a horarios, progreso, comunidad y mucho más.")}
              </p>
            </figcaption>
          </figure>
          {/* Esquinas tipo visor, como en la sección de bienestar */}
          <span className="absolute -left-4 -top-4 h-14 w-14 border-l-2 border-t-2 border-accent" />
          <span className="absolute -bottom-9 -right-9 h-14 w-14 border-b-2 border-r-2 border-accent" />
        </div>
      </aside>
    </div>
  )
}
