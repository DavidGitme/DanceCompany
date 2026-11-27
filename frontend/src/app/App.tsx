import { useState } from "react"
import Navbar from "@/modulos/landing/componentes/Navbar"
import Hero from "@/modulos/landing/componentes/Hero"
import ValueProposition from "@/modulos/landing/componentes/Nosotros"
import Estilos from "@/modulos/landing/componentes/Estilos"
import Instructors from "@/modulos/landing/componentes/Instructores"
import DanceWellness from "@/modulos/landing/componentes/Bienestar"
import Plans from "@/modulos/landing/componentes/Planes"
import Locations from "@/modulos/landing/componentes/Sedes"
import RentalForm from "@/modulos/landing/componentes/Alquiler"
import Footer from "@/modulos/landing/componentes/Footer"
import Preinscripcion from "@/modulos/landing/componentes/Preinscripcion"
import ConfirmarPreinscripcion from "@/modulos/landing/paginas/ConfirmarPreinscripcion"
import Login from "@/modulos/autenticacion/paginas/Login"
import AdminPanel from "@/app/paginas/AdminPanel"
import Button from "@/compartido/ui/Button"
import RutaProtegida from "@/app/guardas/RutaProtegida"
import { useAuth } from "@/nucleo/auth/useAuth"
import type { RutaAplicacion } from "@/app/rutas/rutas"
import { PortalInstructor } from "@/app/instructores"
import { PortalEstudiante, ROL_ESTUDIANTE } from "@/modulos/portal_estudiante"
import type { UsuarioSesion } from "@/modulos/autenticacion/dtos/autenticacionDto"
import RestablecerClave from "@/modulos/autenticacion/paginas/RestablecerClave"
import AceptarTerminos from "@/modulos/autenticacion/legal/AceptarTerminos"
import AvisoCookies from "@/modulos/autenticacion/legal/AvisoCookies"
import BotonVolverArriba from "@/compartido/ui/BotonVolverArriba"
import { useIdioma } from "@/nucleo/i18n/useIdioma"

// Enlace del correo: /restablecer?token=...
const tokenDelEnlace = () =>
  window.location.pathname === "/restablecer" ? new URLSearchParams(window.location.search).get("token") : null

// Enlace del correo de preinscripción: /confirmar-preinscripcion?token=...
const tokenPreinscripcion = () =>
  window.location.pathname === "/confirmar-preinscripcion" ? new URLSearchParams(window.location.search).get("token") : null

// Tras iniciar sesión, cada rol entra directo a su dashboard:
// instructor -> portal del instructor; estudiante y administración -> "admin"
// (App muestra el portal del estudiante a la cuenta Estudiante y el panel al resto)
function destinoSegunRol(usuario: UsuarioSesion): RutaAplicacion {
  const esInstructor = usuario.roles.includes("instructor")
  const esAdministrador = usuario.roles.includes("administrador")
  return esInstructor && !esAdministrador ? "instructor" : "admin"
}

// Cuenta válida pero sin una vista asignada (por ahora, el rol Acudiente)
function SinVistaAsignada({ nombre, onSalir }: { nombre: string; onSalir: () => void }) {
  const { t } = useIdioma()
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="font-display text-3xl uppercase text-text">{t("Hola, {nombre}", { nombre })}</h1>
        <p className="mt-3 font-body text-sm text-text-soft">
          {t("Tu cuenta está activa, pero todavía no tiene una vista asignada. Pide a la administración de la academia que revise tus roles.")}
        </p>
        <Button size="md" className="mt-6" onClick={onSalir}>
          {t("Cerrar sesión")}
        </Button>
      </div>
    </main>
  )
}

export default function App() {
  const { t } = useIdioma()
  const [isDark, setIsDark] = useState(true)
  const [page, setPage] = useState<RutaAplicacion>("home")
  const [token, setToken] = useState(tokenDelEnlace)
  const [tokenPre, setTokenPre] = useState(tokenPreinscripcion)
  const { usuario, cerrarSesion, marcarTerminosAceptados } = useAuth()
  const salir = () => {
    cerrarSesion().finally(() => setPage("home"))
  }
  const loginConRedireccion = (
    <Login
      onBack={() => setPage("home")}
      onLogin={(usuario) => setPage(destinoSegunRol(usuario))}
    />
  )

  const rootClass = ["font-body min-h-full bg-page", isDark ? "dark" : ""].join(
    " ",
  )

  if (tokenPre) {
    return (
      <div className={rootClass}>
        <ConfirmarPreinscripcion
          token={tokenPre}
          onVolver={() => {
            window.history.replaceState(null, "", "/")
            setTokenPre(null)
            setPage("home")
          }}
        />
      </div>
    )
  }

  if (token) {
    return (
      <div className={rootClass}>
        <RestablecerClave
          token={token}
          onIrALogin={() => {
            window.history.replaceState(null, "", "/")
            setToken(null)
            setPage("login")
          }}
        />
      </div>
    )
  }

  // Antes de entrar a cualquier portal, la cuenta acepta los términos vigentes
  if (usuario?.terminosPendientes && page !== "home" && page !== "login") {
    return (
      <div className={rootClass}>
        <AceptarTerminos nombre={usuario.nombre} onAceptado={marcarTerminosAceptados} onSalir={salir} />
      </div>
    )
  }

  if (page === "login") {
    return (
      <div className={rootClass}>
        {loginConRedireccion}
        <AvisoCookies />
      </div>
    )
  }

  if (page === "instructor") {
    return (
      <div className={rootClass}>
        <RutaProtegida alNoAutorizado={loginConRedireccion}>
          <PortalInstructor onSalir={salir} />
        </RutaProtegida>
      </div>
    )
  }

  // Un estudiante que inicia sesión ve su portal, no el panel de administración
  if (page === "admin" && usuario?.roles.includes(ROL_ESTUDIANTE)) {
    return (
      <div className={rootClass}>
        <PortalEstudiante nombre={usuario.nombre} onSalir={salir} />
      </div>
    )
  }

  if (page === "admin") {
    return (
      <div className={rootClass}>
        <RutaProtegida
          conModulos
          alNoAutorizado={
            usuario ? (
              <SinVistaAsignada nombre={usuario.nombre} onSalir={salir} />
            ) : (
              loginConRedireccion
            )
          }
        >
          <AdminPanel onExit={salir} />
        </RutaProtegida>
      </div>
    )
  }

  return (
    <div className={rootClass}>
      <Navbar
        isDark={isDark}
        onToggleTheme={() => setIsDark((d) => !d)}
        onLoginClick={() => setPage("login")}
      />
      <main className="landing-secciones">
        <Hero />
        <ValueProposition />
        <Estilos />
        <Instructors />
        <DanceWellness />
        <Plans />
        <Preinscripcion />
        <Locations />
        <RentalForm />
      </main>
      <Footer />
      <AvisoCookies />

      {/* Volver arriba: sobre el botón de inscripción en móvil, en la esquina en escritorio */}
      <BotonVolverArriba className="bottom-24 right-6 lg:bottom-8 lg:right-8" />

      {/* Botón flotante en móvil: la inscripción es presencial, en la sede */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <Button
          size="md"
          onClick={() => document.querySelector("#preinscripcion")?.scrollIntoView({ behavior: "smooth" })}
          className="shadow-2xl shadow-purple-700/40"
        >
          {t("Inscríbete")}
        </Button>
      </div>
    </div>
  )
}