import { useCallback, useEffect, useRef, useState, type ReactElement } from "react"
import Sidebar from "@/app/admin/Sidebar"
import Dashboard from "@/app/admin/Dashboard"
import AvisoDemo from "@/app/admin/AvisoDemo"
import { buscarModulo } from "@/app/admin/navegacion"
import * as recursos from "@/app/admin/recursos"
import PantallaRecurso, { type DefinicionRecurso } from "@/compartido/ui/PantallaRecurso"
import AcudientesScreen from "@/modulos/estudiantes/paginas/AcudientesScreen"
import HorariosGrupoScreen from "@/modulos/grupos/paginas/HorariosGrupoScreen"
import NoticiasScreen from "@/modulos/landing/paginas/NoticiasScreen"
import MatriculasScreen from "@/modulos/matriculas/paginas/MatriculasScreen"
import { AdministrationProvider } from "@/modulos/pagos"
import EstadoCuentaScreen from "@/modulos/pagos/paginas/EstadoCuentaScreen"
import MensualidadesScreen from "@/modulos/pagos/paginas/MensualidadesScreen"
import PagosScreen from "@/modulos/pagos/paginas/PagosScreen"
import ConvocatoriasScreen from "@/modulos/reportes/paginas/ConvocatoriasScreen"
import PostulacionesScreen from "@/modulos/reportes/paginas/PostulacionesScreen"
import EstadosScreen from "@/modulos/seguridad/paginas/EstadosScreen"
import PersonasScreen from "@/modulos/seguridad/paginas/PersonasScreen"
import RolesPermisosScreen from "@/modulos/seguridad/paginas/RolesPermisosScreen"
import UsuariosScreen from "@/modulos/seguridad/paginas/UsuariosScreen"
import InscripcionesTallerScreen from "@/modulos/talleres/paginas/InscripcionesTallerScreen"

// Pantallas conectadas a la API con el componente común
const PANTALLAS_API: Record<string, DefinicionRecurso<any>> = {
  estudiantes: recursos.estudiantes,
  instructores: recursos.instructores,
  grupos: recursos.grupos,
  "adm-aulas": recursos.aulas,
  sedes: recursos.sedes,
  niveles: recursos.niveles,
  estilos: recursos.estilos,
  talleres: recursos.talleres,
  "adm-metodos-pago": recursos.metodosPago,
}

// Pantallas con API propia
const PANTALLAS_PROPIAS: Record<string, ReactElement> = {
  "seg-usuarios": <UsuariosScreen />,
}

// Pantallas que todavía usan datos simulados: se muestran con aviso
const PANTALLAS_DEMO: Record<string, ReactElement> = {
  "adm-agendamientos-instructores": <HorariosGrupoScreen />,
  "adm-matriculas": <MatriculasScreen />,
  "adm-inscripciones-taller": <InscripcionesTallerScreen />,
  "adm-mensualidades": <MensualidadesScreen />,
  "adm-pagos": <PagosScreen />,
  "adm-estado-cuenta": <EstadoCuentaScreen />,
  "adm-convocatorias": <ConvocatoriasScreen />,
  "adm-postulaciones": <PostulacionesScreen />,
  "adm-contenidos": <NoticiasScreen />,
  "seg-personas": <PersonasScreen />,
  "seg-acudientes": <AcudientesScreen />,
  "seg-roles-permisos": <RolesPermisosScreen />,
  "seg-estados": <EstadosScreen />,
}

interface AdminPanelProps {
  onExit: () => void
}

export default function AdminPanel({ onExit }: AdminPanelProps) {
  const [activeModule, setActiveModule] = useState("dashboard")
  const [crearAlEntrar, setCrearAlEntrar] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [menuMovil, setMenuMovil] = useState(false)
  const contenidoRef = useRef<HTMLElement>(null)

  const handleModuleChange = useCallback((id: string, crear = false) => {
    setActiveModule(id)
    setCrearAlEntrar(crear)
  }, [])

  // Al cambiar de módulo: arriba de la página y foco en el contenido
  useEffect(() => {
    contenidoRef.current?.scrollTo({ top: 0 })
    contenidoRef.current?.focus({ preventScroll: true })
  }, [activeModule])

  const cerrarMenuMovil = useCallback(() => setMenuMovil(false), [])
  const terminarCrear = useCallback(() => setCrearAlEntrar(false), [])
  const actual = buscarModulo(activeModule)

  let contenido: ReactElement
  if (activeModule === "dashboard") {
    contenido = <Dashboard onNavigate={handleModuleChange} />
  } else if (PANTALLAS_API[activeModule]) {
    contenido = (
      <PantallaRecurso
        key={activeModule}
        definicion={PANTALLAS_API[activeModule]}
        abrirCrear={crearAlEntrar}
        onCrearAbierto={terminarCrear}
      />
    )
  } else if (PANTALLAS_PROPIAS[activeModule]) {
    contenido = PANTALLAS_PROPIAS[activeModule]
  } else if (PANTALLAS_DEMO[activeModule]) {
    contenido = (
      <div className="flex flex-col gap-6">
        <AvisoDemo />
        {PANTALLAS_DEMO[activeModule]}
      </div>
    )
  } else {
    contenido = (
      <div className="flex h-64 items-center justify-center font-body text-text-muted">Módulo no encontrado</div>
    )
  }

  return (
    <AdministrationProvider>
      <div className="flex h-dvh overflow-hidden bg-surface-alt">
        <a
          href="#contenido-admin"
          className="sr-only z-[80] rounded-full bg-accent px-4 py-2 font-condensed text-sm uppercase tracking-wider text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          Saltar al contenido
        </a>

        <Sidebar
          activeModule={activeModule}
          onModuleChange={handleModuleChange}
          onExit={onExit}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((v) => !v)}
          mobileOpen={menuMovil}
          onCloseMobile={cerrarMenuMovil}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Barra superior en móvil */}
          <header className="flex h-14 flex-shrink-0 items-center gap-3 border-b border-border bg-surface px-4 lg:hidden">
            <button
              type="button"
              onClick={() => setMenuMovil(true)}
              aria-expanded={menuMovil}
              aria-controls="menu-admin"
              className="grid h-10 w-10 place-items-center rounded-full text-text hover:bg-accent/10"
              aria-label="Abrir menú"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="truncate font-condensed text-sm font-semibold uppercase tracking-wider text-text">
              {actual?.etiqueta ?? "Panel"}
            </span>
          </header>

          <main
            id="contenido-admin"
            ref={contenidoRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto outline-none"
          >
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{contenido}</div>
          </main>
        </div>
      </div>
    </AdministrationProvider>
  )
}
