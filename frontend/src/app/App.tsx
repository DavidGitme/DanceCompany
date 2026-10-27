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

export default function App() {
  const [isDark, setIsDark] = useState(true)
  const [page, setPage] = useState<RutaAplicacion>("home")
  const { cerrarSesion } = useAuth()

  const rootClass = ["font-body min-h-full bg-page", isDark ? "dark" : ""].join(
    " ",
  )

  if (page === "login") {
    return (
      <div className={rootClass}>
        <Login
          onBack={() => setPage("home")}
          onLogin={() => setPage("admin")}
          onGoToRegister={() => setPage("register")}
        />
      </div>
    )
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

  if (page === "admin") {
    return (
      <div className={rootClass}>
        <RutaProtegida
          permiso="dashboard"
          alNoAutorizado={
            <Login
              onBack={() => setPage("home")}
              onLogin={() => setPage("admin")}
              onGoToRegister={() => setPage("register")}
            />
          }
        >
          <AdminPanel
            onExit={() => {
              cerrarSesion().finally(() => setPage("home"))
            }}
          />
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
