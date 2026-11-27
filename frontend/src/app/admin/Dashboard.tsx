import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { recursoApi } from "@/compartido/api/recursos"
import { clienteHttp } from "@/nucleo/http/clienteHttp"
import { useAuth } from "@/nucleo/auth/useAuth"
import { requierePermiso } from "@/nucleo/auth/requierePermiso"
import { formatoPesos, type Sede } from "@/app/admin/recursos"

/*
 * Dashboard del administrador. Todo sale de la base de datos:
 * conteos de /estudiantes, /grupos, /instructores, /convocatorias y /sedes,
 * finanzas de GET /reportes/finanzas (reportes_sql.py) y los últimos pagos de /pagos.
 * Distribución en cuadrícula tipo bento (patrón de los dashboards de 21st.dev):
 * indicadores arriba, recaudo y tendencia en el centro, cartera y pagos abajo.
 */

interface DashboardProps {
  // Abre un módulo (solo navegación: las acciones de creación están en cada módulo)
  onNavigate: (modulo: string) => void
}

// GET /reportes/finanzas
interface ResumenFinanciero {
  periodo: string
  corte: string
  mensualidades: { esperado: string; recaudado: string; pendiente: string; cantidad: number; pagadas: number }
  recibido: { total: string; mensualidad: string; matricula: string; taller: string; cantidad: number }
  vencidas: {
    cantidad: number
    valor: string
    estudiantes: number
    detalle: { idMensualidad: number; estudiante: string; grupo: string; periodo: string; fecha_limite: string; saldo: string; estado: string }[]
  }
  estudiantes: { matriculados: number; alDia: number; conVencidas: number }
  serie: { periodo: string; esperado: string; recaudado: string; pendiente: string; recibido: string }[]
}

interface Pago {
  idPago: number
  concepto: string
  monto: string
  fecha_pago: string
  pagador: string
  estudiante: string | null
  metodo: string
}

// Cada dato se carga aparte: si falta un permiso o falla una ruta, el resto se muestra
type Dato<T> = { estado: "cargando" } | { estado: "listo"; valor: T } | { estado: "error" }

const ESTADO_ACTIVO = 1
const MESES_SERIE = 12

