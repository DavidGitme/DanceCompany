import { useState } from "react"
import Navbar from "@/modulos/landing/componentes/Navbar"
import Hero from "@/modulos/landing/componentes/Hero"
import ValueProposition from "@/modulos/landing/componentes/Nosotros"
import Instructors from "@/modulos/landing/componentes/Instructores"
import DanceWellness from "@/modulos/landing/componentes/Bienestar"
import Plans from "@/modulos/landing/componentes/Planes"
import Locations from "@/modulos/landing/componentes/Sedes"
import RentalForm from "@/modulos/landing/componentes/Alquiler"
import Footer from "@/modulos/landing/componentes/Footer"
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

// Enlace del correo: /restablecer?token=...
const tokenDelEnlace = () =>
  window.location.pathname === "/restablecer" ? new URLSearchParams(window.location.search).get("token") : null

// El instructor va a su portal; el resto de roles al panel administrativo
function destinoSegunRol(usuario: UsuarioSesion): RutaAplicacion {
  const esInstructor = usuario.roles.includes("instructor")
  const esAdministrador = usuario.roles.includes("administrador")
  return esInstructor && !esAdministrador ? "instructor" : "admin"
}

// Cuenta válida pero sin una vista asignada (por ahora, el rol Acudiente)
function SinVistaAsignada({ nombre, onSalir }: { nombre: string; onSalir: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <h1 className="font-display text-3xl uppercase text-text">Hola, {nombre}</h1>
        <p className="mt-3 font-body text-sm text-text-soft">
          Tu cuenta está activa, pero todavía no tiene una vista asignada. Pide a la
          administración de la academia que revise tus roles.
        </p>
        <Button size="md" className="mt-6" onClick={onSalir}>
          Cerrar sesión
        </Button>
      </div>
    </main>
  )
}

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [page, setPage] = useState<RutaAplicacion>("home")
  const [token, setToken] = useState(tokenDelEnlace)
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
      <main>
        <Hero />
        <ValueProposition />
        <Instructors />
        <DanceWellness />
        <Plans />
        <Locations />
        <RentalForm />
      </main>
      <Footer />
      <AvisoCookies />

      {/* Botón flotante en móvil: la inscripción es presencial, en la sede */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <Button
          size="md"
          onClick={() => document.querySelector("#sedes")?.scrollIntoView({ behavior: "smooth" })}
          className="shadow-2xl shadow-purple-700/40"
        >
          Inscríbete
        </Button>
      </div>
    </div>
  )
}