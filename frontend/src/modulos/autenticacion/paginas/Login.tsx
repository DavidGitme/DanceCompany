import { useState } from "react"
import logoFna from "@/recursos/logo-fna.png"
import Button from "@/compartido/ui/Button"
import { useAuth } from "@/nucleo/auth/useAuth"
import type { UsuarioSesion } from "../dtos/autenticacionDto"

interface LoginProps {
  onBack: () => void
  onLogin?: (usuario: UsuarioSesion) => void
}

export default function Login({ onBack, onLogin }: LoginProps) {
  const { iniciarSesion } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [remember, setRemember] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [enviando, setEnviando] = useState(false)

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
      setError(mensaje ?? "Documento o clave incorrectos.")
    } finally {
      setEnviando(false)
    }
  }

  const inputClass =
    "w-full bg-white/5 border border-purple-400/20 text-purple-50 placeholder:text-purple-100/30 px-4 py-3.5 font-body text-sm focus:outline-none focus:border-purple-400 transition-colors duration-200"

  return (
    <div className="min-h-screen bg-[#0D0A10] dark:bg-[#0D0A10] flex">
      {/* Left — branding panel */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 relative overflow-hidden">
        {/* Background image */}
        <img
          src="https://images.unsplash.com/photo-1761882619891-6529ff92df0a?w=960&h=1200&fit=crop&auto=format"
          alt="Hip hop dancer"
          className="absolute inset-0 w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#49225B]/80 via-[#0D0A10]/60 to-[#0D0A10]" />

        <div className="relative z-10 p-10">
          <button
            onClick={onBack}
            className="text-purple-400/60 hover:text-purple-400 font-condensed text-sm uppercase tracking-widest transition-colors cursor-pointer flex items-center gap-2"
          >
            ← Volver al inicio
          </button>
        </div>

        <div className="relative z-10 p-10">
          <h2 className="font-display text-6xl uppercase text-purple-50 leading-none mb-4">
            BAILA.
            <br />
            <span className="text-purple-400">CRECE.</span>
            <br />
            REGRESA.
          </h2>
          <p className="font-body text-purple-100/50 text-sm leading-relaxed">
            Tu cuenta F&A te da acceso a horarios, progreso, comunidad y mucho
            más.
          </p>
        </div>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        {/* Mobile back */}
        <button
          onClick={onBack}
          className="lg:hidden absolute top-6 left-6 text-purple-400/60 hover:text-purple-400 font-condensed text-sm uppercase tracking-widest transition-colors cursor-pointer"
        >
          ← Volver
        </button>

        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="flex justify-center mb-10">
            <img
              src={logoFna}
              alt="F&A Dance Company"
              className="h-14 w-auto object-contain"
            />
          </div>

          <h1 className="font-display text-4xl uppercase text-purple-50 text-center mb-2">
            BIENVENIDO
          </h1>
          <p className="font-body text-purple-100/50 text-sm text-center mb-10">
            Inicia sesión en tu cuenta F&A
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div>
              <label className="font-condensed text-xs uppercase tracking-wider text-purple-400 mb-1.5 block">
                Documento o correo
              </label>
              <input
                type="text"
                className={inputClass}
                placeholder="Documento (admin e instructor) o correo (estudiante)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label className="font-condensed text-xs uppercase tracking-wider text-purple-400 mb-1.5 block">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  className={inputClass + " pr-12"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-purple-400/50 hover:text-purple-400 transition-colors cursor-pointer"
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

            {/* Remember + forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="accent-purple-400 w-4 h-4"
                />
                <span className="font-body text-sm text-purple-100/50">
                  Recordarme
                </span>
              </label>
              <a
                href="#"
                className="font-body text-sm text-purple-400 hover:text-purple-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Submit */}
            <Button type="submit" size="lg" fullWidth className="mt-2">
              {enviando ? "Ingresando..." : "Iniciar sesión"}
            </Button>
            {error && (
              <p role="alert" className="font-body text-sm text-red-400">
                {error}
              </p>
            )}

            {/* Las cuentas las crea la academia al inscribir al estudiante */}
            <p className="text-center font-body text-sm text-purple-100/40 mt-2">
              ¿No tienes cuenta? La academia la crea cuando te inscribes en tu sede.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