const hoy = new Date()
const aIso = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`
const mesActual = aIso(hoy).slice(0, 7)
const nombreMes = (periodo: string, corto = false) =>
  new Date(`${periodo}-15T12:00:00`).toLocaleDateString(tr("es-CO"), corto ? { month: "short" } : { month: "long", year: "numeric" })
const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString(tr("es-CO"), { day: "numeric", month: "short", year: "numeric" })
// Valores cortos para ejes: $ 1,2 M · $ 350 mil
const pesosCortos = (v: number) =>
  v >= 1_000_000 ? `$ ${(v / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M` : v >= 1000 ? `$ ${Math.round(v / 1000)} ${tr("mil")}` : `$ ${v}`
const iniciales = (nombre: string) =>
  nombre.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("")

const contar = (ruta: string, parametros: Record<string, string | number | undefined> = {}) =>
  recursoApi.listar(ruta, { ...parametros, tamano: 1 }).then((r) => r.total)

function useDato<T>(cargar: () => Promise<T>, habilitado: boolean, version: number | string): Dato<T> {
  const [dato, setDato] = useState<Dato<T>>({ estado: "cargando" })
  useEffect(() => {
    if (!habilitado) {
      setDato({ estado: "error" })
      return
    }
    let vigente = true
    setDato({ estado: "cargando" })
    cargar()
      .then((valor) => vigente && setDato({ estado: "listo", valor }))
      .catch(() => vigente && setDato({ estado: "error" }))
    return () => {
      vigente = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [habilitado, version])
  return dato
}

function Valor<T>({ dato, children, alto = "h-9 w-20" }: { dato: Dato<T>; children: (valor: T) => ReactNode; alto?: string }) {
  if (dato.estado === "cargando") return <span className={`esqueleto inline-block rounded-lg align-middle ${alto}`} aria-label={tr("Cargando")} />
  if (dato.estado === "error") return <span className="text-text-muted" title={tr("Sin datos o sin permiso")}>—</span>
  return <>{children(dato.valor)}</>
}

/* ─── Iconos (Heroicons Outline 1.5) ─── */

const RUTAS = {
  estudiantes: "M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5",
  grupos: "M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z",
  instructores: "M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Zm6-10.125a1.875 1.875 0 1 1-3.75 0 1.875 1.875 0 0 1 3.75 0Zm1.294 6.336a6.721 6.721 0 0 1-3.17.789 6.721 6.721 0 0 1-3.168-.789 3.376 3.376 0 0 1 6.338 0Z",
  convocatorias: "M10.34 15.84c-.688-.06-1.386-.09-2.09-.09H7.5a4.5 4.5 0 1 1 0-9h.75c.704 0 1.402-.03 2.09-.09m0 9.18c.253.962.584 1.892.985 2.783.247.55.06 1.21-.463 1.511l-.657.38c-.551.318-1.26.117-1.527-.461a20.845 20.845 0 0 1-1.44-4.282m3.102.069a18.03 18.03 0 0 1-.59-4.59c0-1.586.205-3.124.59-4.59m0 9.18a23.848 23.848 0 0 1 8.835 2.535M10.34 6.66a23.847 23.847 0 0 0 8.835-2.535m0 0A23.74 23.74 0 0 0 18.795 3m.38 1.125a23.91 23.91 0 0 1 1.014 5.395m-1.014 8.855c-.118.38-.245.754-.38 1.125m.38-1.125a23.91 23.91 0 0 0 1.014-5.395m0-3.46c.495.413.811 1.035.811 1.73 0 .695-.316 1.317-.811 1.73m0-3.46a24.347 24.347 0 0 1 0 3.46",
  recargar: "M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99",
  flecha: "M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3",
  alerta: "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  check: "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z",
  sede: "M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z",
  pagos: "M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z",
} as const

function Icono({ nombre, clase = "h-5 w-5" }: { nombre: keyof typeof RUTAS; clase?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={`${clase} shrink-0`} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={RUTAS[nombre]} />
    </svg>
  )
}

/* ─── Piezas ─── */

function Panel({ titulo, id, detalle, accion, className = "", children }: { titulo: string; id: string; detalle?: ReactNode; accion?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className={`flex min-w-0 flex-col rounded-2xl border border-border bg-surface p-5 sm:p-6 ${className}`}>
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={id} className="font-condensed text-base font-bold uppercase tracking-[0.12em] text-text">{tr(titulo)}</h2>
          {detalle && <p className="mt-0.5 font-body text-xs text-text-muted">{detalle}</p>}
        </div>
        {accion}
      </div>
      {children}
    </section>
  )
}

function EnlaceModulo({ etiqueta, onClick }: { etiqueta: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group inline-flex items-center gap-1.5 rounded-full px-2 py-1 font-condensed text-xs font-semibold uppercase tracking-wider text-accent transition-colors hover:bg-accent/10"
    >
      {tr(etiqueta)}
      <Icono nombre="flecha" clase="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
    </button>
  )
}

function Indicador({ etiqueta, icono, dato, detalle, onClick }: { etiqueta: string; icono: keyof typeof RUTAS; dato: Dato<number>; detalle: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group relative flex flex-col gap-4 overflow-hidden rounded-2xl border border-border bg-surface p-5 text-left transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-accent/50 disabled:pointer-events-none"
    >
      <span className="flex items-center justify-between gap-3">
        <span className="font-condensed text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{tr(etiqueta)}</span>
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent/10 text-accent">
          <Icono nombre={icono} />
        </span>
      </span>
      <span className="display text-5xl leading-none text-text tabular-nums">
        <Valor dato={dato}>{(v) => v.toLocaleString("es-CO")}</Valor>
      </span>
      <span className="flex items-center justify-between gap-2 font-body text-xs text-text-soft">
        {tr(detalle)}
        {onClick && <Icono nombre="flecha" clase="h-4 w-4 text-accent transition-transform group-hover:translate-x-1" />}
      </span>
    </button>
  )
}

// Anillo de progreso: porcentaje de lo esperado que ya se recaudó
function Anillo({ porcentaje, children, tono = "text-accent" }: { porcentaje: number; children: ReactNode; tono?: string }) {
  const radio = 52
  const perimetro = 2 * Math.PI * radio
  return (
    <div className="relative mx-auto grid h-40 w-40 place-items-center">
      <svg viewBox="0 0 120 120" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={radio} fill="none" strokeWidth="10" className="stroke-surface-alt" />
        <circle
          cx="60"
          cy="60"
          r={radio}
          fill="none"
          strokeWidth="10"
          strokeLinecap="round"
          stroke="currentColor"
          className={`${tono} transition-[stroke-dashoffset] duration-700 motion-reduce:transition-none`}
          strokeDasharray={perimetro}
          strokeDashoffset={perimetro * (1 - Math.min(1, Math.max(0, porcentaje / 100)))}
        />
      </svg>
      <div className="relative text-center">{children}</div>
    </div>
  )
}

function Fila({ color, etiqueta, valor, icono }: { color: string; etiqueta: string; valor: ReactNode; icono?: ReactNode }) {
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="flex items-center gap-2 font-body text-sm text-text-soft">
        {icono ?? <span className={`h-2.5 w-2.5 rounded-full ${color}`} aria-hidden="true" />}
        {tr(etiqueta)}
      </span>
      <span className="font-body text-sm font-semibold tabular-nums text-text">{valor}</span>
    </li>
  )
}

/* ─── Dashboard ─── */

export default function Dashboard({ onNavigate }: DashboardProps) {
  const { usuario } = useAuth()
  const [version, setVersion] = useState(0)
  const puede = useCallback((permiso: string) => requierePermiso(usuario, permiso), [usuario])

  const estudiantes = useDato(() => contar("/estudiantes", { estado: ESTADO_ACTIVO }), puede("estudiantes"), version)
  const grupos = useDato(() => contar("/grupos", { estado: ESTADO_ACTIVO }), puede("grupos"), version)
  // Los instructores se comparten entre sedes: el administrador de sede cuenta los de la suya
  const sedePropia = usuario?.idSede ?? undefined
  const instructores = useDato(() => contar("/instructores", { estado: ESTADO_ACTIVO, sede: sedePropia }), puede("instructores"), version)
  const convocatorias = useDato(() => contar("/convocatorias", { vigencia: "abierta" }), puede("convocatorias"), version)
  const sedes = useDato(
    () =>
      recursoApi
        .listar<Sede>("/sedes", { estado: ESTADO_ACTIVO, tamano: 100 })
        .then((r) => r.datos.filter((s) => !sedePropia || s.idSede === sedePropia)),
    puede("sedes"),
    version,
  )
  const [periodo, setPeriodo] = useState(mesActual)
  const verFinanzas = puede("pagos")
  const finanzas = useDato(
    () => clienteHttp.get<ResumenFinanciero>(`/reportes/finanzas?periodo=${periodo}&meses=${MESES_SERIE}`),
    verFinanzas,
    `${version}-${periodo}`,
  )
  const ultimosPagos = useDato(() => recursoApi.listar<Pago>("/pagos", { tamano: 6 }).then((r) => r.datos), verFinanzas, version)
  const nombre = usuario?.nombre.split(" ")[0] ?? ""

  return (
    <div className="flex flex-col gap-5">
      {/* Encabezado con el filtro del mes (aplica a recaudo, ingresos y cartera) */}
      <header className="flex flex-wrap items-end justify-between gap-4 pb-1">
        <div>
          <p className="font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            {hoy.toLocaleDateString(tr("es-CO"), { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="display mt-2 text-5xl text-text sm:text-6xl">
            {tr("Hola")}{nombre ? "," : ""} <span className="text-blush">{nombre}</span>
          </h1>
          <p className="mt-2 font-body text-sm text-text-soft">
            {usuario?.sede ? tr("Resumen de la sede {sede}.", { sede: usuario.sede }) : tr("Resumen de todas las sedes.")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {verFinanzas && (
            <label className="flex items-center gap-2 rounded-full border border-border bg-surface py-1 pl-4 pr-1 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
              {tr("Mes")}
              <input
                type="month"
                value={periodo}
                max={mesActual}
                onChange={(e) => e.target.value && setPeriodo(e.target.value)}
                className="rounded-full bg-surface-alt px-3 py-1.5 font-body text-sm normal-case tracking-normal text-text [color-scheme:light] dark:[color-scheme:dark]"
              />
            </label>
          )}
          <button
            type="button"
            onClick={() => setVersion((v) => v + 1)}
            aria-label={tr("Actualizar datos")}
            title={tr("Actualizar datos")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border bg-surface text-text-soft transition-colors hover:border-accent hover:text-text"
          >
            <Icono nombre="recargar" />
          </button>
        </div>
      </header>

      {/* Indicadores */}
      <section aria-label={tr("Indicadores")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Indicador etiqueta="Estudiantes activos" icono="estudiantes" dato={estudiantes} detalle={usuario?.sede ? `${tr("Sede")} ${usuario.sede}` : "En todas las sedes"} onClick={puede("estudiantes") ? () => onNavigate("estudiantes") : undefined} />
        <Indicador etiqueta="Grupos activos" icono="grupos" dato={grupos} detalle="Con cupos e instructor" onClick={puede("grupos") ? () => onNavigate("grupos") : undefined} />
        <Indicador etiqueta="Instructores activos" icono="instructores" dato={instructores} detalle="Asignados a sedes" onClick={puede("instructores") ? () => onNavigate("instructores") : undefined} />
        <Indicador etiqueta="Convocatorias abiertas" icono="convocatorias" dato={convocatorias} detalle="Recibiendo postulaciones" onClick={puede("convocatorias") ? () => onNavigate("adm-convocatorias") : undefined} />
      </section>

      {verFinanzas && (
        <>
          <div className="grid gap-5 lg:grid-cols-12">
            <Recaudo dato={finanzas} className="lg:col-span-5 xl:col-span-4" />
            <Tendencia dato={finanzas} periodo={periodo} className="lg:col-span-7 xl:col-span-8" />
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-12">
            <EstadoEstudiantes dato={finanzas} className="xl:col-span-4" />
            <IngresosConcepto dato={finanzas} className="xl:col-span-4" />
            <EstudiantesSede dato={sedes} className="md:col-span-2 xl:col-span-4" onVer={puede("sedes") ? () => onNavigate("sedes") : undefined} />
          </div>

          <div className="grid gap-5 lg:grid-cols-12">
            <Cartera dato={finanzas} className="lg:col-span-7" onVer={() => onNavigate("adm-mensualidades")} />
            <UltimosPagos dato={ultimosPagos} className="lg:col-span-5" onVer={() => onNavigate("adm-pagos")} />
          </div>
        </>
      )}

      {!verFinanzas && <EstudiantesSede dato={sedes} onVer={puede("sedes") ? () => onNavigate("sedes") : undefined} />}
    </div>
  )
}

/* ─── Recaudo de mensualidades del mes ─── */

function Recaudo({ dato, className }: { dato: Dato<ResumenFinanciero>; className?: string }) {
  return (
    <Panel
      id="titulo-recaudo"
      titulo="Recaudo del mes"
      className={className}
      detalle={<Valor dato={dato} alto="h-3 w-32">{(f) => <span className="inline-block first-letter:uppercase">{nombreMes(f.periodo)}</span>}</Valor>}
    >
      <Valor dato={dato} alto="h-64 w-full">
        {(f) => {
          const esperado = Number(f.mensualidades.esperado)
          const recaudado = Number(f.mensualidades.recaudado)
          const porcentaje = esperado ? Math.round((recaudado / esperado) * 100) : 0
          if (!f.mensualidades.cantidad) {
            return (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border p-6 text-center">
                <Icono nombre="pagos" clase="h-8 w-8 text-text-muted" />
                <p className="font-body text-sm text-text-soft">{tr("No hay mensualidades cobradas en este mes.")}</p>
                <p className="font-body text-xs text-text-muted">{tr("Elige otro mes arriba para ver su recaudo.")}</p>
              </div>
            )
          }
          return (
            <div className="flex flex-1 flex-col gap-5">
              <Anillo porcentaje={porcentaje}>
                <span className="display block text-4xl leading-none text-text tabular-nums">{porcentaje}%</span>
                <span className="mt-1 block font-condensed text-[11px] uppercase tracking-[0.18em] text-text-muted">{tr("recaudado")}</span>
              </Anillo>
              <ul className="divide-y divide-border border-t border-border">
                <Fila color="bg-surface-alt border border-border" etiqueta="Esperado" valor={formatoPesos(esperado)} />
                <Fila color="bg-accent" etiqueta="Recaudado" valor={formatoPesos(recaudado)} />
                <Fila color="bg-blush" etiqueta="Pendiente" valor={formatoPesos(f.mensualidades.pendiente)} />
              </ul>
              <p className="font-body text-xs text-text-muted">
                {tr("{p} de {n} mensualidades pagadas", { p: f.mensualidades.pagadas, n: f.mensualidades.cantidad })}
              </p>
            </div>
          )
        }}
      </Valor>
    </Panel>
  )
}

/* ─── Tendencia de los últimos 12 meses ─── */

function Tendencia({ dato, periodo, className }: { dato: Dato<ResumenFinanciero>; periodo: string; className?: string }) {
  const [tabla, setTabla] = useState(false)
  return (
    <Panel
      id="titulo-tendencia"
      titulo="Mensualidades por mes"
      className={className}
      detalle={tr("Últimos {n} meses · esperado frente a recaudado", { n: MESES_SERIE })}
      accion={
        <button type="button" onClick={() => setTabla((t) => !t)} aria-expanded={tabla} className="shrink-0 whitespace-nowrap rounded-full border border-border px-3 py-1 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft transition-colors hover:border-accent hover:text-text">
          {tr(tabla ? "Ver gráfica" : "Ver como tabla")}
        </button>
      }
    >
      <Valor dato={dato} alto="h-64 w-full">
        {(f) => (
          <div className="flex flex-1 flex-col gap-4">
            {tabla ? <TablaMeses serie={f.serie} /> : <GraficoMeses serie={f.serie} periodo={periodo} />}
            <details className="mt-auto rounded-xl border border-border bg-surface-alt/40 p-3 font-body text-xs text-text-soft">
              <summary className="cursor-pointer font-condensed text-xs font-semibold uppercase tracking-wider text-text">{tr("Cómo se calculan")}</summary>
              <ul className="mt-2 list-disc space-y-1 pl-5">
                <li>{tr("Esperado: suma del valor de las mensualidades cobradas en el mes (fecha de cobro).")}</li>
                <li>{tr("Recaudado y pendiente: lo pagado y el saldo de esas mismas mensualidades.")}</li>
                <li>{tr("Recibido: todos los pagos con fecha en el mes (mensualidad, matrícula o taller).")}</li>
                <li>{tr("Vencida: mensualidad con saldo y fecha límite anterior a hoy, o en estado Vencida o Mora.")}</li>
                <li>{tr("Al día: estudiante activo con matrícula activa y sin mensualidades vencidas.")}</li>
                <li>{tr("No incluye ingresos que no estén registrados como mensualidades o pagos.")}</li>
              </ul>
            </details>
          </div>
        )}
      </Valor>
    </Panel>
  )
}

function TablaMeses({ serie }: { serie: ResumenFinanciero["serie"] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left font-body text-sm">
        <caption className="sr-only">{tr("Mensualidades e ingresos por mes")}</caption>
        <thead>
          <tr className="border-b border-border font-condensed text-xs uppercase tracking-wider text-text-muted">
            <th scope="col" className="py-2 pr-4">{tr("Mes")}</th>
            <th scope="col" className="py-2 pr-4 text-right">{tr("Esperado")}</th>
            <th scope="col" className="py-2 pr-4 text-right">{tr("Recaudado")}</th>
            <th scope="col" className="py-2 pr-4 text-right">{tr("Pendiente")}</th>
            <th scope="col" className="py-2 text-right">{tr("Recibido (todos los conceptos)")}</th>
          </tr>
        </thead>
        <tbody>
          {serie.map((p) => (
            <tr key={p.periodo} className="border-b border-border last:border-0">
              <th scope="row" className="py-2 pr-4 font-semibold capitalize text-text">{nombreMes(p.periodo)}</th>
              <td className="py-2 pr-4 text-right tabular-nums text-text-soft">{formatoPesos(p.esperado)}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-text-soft">{formatoPesos(p.recaudado)}</td>
              <td className="py-2 pr-4 text-right tabular-nums text-text-soft">{formatoPesos(p.pendiente)}</td>
              <td className="py-2 text-right tabular-nums text-text-soft">{formatoPesos(p.recibido)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Barra por mes: la pista es lo esperado y el relleno lo recaudado de esas mensualidades
function GraficoMeses({ serie, periodo }: { serie: ResumenFinanciero["serie"]; periodo: string }) {
  const [activo, setActivo] = useState<string | null>(null)
  const sinDatos = serie.every((p) => Number(p.esperado) === 0 && Number(p.recaudado) === 0)
  if (sinDatos) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border text-center">
        <p className="font-body text-sm text-text-soft">{tr("No hay mensualidades registradas en los últimos {n} meses.", { n: serie.length })}</p>
      </div>
    )
  }
  const tope = Math.max(1, ...serie.map((p) => Number(p.esperado)))
  // Escala redondeada para que las líneas guía caigan en valores legibles
  const paso = Math.pow(10, Math.floor(Math.log10(tope)))
  const maximo = Math.ceil(tope / paso) * paso
  const guias = [1, 0.5, 0]
  return (
    <figure className="flex flex-col">
      <figcaption className="mb-4 flex flex-wrap items-center gap-4 font-body text-xs text-text-soft">
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-accent/50 bg-accent/15" aria-hidden="true" />{tr("Esperado")}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-accent" aria-hidden="true" />{tr("Recaudado")}</span>
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-3">
        {/* Eje Y */}
        <div className="relative h-56 w-14 font-body text-[11px] tabular-nums text-text-muted" aria-hidden="true">
          {guias.map((g) => (
            <span key={g} className="absolute right-0 -translate-y-1/2" style={{ top: `${(1 - g) * 100}%` }}>{pesosCortos(maximo * g)}</span>
          ))}
        </div>
        <div className="relative">
          {guias.map((g) => (
            <span key={g} className={`absolute inset-x-0 h-px ${g === 0 ? "bg-border" : "bg-border/60"}`} style={{ top: `${(1 - g) * 100}%` }} aria-hidden="true" />
          ))}
          <div className="relative grid h-56 items-end gap-1.5 sm:gap-2.5" style={{ gridTemplateColumns: `repeat(${serie.length}, minmax(0, 1fr))` }} role="list">
            {serie.map((p, i) => {
              const esperado = Number(p.esperado)
              const recaudado = Number(p.recaudado)
              const enfoque = activo === p.periodo
              const actual = p.periodo === periodo
              const alLado = i >= serie.length - 3 ? "right-0" : i < 3 ? "left-0" : "left-1/2 -translate-x-1/2"
              return (
                <div
                  key={p.periodo}
                  role="listitem"
                  tabIndex={0}
                  onMouseEnter={() => setActivo(p.periodo)}
                  onMouseLeave={() => setActivo(null)}
                  onFocus={() => setActivo(p.periodo)}
                  onBlur={() => setActivo(null)}
                  aria-label={tr("{mes}: esperado {e}, recaudado {r}, recibido {t}", { mes: nombreMes(p.periodo), e: formatoPesos(esperado), r: formatoPesos(recaudado), t: formatoPesos(p.recibido) })}
                  className="relative flex h-full flex-col justify-end rounded-md outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {enfoque && <span className="absolute inset-0 rounded-md bg-accent/5" aria-hidden="true" />}
                  {enfoque && (
                    <div className={`pointer-events-none absolute bottom-full z-10 mb-2 w-44 rounded-xl border border-border bg-surface p-3 font-body text-xs text-text-soft shadow-xl ${alLado}`}>
                      <p className="mb-1 font-semibold capitalize text-text">{nombreMes(p.periodo)}</p>
                      <p>{tr("Esperado")}: <span className="tabular-nums text-text">{formatoPesos(esperado)}</span></p>
                      <p>{tr("Recaudado")}: <span className="tabular-nums text-text">{formatoPesos(recaudado)}</span></p>
                      <p>{tr("Pendiente")}: <span className="tabular-nums text-text">{formatoPesos(p.pendiente)}</span></p>
                      <p>{tr("Recibido")}: <span className="tabular-nums text-text">{formatoPesos(p.recibido)}</span></p>
                    </div>
                  )}
                  <div
                    className={`relative mx-auto w-full max-w-10 rounded-t-[4px] border border-b-0 bg-accent/10 transition-colors ${enfoque || actual ? "border-accent" : "border-accent/40"}`}
                    style={{ height: `${(esperado / maximo) * 100}%`, minHeight: esperado ? 4 : 0 }}
                  >
                    <div className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-accent" style={{ height: esperado ? `${Math.min(100, (recaudado / esperado) * 100)}%` : 0 }} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-2 grid gap-1.5 sm:gap-2.5" style={{ gridTemplateColumns: `repeat(${serie.length}, minmax(0, 1fr))` }} aria-hidden="true">
            {serie.map((p, i) => (
              <span
                key={p.periodo}
                className={`text-center font-condensed text-[11px] uppercase tracking-wider ${p.periodo === periodo ? "font-bold text-text" : "text-text-muted"} ${i % 2 === 1 ? "max-sm:invisible" : ""}`}
              >
                {nombreMes(p.periodo, true).replace(".", "")}
              </span>
            ))}
          </div>
        </div>
      </div>
    </figure>
  )
}

/* ─── Estado de pago de los estudiantes ─── */

function EstadoEstudiantes({ dato, className }: { dato: Dato<ResumenFinanciero>; className?: string }) {
  return (
    <Panel id="titulo-estado-estudiantes" titulo="Estudiantes al día" detalle={tr("Matrícula activa y sin mensualidades vencidas")} className={className}>
      <Valor dato={dato} alto="h-56 w-full">
        {(f) => {
          const { matriculados, alDia, conVencidas } = f.estudiantes
          if (!matriculados) return <p className="font-body text-sm text-text-muted">{tr("Sin matrículas activas.")}</p>
          const porcentaje = Math.round((alDia / matriculados) * 100)
          return (
            <div className="flex flex-1 flex-col gap-5">
              <Anillo porcentaje={porcentaje} tono="text-emerald-600 dark:text-emerald-400">
                <span className="display block text-4xl leading-none text-text tabular-nums">{alDia}/{matriculados}</span>
                <span className="mt-1 block font-condensed text-[11px] uppercase tracking-[0.18em] text-text-muted">{tr("{p} % al día", { p: porcentaje })}</span>
              </Anillo>
              <ul className="divide-y divide-border border-t border-border">
                <Fila color="" etiqueta="Al día" valor={alDia} icono={<Icono nombre="check" clase="h-4 w-4 text-emerald-600 dark:text-emerald-400" />} />
                <Fila color="" etiqueta="Con vencidas" valor={conVencidas} icono={<Icono nombre="alerta" clase="h-4 w-4 text-red-600 dark:text-red-400" />} />
              </ul>
            </div>
          )
        }}
      </Valor>
    </Panel>
  )
}

/* ─── Ingresos recibidos en el mes por concepto ─── */

function IngresosConcepto({ dato, className }: { dato: Dato<ResumenFinanciero>; className?: string }) {
  return (
    <Panel id="titulo-ingresos" titulo="Ingresos recibidos" detalle={tr("Pagos con fecha en el mes, por concepto")} className={className}>
      <Valor dato={dato} alto="h-56 w-full">
        {(f) => {
          const total = Number(f.recibido.total)
          const conceptos = [
            { etiqueta: "Mensualidades", valor: Number(f.recibido.mensualidad), color: "bg-accent" },
            { etiqueta: "Matrículas", valor: Number(f.recibido.matricula), color: "bg-mist" },
            { etiqueta: "Talleres", valor: Number(f.recibido.taller), color: "bg-blush" },
          ]
          return (
            <div className="flex flex-1 flex-col gap-5">
              <div>
                <p className="display text-5xl leading-none text-text tabular-nums">{formatoPesos(total)}</p>
                <p className="mt-2 font-body text-xs text-text-muted">{tr(f.recibido.cantidad === 1 ? "{n} pago en el mes" : "{n} pagos en el mes", { n: f.recibido.cantidad })}</p>
              </div>
              {/* Barra apilada con separación de 2px entre segmentos */}
              <div className="flex h-3 gap-0.5 overflow-hidden rounded-full bg-surface-alt" role="img" aria-label={conceptos.map((c) => `${tr(c.etiqueta)} ${formatoPesos(c.valor)}`).join(", ")}>
                {total > 0 && conceptos.filter((c) => c.valor > 0).map((c) => (
                  <span key={c.etiqueta} className={`h-full first:rounded-l-full last:rounded-r-full ${c.color}`} style={{ width: `${(c.valor / total) * 100}%` }} />
                ))}
              </div>
              <ul className="divide-y divide-border border-t border-border">
                {conceptos.map((c) => (
                  <Fila key={c.etiqueta} color={c.color} etiqueta={c.etiqueta} valor={formatoPesos(c.valor)} />
                ))}
              </ul>
            </div>
          )
        }}
      </Valor>
    </Panel>
  )
}

/* ─── Estudiantes por sede ─── */

function EstudiantesSede({ dato, className, onVer }: { dato: Dato<Sede[]>; className?: string; onVer?: () => void }) {
  return (
    <Panel id="titulo-sedes" titulo="Estudiantes por sede" detalle={tr("Estudiantes y grupos activos")} className={className} accion={onVer && <EnlaceModulo etiqueta="Sedes" onClick={onVer} />}>
      <Valor dato={dato} alto="h-40 w-full">
        {(lista) => {
          const maximo = Math.max(1, ...lista.map((s) => s.estudiantesActivos))
          const total = lista.reduce((suma, s) => suma + s.estudiantesActivos, 0)
          return lista.length === 0 ? (
            <p className="font-body text-sm text-text-muted">{tr("No hay sedes activas.")}</p>
          ) : (
            <ul className="flex flex-col gap-5">
              {lista.map((s) => (
                <li key={s.idSede}>
                  <div className="mb-2 flex items-end justify-between gap-3">
                    <span className="flex items-center gap-2">
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface-alt text-accent"><Icono nombre="sede" clase="h-4 w-4" /></span>
                      <span className="font-condensed text-sm font-semibold uppercase tracking-wider text-text">{s.nombre}</span>
                    </span>
                    <span className="text-right">
                      <span className="display text-2xl leading-none text-text tabular-nums">{s.estudiantesActivos}</span>
                      <span className="ml-1.5 font-body text-xs text-text-muted">{total ? `${Math.round((s.estudiantesActivos / total) * 100)} %` : ""}</span>
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt" role="presentation">
                    <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(s.estudiantesActivos / maximo) * 100}%` }} />
                  </div>
                  <p className="mt-1.5 font-body text-xs text-text-muted">{tr("{g} grupos activos", { g: s.gruposActivos })}</p>
                </li>
              ))}
            </ul>
          )
        }}
      </Valor>
    </Panel>
  )
}

