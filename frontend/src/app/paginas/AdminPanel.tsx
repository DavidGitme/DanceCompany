import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useRef, useState, type ReactElement } from "react"
import Sidebar from "@/app/admin/Sidebar"
import Dashboard from "@/app/admin/Dashboard"
import AvisoDemo from "@/app/admin/AvisoDemo"
import { buscarModulo, navegacion } from "@/app/admin/navegacion"
import * as recursos from "@/app/admin/recursos"
import PantallaRecurso, { Icono, claseBotonIcono, hoverNeutro, type DefinicionRecurso } from "@/compartido/ui/PantallaRecurso"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import { useAuth } from "@/nucleo/auth/useAuth"
import { puede } from "@/nucleo/auth/requierePermiso"
import { recursoApi, mensajeError } from "@/compartido/api/recursos"
import { EdicionEstudiante, FichaEstudiante, InscripcionEstudiante, type EstudianteFicha } from "@/modulos/estudiantes"
import HorariosGrupoScreen from "@/modulos/grupos/paginas/HorariosGrupoScreen"
import NoticiasScreen from "@/modulos/landing/paginas/NoticiasScreen"
import { AdministrationProvider } from "@/modulos/pagos"
import EstadoCuentaScreen from "@/modulos/pagos/paginas/EstadoCuentaScreen"
import MensualidadesScreen from "@/modulos/pagos/paginas/MensualidadesScreen"
import PagosScreen from "@/modulos/pagos/paginas/PagosScreen"
import RolesPrivilegiosScreen from "@/modulos/seguridad/paginas/RolesPrivilegiosScreen"
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
  "adm-matriculas": recursos.matriculas,
  "adm-convocatorias": recursos.convocatorias,
  "adm-postulaciones": recursos.postulaciones,
  "adm-grupos-competencia": recursos.gruposCompetencia,
  "seg-personas": recursos.personas,
  "seg-estados": recursos.estados,
  "adm-planes": recursos.planes,
  "adm-periodos": recursos.periodos,
  "adm-preinscripciones": recursos.preinscripciones,
  "adm-solicitudes-espacio": recursos.solicitudesEspacio,
}

// Módulos que solo reciben registros (del sitio público o de otros módulos): no se crean aquí
const SIN_CREAR = ["seg-personas", "seg-estados", "adm-preinscripciones", "adm-solicitudes-espacio"]

// Pantallas con API propia
const PANTALLAS_PROPIAS: Record<string, (privilegios?: string[]) => ReactElement> = {
  "seg-usuarios": (privilegios) => <UsuariosScreen privilegios={privilegios} />,
  "seg-roles-permisos": () => <RolesPrivilegiosScreen />,
}

type EstadosPorNombre = Record<string, number>

// Pantallas que todavía usan datos simulados: se muestran con aviso
const PANTALLAS_DEMO: Record<string, ReactElement> = {
  "adm-agendamientos-instructores": <HorariosGrupoScreen />,
  "adm-inscripciones-taller": <InscripcionesTallerScreen />,
  "adm-mensualidades": <MensualidadesScreen />,
  "adm-pagos": <PagosScreen />,
  "adm-estado-cuenta": <EstadoCuentaScreen />,
  "adm-contenidos": <NoticiasScreen />,
}

interface AdminPanelProps {
  onExit: () => void
}

