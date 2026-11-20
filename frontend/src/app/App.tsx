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
import Register from "@/modulos/autenticacion/paginas/Registro"
import AdminPanel from "@/app/paginas/AdminPanel"
import Button from "@/compartido/ui/Button"
import RutaProtegida from "@/app/guardas/RutaProtegida"
import { useAuth } from "@/nucleo/auth/useAuth"
import type { RutaAplicacion } from "@/app/rutas/rutas"
import { PortalInstructor } from "@/app/instructores"
import { PortalEstudiante, ROL_ESTUDIANTE } from "@/modulos/portal_estudiante"
import type { UsuarioSesion } from "@/modulos/autenticacion/dtos/autenticacionDto"

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
  const { usuario, cerrarSesion } = useAuth()
  const salir = () => {
    cerrarSesion().finally(() => setPage("home"))
  }
  const loginConRedireccion = (
    <Login
      onBack={() => setPage("home")}
      onLogin={(usuario) => setPage(destinoSegunRol(usuario))}
      onGoToRegister={() => setPage("register")}
    />
  )

  const rootClass = ["font-body min-h-full bg-page", isDark ? "dark" : ""].join(
    " ",
  )

  if (page === "login") {
    return <div className={rootClass}>{loginConRedireccion}</div>
  }

  if (page === "register") {
    return (
      <div className={rootClass}>
        <Register
          onBack={() => setPage("home")}
          onGoToLogin={() => setPage("login")}
          onRegister={(data) => {
            // Aquí luego se conecta al backend (persona -> usuarios -> usuarios_roles).
            // Por ahora, solo visual: mandamos al usuario a iniciar sesión.
            console.log("Registro (visual, sin backend aún):", data)
            setPage("login")
          }}
        />
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
          permiso="dashboard"
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
        onRegisterClick={() => setPage("register")}
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

      {/* Floating CTA — always visible on mobile */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden">
        <Button
          size="md"
          onClick={() => setPage("register")}
          className="shadow-2xl shadow-purple-700/40"
        >
          Regístrate
        </Button>
      </div>
    </div>
  )
}