/* ─── Cartera vencida ─── */

function Cartera({ dato, className, onVer }: { dato: Dato<ResumenFinanciero>; className?: string; onVer: () => void }) {
  return (
    <Panel
      id="titulo-cartera"
      titulo="Mensualidades vencidas"
      className={className}
      detalle={<Valor dato={dato} alto="h-3 w-32">{(f) => tr("Al corte del {corte}", { corte: fechaCorta(f.corte) })}</Valor>}
      accion={<EnlaceModulo etiqueta="Mensualidades" onClick={onVer} />}
    >
      <Valor dato={dato} alto="h-40 w-full">
        {(f) =>
          f.vencidas.detalle.length === 0 ? (
            <p className="flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 font-body text-sm text-emerald-700 dark:text-emerald-300">
              <Icono nombre="check" />
              {tr("No hay mensualidades vencidas ni en mora.")}
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-4 rounded-xl border border-red-500/25 bg-red-500/5 p-4">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-300"><Icono nombre="alerta" /></span>
                <div className="min-w-0 flex-1">
                  <p className="display text-3xl leading-none text-text tabular-nums">{formatoPesos(f.vencidas.valor)}</p>
                  <p className="mt-1 font-body text-xs text-text-soft">
                    {tr("{v} mensualidad(es) de {n} estudiante(s)", { v: f.vencidas.cantidad, n: f.vencidas.estudiantes })}
                  </p>
                </div>
              </div>
              <ul className="divide-y divide-border">
                {f.vencidas.detalle.map((m) => (
                  <li key={m.idMensualidad} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-alt font-condensed text-xs font-bold text-text-soft" aria-hidden="true">{iniciales(m.estudiante)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-semibold text-text">{m.estudiante}</p>
                      <p className="truncate font-body text-xs text-text-muted">
                        {tr("{grupo} · periodo {periodo} · venció el {fecha}", { grupo: m.grupo, periodo: m.periodo, fecha: fechaCorta(m.fecha_limite) })}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-3">
                      <span className="font-body text-sm font-semibold tabular-nums text-text">{formatoPesos(m.saldo)}</span>
                      <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">{tr(m.estado)}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )
        }
      </Valor>
    </Panel>
  )
}

/* ─── Últimos pagos ─── */

function UltimosPagos({ dato, className, onVer }: { dato: Dato<Pago[]>; className?: string; onVer: () => void }) {
  return (
    <Panel id="titulo-pagos" titulo="Últimos pagos" detalle={tr("Los más recientes registrados")} className={className} accion={<EnlaceModulo etiqueta="Pagos" onClick={onVer} />}>
      <Valor dato={dato} alto="h-40 w-full">
        {(lista) =>
          lista.length === 0 ? (
            <p className="font-body text-sm text-text-muted">{tr("Todavía no hay pagos registrados.")}</p>
          ) : (
            <ul className="divide-y divide-border">
              {lista.map((p) => {
                const quien = p.estudiante ?? p.pagador
                return (
                  <li key={p.idPago} className="flex items-center gap-3 py-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 font-condensed text-xs font-bold text-accent" aria-hidden="true">{iniciales(quien)}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-semibold text-text">{quien}</p>
                      <p className="truncate font-body text-xs text-text-muted">{p.concepto} · {p.metodo}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-body text-sm font-semibold tabular-nums text-text">{formatoPesos(p.monto)}</p>
                      <p className="font-body text-xs text-text-muted">{fechaCorta(p.fecha_pago)}</p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )
        }
      </Valor>
    </Panel>
  )
}