export default function AdminPanel({ onExit }: AdminPanelProps) {
  const { usuario } = useAuth()
  // Administrador de sede: todo el panel trabaja sobre su sede
  const sedeFija = usuario?.idSede ?? null
  // Primer módulo que el rol puede ver (el administrador entra al Inicio)
  const [activeModule, setActiveModule] = useState(() => {
    if (puede(usuario, "dashboard", "ver")) return "dashboard"
    for (const nodo of navegacion) {
      const hijo = nodo.hijos?.find((h) => puede(usuario, h.permiso, "ver"))
      if (hijo) return hijo.id
    }
    return "dashboard"
  })
  const [recargarLista, setRecargarLista] = useState(0)
  const [inscribiendo, setInscribiendo] = useState(false)
  const [ficha, setFicha] = useState<EstudianteFicha | null>(null)
  // Fila del estudiante en edición (datos + acudiente); la ficha "Ver" es solo lectura
  const [editando, setEditando] = useState<recursos.Estudiante | null>(null)
  const [recargarEstudiantes, setRecargarEstudiantes] = useState(0)
  const [aviso, setAviso] = useState<string | null>(null)
  const [crearAlEntrar, setCrearAlEntrar] = useState(false)
  const [invitando, setInvitando] = useState<recursos.Instructor | null>(null)
  const [procesandoInvitacion, setProcesandoInvitacion] = useState(false)
  const [errorInvitacion, setErrorInvitacion] = useState<string | undefined>()
  // Ids de estados de preinscripción y de solicitud de espacio (se buscan por nombre)
  const [estadosSitio, setEstadosSitio] = useState<{ pre: EstadosPorNombre; sol: EstadosPorNombre }>({ pre: {}, sol: {} })
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
  const abrirInscripcion = useCallback(() => setInscribiendo(true), [])

  useEffect(() => {
    if (!aviso) return
    const espera = window.setTimeout(() => setAviso(null), 5000)
    return () => window.clearTimeout(espera)
  }, [aviso])
  const terminarCrear = useCallback(() => setCrearAlEntrar(false), [])
  const actual = buscarModulo(activeModule)
  // Privilegios del rol en el módulo abierto (nivel 3)
  const privilegiosModulo = actual?.permiso
    ? (["ver", "crear", "editar", "eliminar"] as const).filter((a) => puede(usuario, actual.permiso!, a))
    : undefined

  useEffect(() => {
    const ruta =
      activeModule === "adm-preinscripciones" ? "/preinscripciones/estados"
      : activeModule === "adm-solicitudes-espacio" ? "/solicitudes-espacio/estados"
      : null
    if (!ruta) return
    recursoApi
      .opciones<{ idEstado: number; nombre: string }>(ruta)
      .then((lista) => {
        const mapa = Object.fromEntries(lista.map((e) => [e.nombre, e.idEstado]))
        setEstadosSitio((prev) => (activeModule === "adm-preinscripciones" ? { ...prev, pre: mapa } : { ...prev, sol: mapa }))
      })
      .catch(() => undefined)
  }, [activeModule])

  // Cambia el estado de un registro desde un botón de la fila
  const decidir = async (ruta: string, id: number, idEstado: number, mensaje: string) => {
    try {
      await recursoApi.cambiarEstado(ruta, id, idEstado)
      setAviso(mensaje)
      setRecargarLista((n) => n + 1)
    } catch (e) {
      setAviso(mensajeError(e))
    }
  }

  // Contratación: crea la cuenta del instructor y le envía el enlace para su contraseña
  const confirmarInvitacion = async () => {
    if (!invitando) return
    setProcesandoInvitacion(true)
    setErrorInvitacion(undefined)
    try {
      const r = await recursoApi.crear<{ invitacionEnviada: boolean; aviso: string | null }>(
        `/instructores/${invitando.idInstructor}/invitacion`, {},
      )
      setAviso(r.invitacionEnviada
        ? tr("Enviamos la invitación a {correo}. El enlace vence en 48 horas.", { correo: invitando.email ?? "" })
        : tr(r.aviso ?? "La cuenta quedó creada, pero el correo no salió."))
      setInvitando(null)
      setRecargarLista((n) => n + 1)
    } catch (e) {
      setErrorInvitacion(mensajeError(e))
    } finally {
      setProcesandoInvitacion(false)
    }
  }

  const botonFila = (etiqueta: string, nombre: string, icono: "check" | "cerrar" | "mas", tono: string, alPulsar: () => void) => (
    <button type="button" onClick={alPulsar} className={`${claseBotonIcono} ${tono}`} aria-label={`${tr(etiqueta)}: ${nombre}`} title={tr(etiqueta)}>
      <Icono nombre={icono} />
    </button>
  )
  const exito = "hover:bg-emerald-500/10 hover:text-emerald-500"
  const peligro = "hover:bg-red-500/10 hover:text-red-500"

  // Acciones propias de algunas filas (siempre según el privilegio de editar del módulo)
  const accionesPropias = (modulo: string): ((fila: any) => ReactElement | null) | undefined => { // eslint-disable-line @typescript-eslint/no-explicit-any
    const editar = !privilegiosModulo || privilegiosModulo.includes("editar")
    if (modulo === "adm-postulaciones" && editar) {
      return (fila: recursos.Postulacion) =>
        fila.idEstado === recursos.POSTULACION.postulado ? (
          <>
            {botonFila("Aceptar", fila.estudiante, "check", exito, () => decidirPostulacion(fila, recursos.POSTULACION.aceptado))}
            {botonFila("Rechazar", fila.estudiante, "cerrar", peligro, () => decidirPostulacion(fila, recursos.POSTULACION.rechazado))}
          </>
        ) : null
    }
    if (modulo === "adm-solicitudes-espacio" && editar) {
      const { Aprobada, Rechazada } = estadosSitio.sol
      return (fila: recursos.SolicitudEspacio) =>
        fila.estado === "Pendiente" && Aprobada && Rechazada ? (
          <>
            {botonFila("Aprobar", fila.nombre, "check", exito, () => decidir("/solicitudes-espacio", fila.idSolicitud, Aprobada, tr("La solicitud de {nombre} quedó aprobada.", { nombre: fila.nombre })))}
            {botonFila("Rechazar", fila.nombre, "cerrar", peligro, () => decidir("/solicitudes-espacio", fila.idSolicitud, Rechazada, tr("La solicitud de {nombre} quedó rechazada.", { nombre: fila.nombre })))}
          </>
        ) : null
    }
    if (modulo === "adm-preinscripciones" && editar) {
      const { Atendida, Descartada } = estadosSitio.pre
      return (fila: recursos.Preinscripcion) =>
        ["Por confirmar", "Confirmada"].includes(fila.estado) && Atendida && Descartada ? (
          <>
            {botonFila("Marcar como atendida", fila.nombre, "check", exito, () => decidir("/preinscripciones", fila.idPreinscripcion, Atendida, tr("La preinscripción de {nombre} quedó atendida.", { nombre: fila.nombre })))}
            {botonFila("Descartar", fila.nombre, "cerrar", peligro, () => decidir("/preinscripciones", fila.idPreinscripcion, Descartada, tr("La preinscripción de {nombre} quedó descartada.", { nombre: fila.nombre })))}
          </>
        ) : null
    }
    if (modulo === "instructores" && (!privilegiosModulo || privilegiosModulo.includes("crear"))) {
      return (fila: recursos.Instructor) =>
        !fila.tieneCuenta && fila.idEstado === 1
          ? botonFila("Invitar a crear su cuenta", fila.nombre, "mas", "hover:bg-accent/10 hover:text-accent", () => { setErrorInvitacion(undefined); setInvitando(fila) })
          : null
    }
    return undefined
  }

  // Aceptar o rechazar una postulación sin abrir el formulario
  const decidirPostulacion = async (fila: recursos.Postulacion, idEstado: number) => {
    try {
      await recursoApi.cambiarEstado("/postulaciones", fila.idPostulacion, idEstado)
      setAviso(`La postulación de ${fila.estudiante} quedó ${idEstado === recursos.POSTULACION.aceptado ? "aceptada" : "rechazada"}.`)
      setRecargarLista((n) => n + 1)
    } catch (e) {
      setAviso(mensajeError(e))
    }
  }

  let contenido: ReactElement
  if (activeModule === "dashboard") {
    contenido = <Dashboard onNavigate={handleModuleChange} />
  } else if (activeModule === "estudiantes") {
    // Estudiantes: "Nuevo" abre la inscripción, "Ver" la ficha (solo lectura) y "Editar" la edición con acudiente
    contenido = (
      <PantallaRecurso
        key={activeModule}
        definicion={recursos.estudiantes}
        privilegios={privilegiosModulo}
        abrirCrear={crearAlEntrar}
        onCrearAbierto={terminarCrear}
        sedeFija={sedeFija}
        alCrear={abrirInscripcion}
        alEditar={(fila: recursos.Estudiante) => setEditando(fila)}
        recargar={recargarEstudiantes}
        accionesFila={(fila: recursos.Estudiante) => (
          <button
            type="button"
            onClick={() => setFicha(fila as unknown as EstudianteFicha)}
            className={`${claseBotonIcono} ${hoverNeutro}`}
            aria-label={`Ver ficha de ${fila.nombre}`}
            title={tr("Ver ficha")}
          >
            <Icono nombre="ojo" />
          </button>
        )}
      />
    )
  } else if (PANTALLAS_API[activeModule]) {
    contenido = (
      <PantallaRecurso
        key={activeModule}
        definicion={PANTALLAS_API[activeModule]}
        abrirCrear={crearAlEntrar}
        onCrearAbierto={terminarCrear}
        sedeFija={sedeFija}
        privilegios={privilegiosModulo}
        recargar={recargarLista}
        // Sedes: el administrador de sede consulta todas, pero solo gestiona la suya y no crea sedes.
        // Personas y estados no se crean desde aquí.
        permiteCrear={!(activeModule === "sedes" && sedeFija) && !SIN_CREAR.includes(activeModule)}
        puedeGestionar={
          activeModule === "seg-estados"
            ? () => false
            : activeModule === "sedes" && sedeFija
              ? (fila: any) => (fila as recursos.Sede).idSede === sedeFija // eslint-disable-line @typescript-eslint/no-explicit-any
              : activeModule === "instructores" && sedeFija
                // Los instructores se ven en las dos sedes, pero cada administrador solo gestiona los de la suya
                ? (fila: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
                    const sedes = (fila as recursos.Instructor).sedes ?? []
                    return sedes.length === 0 || sedes.some((s) => s.idSede === sedeFija)
                  }
                : undefined
        }
        accionesFila={accionesPropias(activeModule)        }
      />
    )
  } else if (PANTALLAS_PROPIAS[activeModule]) {
    contenido = PANTALLAS_PROPIAS[activeModule](privilegiosModulo)
  } else if (PANTALLAS_DEMO[activeModule]) {
    contenido = (
      <div className="flex flex-col gap-6">
        <AvisoDemo />
        {PANTALLAS_DEMO[activeModule]}
      </div>
    )
  } else {
    contenido = (
      <div className="flex h-64 items-center justify-center font-body text-text-muted">{tr("Módulo no encontrado")}</div>
    )
  }

  return (
    <AdministrationProvider>
      <div className="flex h-dvh overflow-hidden bg-surface-alt">
        <a
          href="#contenido-admin"
          className="sr-only z-[80] rounded-full bg-accent px-4 py-2 font-condensed text-sm uppercase tracking-wider text-on-accent focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
        >
          {tr("Saltar al contenido")}
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
              aria-label={tr("Abrir menú")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-6 w-6" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            <span className="truncate font-condensed text-sm font-semibold uppercase tracking-wider text-text">
              {actual?.etiqueta ? tr(actual.etiqueta) : tr("Panel")}
            </span>
          </header>

          <main
            id="contenido-admin"
            ref={contenidoRef}
            tabIndex={-1}
            className="flex-1 overflow-y-auto outline-none"
          >
            {/* Usa el ancho disponible; el tope solo evita líneas ilegibles en monitores muy anchos */}
            <div className="mx-auto w-full max-w-[120rem] px-4 py-6 sm:px-6 sm:py-8 xl:px-10">{contenido}</div>
          </main>
          {aviso && (
            <p role="status" className="fixed right-6 top-4 z-[70] rounded-2xl border border-emerald-500/30 bg-surface px-5 py-4 font-body text-sm font-semibold text-emerald-700 shadow-2xl dark:text-emerald-300">
              {aviso}
            </p>
          )}
        </div>
      </div>
      {inscribiendo && (
        <InscripcionEstudiante
          sedeFija={sedeFija}
          nombreSede={usuario?.sede}
          cargarCatalogo={recursos.opcionesCatalogo}
          onCerrar={() => setInscribiendo(false)}
          onInscrito={(r) => {
            setInscribiendo(false)
            setRecargarEstudiantes((n) => n + 1)
            const extras = [r.idMatricula ? tr("matriculado") : "", r.cuentaCreada ? tr("con cuenta del portal") : ""].filter(Boolean)
            const correo = r.correoEnviado ? ` ${tr("Le enviamos un correo con su acceso.")}` : r.aviso ? ` ${tr(r.aviso)}` : ""
            setAviso(`${tr("{nombre} quedó inscrito", { nombre: r.estudiante.nombre })}${extras.length ? ` (${extras.join(tr(" y "))})` : ""}.${correo}`)
          }}
        />
      )}
      {ficha && (
        <FichaEstudiante
          estudiante={ficha}
          onCerrar={() => setFicha(null)}
        />
      )}
      <ConfirmDialog
        open={Boolean(invitando)}
        title={tr("Invitar a crear su cuenta")}
        message={
          invitando
            ? invitando.email
              ? tr("Se creará la cuenta de {nombre} con el rol Instructor y le enviaremos a {correo} un enlace para crear su contraseña (vence en 48 horas). Iniciará sesión con su documento.", { nombre: invitando.nombre, correo: invitando.email })
              : tr("{nombre} no tiene correo registrado. Edita al instructor y agrega su correo para poder invitarlo.", { nombre: invitando.nombre })
            : ""
        }
        confirmLabel={tr("Enviar invitación")}
        blockedMessage={invitando && !invitando.email ? tr("Falta el correo del instructor.") : errorInvitacion}
        loading={procesandoInvitacion}
        onConfirm={confirmarInvitacion}
        onClose={() => setInvitando(null)}
      />
      {editando && (
        <EdicionEstudiante
          estudiante={editando}
          cargarCatalogo={recursos.opcionesCatalogo}
          onCerrar={() => setEditando(null)}
          onGuardado={(nombre) => {
            setEditando(null)
            setRecargarEstudiantes((n) => n + 1)
            setAviso(tr("Los datos de {nombre} se actualizaron.", { nombre }))
          }}
        />
      )}
    </AdministrationProvider>
  )
}
