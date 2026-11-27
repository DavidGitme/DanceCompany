import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useState, type ReactNode } from "react"
import { recursoApi } from "@/compartido/api/recursos"
import { clienteHttp } from "@/nucleo/http/clienteHttp"
import { Icono } from "@/compartido/ui/PantallaRecurso"
import { useAuth } from "@/nucleo/auth/useAuth"
import { requierePermiso } from "@/nucleo/auth/requierePermiso"
import { formatoPesos, type Sede } from "@/app/admin/recursos"

interface DashboardProps {
  // Abre un módulo (solo navegación: las acciones de creación están en cada módulo)
  onNavigate: (modulo: string) => void
}

// GET /reportes/finanzas (backend/app/infraestructura/repositorios/reportes_sql.py)
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

const hoy = new Date()
const aIso = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`
const mesActual = aIso(hoy).slice(0, 7)
const nombreMes = (periodo: string, corto = false) =>
  new Date(`${periodo}-15T12:00:00`).toLocaleDateString(tr("es-CO"), corto ? { month: "short" } : { month: "long", year: "numeric" })
const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })

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

function Valor<T>({ dato, children }: { dato: Dato<T>; children: (valor: T) => ReactNode }) {
  if (dato.estado === "cargando") return <span className="esqueleto inline-block h-9 w-20 rounded-lg align-middle" aria-label={tr("Cargando")} />
  if (dato.estado === "error") return <span className="text-text-muted" title={tr("Sin datos o sin permiso")}>—</span>
  return <>{children(dato.valor)}</>
}

function Tarjeta({ etiqueta, dato, detalle, onClick }: { etiqueta: string; dato: Dato<number>; detalle: string; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className="group flex flex-col gap-3 rounded-[20px] border border-border bg-surface p-5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-accent/50 disabled:pointer-events-none"
    >
      <span className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{tr(etiqueta)}</span>
      <span className="display text-5xl text-text">
        <Valor dato={dato}>{(v) => v.toLocaleString("es-CO")}</Valor>
      </span>
      <span className="flex items-center justify-between font-body text-xs text-text-soft">
        {tr(detalle)}
        {onClick && <span className="font-condensed text-sm uppercase tracking-wider text-accent transition-transform group-hover:translate-x-1" aria-hidden="true">→</span>}
      </span>
    </button>
  )
}

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
  const finanzas = useDato(
    () => clienteHttp.get<ResumenFinanciero>(`/reportes/finanzas?periodo=${periodo}&meses=6`),
    puede("pagos"),
    `${version}-${periodo}`,
  )
  const ultimosPagos = useDato(() => recursoApi.listar<Pago>("/pagos", { tamano: 5 }).then((r) => r.datos), puede("pagos"), version)
  const nombre = usuario?.nombre.split(" ")[0] ?? ""

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            {hoy.toLocaleDateString(tr("es-CO"), { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="display mt-2 text-5xl text-text sm:text-6xl">
            {tr("Hola")}{nombre ? "," : ""} <span className="text-blush">{nombre}</span>
          </h1>
          <p className="mt-2 font-body text-sm text-text-soft">{tr("Resumen de la academia con datos reales de la base de datos.")}</p>
        </div>
        <button
          type="button"
          onClick={() => setVersion((v) => v + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-condensed text-sm font-semibold uppercase tracking-wider text-text-soft transition-colors hover:border-accent hover:text-text"
        >
          <Icono nombre="recargar" /> {tr("Actualizar")}
        </button>
      </header>

      <section aria-label={tr("Indicadores")} className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta etiqueta="Estudiantes activos" dato={estudiantes} detalle={usuario?.sede ? `${tr("Sede")} ${usuario.sede}` : "En todas las sedes"} onClick={puede("estudiantes") ? () => onNavigate("estudiantes") : undefined} />
        <Tarjeta etiqueta="Grupos activos" dato={grupos} detalle="Con cupos e instructor" onClick={puede("grupos") ? () => onNavigate("grupos") : undefined} />
        <Tarjeta etiqueta="Instructores activos" dato={instructores} detalle="Asignados a sedes" onClick={puede("instructores") ? () => onNavigate("instructores") : undefined} />
        <Tarjeta etiqueta="Convocatorias abiertas" dato={convocatorias} detalle="Recibiendo postulaciones" />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Cartera */}
        <section aria-labelledby="titulo-cartera" className="rounded-[20px] border border-border bg-surface p-6 lg:col-span-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-cartera" className="font-display text-2xl uppercase text-text">{tr("Mensualidades vencidas")}</h2>
            <p className="font-body text-xs text-text-muted">
              <Valor dato={finanzas}>{(f) => tr("{v} vencidas · {valor}", { v: f.vencidas.cantidad, valor: formatoPesos(f.vencidas.valor) })}</Valor>
            </p>
          </div>
          <div className="mt-4">
            <Valor dato={finanzas}>
              {(f) =>
                f.vencidas.detalle.length === 0 ? (
                  <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 font-body text-sm text-emerald-700 dark:text-emerald-300">
                    {tr("No hay mensualidades vencidas ni en mora.")}
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {f.vencidas.detalle.map((m) => (
                      <li key={m.idMensualidad} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div className="min-w-0">
                          <p className="font-body text-sm font-semibold text-text">{m.estudiante}</p>
                          <p className="truncate font-body text-xs text-text-muted">
                            {tr("{grupo} · periodo {periodo} · venció el {fecha}", { grupo: m.grupo, periodo: m.periodo, fecha: fechaCorta(m.fecha_limite) })}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-body text-sm font-semibold tabular-nums text-text">{formatoPesos(m.saldo)}</span>
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">{tr(m.estado)}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )
              }
            </Valor>
          </div>
        </section>

        {/* Estudiantes por sede */}
        <section aria-labelledby="titulo-sedes" className="rounded-[20px] border border-border bg-surface p-6 lg:col-span-2">
          <h2 id="titulo-sedes" className="font-display text-2xl uppercase text-text">{tr("Estudiantes por sede")}</h2>
          <div className="mt-5 flex flex-col gap-4">
            <Valor dato={sedes}>
              {(lista) => {
                const maximo = Math.max(1, ...lista.map((s) => s.estudiantesActivos))
                return lista.length === 0 ? (
                  <p className="font-body text-sm text-text-muted">{tr("No hay sedes activas.")}</p>
                ) : (
                  lista.map((s) => (
                    <div key={s.idSede}>
                      <div className="mb-1.5 flex justify-between font-condensed text-sm uppercase tracking-wider">
                        <span className="text-text">{s.nombre}</span>
                        <span className="tabular-nums text-text-soft">{tr("{e} · {g} grupos", { e: s.estudiantesActivos, g: s.gruposActivos })}</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-surface-alt" role="presentation">
                        <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${(s.estudiantesActivos / maximo) * 100}%` }} />
                      </div>
                    </div>
                  ))
                )
              }}
            </Valor>
          </div>
        </section>
      </div>

      {puede("pagos") && <Finanzas dato={finanzas} periodo={periodo} onPeriodo={setPeriodo} />}

      {/* Últimos pagos registrados (los 5 más recientes) */}
      <section aria-labelledby="titulo-pagos" className="rounded-[20px] border border-border bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-pagos" className="font-display text-2xl uppercase text-text">{tr("Últimos pagos")}</h2>
          <p className="font-body text-xs text-text-muted">{tr("Los 5 más recientes")}</p>
        </div>
        <div className="mt-4">
          <Valor dato={ultimosPagos}>
            {(lista) =>
              lista.length === 0 ? (
                <p className="font-body text-sm text-text-muted">{tr("Todavía no hay pagos registrados.")}</p>
              ) : (
                <ul className="divide-y divide-border">
                  {lista.map((p) => (
                    <li key={p.idPago} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="min-w-0">
                        <p className="font-body text-sm font-semibold text-text">{p.estudiante ?? p.pagador}</p>
                        <p className="truncate font-body text-xs text-text-muted">{p.concepto} · {p.metodo} · {fechaCorta(p.fecha_pago)}</p>
                      </div>
                      <span className="font-body text-sm font-semibold tabular-nums text-text">{formatoPesos(p.monto)}</span>
                    </li>
                  ))}
                </ul>
              )
            }
          </Valor>
        </div>
      </section>
    </div>
  )
}


/* ─── Mensualidades e ingresos ─── */

function Cifra({ etiqueta, valor, detalle, tono }: { etiqueta: string; valor: ReactNode; detalle: ReactNode; tono?: "alerta" | "bien" }) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-surface-alt/50 p-4">
      <span className="font-condensed text-xs font-semibold uppercase tracking-[0.18em] text-text-muted">{tr(etiqueta)}</span>
      <span className="display text-3xl tabular-nums text-text">{valor}</span>
      <span className={`font-body text-xs ${tono === "alerta" ? "text-red-600 dark:text-red-300" : tono === "bien" ? "text-emerald-700 dark:text-emerald-300" : "text-text-soft"}`}>{detalle}</span>
    </div>
  )
}

function Finanzas({ dato, periodo, onPeriodo }: { dato: Dato<ResumenFinanciero>; periodo: string; onPeriodo: (p: string) => void }) {
  const [tabla, setTabla] = useState(false)
  return (
    <section aria-labelledby="titulo-finanzas" className="flex flex-col gap-5 rounded-[20px] border border-border bg-surface p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="titulo-finanzas" className="font-display text-2xl uppercase text-text">{tr("Mensualidades e ingresos")}</h2>
          <p className="mt-1 font-body text-xs text-text-muted">
            <Valor dato={dato}>{(f) => tr("Mes de {mes} · vencidas al {corte}", { mes: nombreMes(f.periodo), corte: fechaCorta(f.corte) })}</Valor>
          </p>
        </div>
        {/* Filtro del periodo: una sola fila, arriba de las cifras */}
        <label className="flex items-center gap-2 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
          {tr("Mes")}
          <input
            type="month"
            value={periodo}
            max={mesActual}
            onChange={(e) => e.target.value && onPeriodo(e.target.value)}
            className="rounded-xl border border-border bg-surface-alt px-3 py-2 font-body text-sm normal-case tracking-normal text-text [color-scheme:light] dark:[color-scheme:dark]"
          />
        </label>
      </div>

      <Valor dato={dato}>
        {(f) => {
          const n = (v: string | number) => Number(v)
          const { estudiantes: e, mensualidades: m, recibido: r, vencidas: v } = f
          const porcentajeAlDia = e.matriculados ? Math.round((e.alDia / e.matriculados) * 100) : 0
          return (
            <div className="flex flex-col gap-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Cifra
                  etiqueta="Estudiantes al día"
                  valor={`${e.alDia} / ${e.matriculados}`}
                  detalle={e.matriculados ? tr("{p} % de los matriculados", { p: porcentajeAlDia }) : tr("Sin matrículas activas")}
                  tono={e.conVencidas ? undefined : "bien"}
                />
                <Cifra
                  etiqueta="Mensualidades vencidas"
                  valor={v.cantidad}
                  detalle={v.cantidad ? tr("{valor} de {n} estudiante(s)", { valor: formatoPesos(v.valor), n: v.estudiantes }) : tr("Ninguna vencida")}
                  tono={v.cantidad ? "alerta" : "bien"}
                />
                <Cifra etiqueta="Ingresos recibidos" valor={formatoPesos(r.total)} detalle={tr(r.cantidad === 1 ? "{n} pago en el mes" : "{n} pagos en el mes", { n: r.cantidad })} />
                <Cifra etiqueta="Ingresos esperados" valor={formatoPesos(m.esperado)} detalle={tr("{n} mensualidad(es) del mes", { n: m.cantidad })} />
                <Cifra
                  etiqueta="Pendiente del mes"
                  valor={formatoPesos(m.pendiente)}
                  detalle={tr("{p} de {n} pagadas", { p: m.pagadas, n: m.cantidad })}
                  tono={n(m.pendiente) > 0 ? "alerta" : undefined}
                />
              </div>

              {/* Estado de pago de los estudiantes: estado con icono y texto, no solo color */}
              {e.matriculados > 0 && (
                <div>
                  <div className="flex h-3 gap-0.5 overflow-hidden rounded-full" role="img" aria-label={tr("{a} al día y {b} con mensualidades vencidas", { a: e.alDia, b: e.conVencidas })}>
                    {e.alDia > 0 && <div className="h-full rounded-l-full bg-emerald-600 last:rounded-r-full dark:bg-emerald-400" style={{ width: `${(e.alDia / e.matriculados) * 100}%` }} title={tr("Al día: {n}", { n: e.alDia })} />}
                    {e.conVencidas > 0 && <div className="h-full rounded-r-full bg-red-600 first:rounded-l-full dark:bg-red-400" style={{ width: `${(e.conVencidas / e.matriculados) * 100}%` }} title={tr("Con vencidas: {n}", { n: e.conVencidas })} />}
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-4 font-body text-xs text-text-soft">
                    <li className="flex items-center gap-1.5"><span className="text-emerald-600 dark:text-emerald-400" aria-hidden="true">✓</span>{tr("Al día: {n}", { n: e.alDia })}</li>
                    <li className="flex items-center gap-1.5"><span className="text-red-600 dark:text-red-400" aria-hidden="true">!</span>{tr("Con vencidas: {n}", { n: e.conVencidas })}</li>
                  </ul>
                </div>
              )}

              <GraficoMeses serie={f.serie} periodo={f.periodo} />

              <div>
                <button type="button" onClick={() => setTabla((t) => !t)} aria-expanded={tabla} className="font-condensed text-xs font-semibold uppercase tracking-wider text-accent underline-offset-4 hover:underline">
                  {tr(tabla ? "Ocultar tabla" : "Ver como tabla")}
                </button>
                {tabla && (
                  <div className="mt-3 overflow-x-auto">
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
                        {f.serie.map((p) => (
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
                )}
              </div>

              <details className="rounded-xl border border-border bg-surface-alt/40 p-3 font-body text-xs text-text-soft">
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
          )
        }}
      </Valor>
    </section>
  )
}

// Barra por mes: la pista es lo esperado y el relleno lo recaudado de esas mensualidades
function GraficoMeses({ serie, periodo }: { serie: ResumenFinanciero["serie"]; periodo: string }) {
  const [activo, setActivo] = useState<string | null>(null)
  const maximo = Math.max(1, ...serie.map((p) => Math.max(Number(p.esperado), Number(p.recibido))))
  const sinDatos = serie.every((p) => Number(p.esperado) === 0 && Number(p.recibido) === 0)
  if (sinDatos) {
    return <p className="rounded-xl border border-border p-4 font-body text-sm text-text-muted">{tr("No hay mensualidades ni pagos registrados en los últimos 6 meses.")}</p>
  }
  return (
    <figure>
      <figcaption className="mb-3 flex flex-wrap items-center gap-4 font-body text-xs text-text-soft">
        <span className="font-condensed font-semibold uppercase tracking-wider text-text">{tr("Últimos 6 meses")}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border border-accent/50 bg-accent/15" aria-hidden="true" />{tr("Esperado")}</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm bg-accent" aria-hidden="true" />{tr("Recaudado")}</span>
      </figcaption>
      <div className="grid h-48 grid-cols-6 items-end gap-3 border-b border-border" role="list">
        {serie.map((p) => {
          const esperado = Number(p.esperado)
          const recaudado = Number(p.recaudado)
          const enfoque = activo === p.periodo
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
              className="relative flex h-full flex-col justify-end outline-none"
            >
              {enfoque && (
                <div className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-44 -translate-x-1/2 rounded-xl border border-border bg-surface p-3 font-body text-xs text-text-soft shadow-xl">
                  <p className="mb-1 font-semibold capitalize text-text">{nombreMes(p.periodo)}</p>
                  <p>{tr("Esperado")}: <span className="tabular-nums text-text">{formatoPesos(esperado)}</span></p>
                  <p>{tr("Recaudado")}: <span className="tabular-nums text-text">{formatoPesos(recaudado)}</span></p>
                  <p>{tr("Pendiente")}: <span className="tabular-nums text-text">{formatoPesos(p.pendiente)}</span></p>
                  <p>{tr("Recibido")}: <span className="tabular-nums text-text">{formatoPesos(p.recibido)}</span></p>
                </div>
              )}
              <div
                className={`relative mx-auto w-full max-w-12 rounded-t-[4px] border border-b-0 border-accent/40 bg-accent/10 transition-colors ${enfoque ? "border-accent" : ""}`}
                style={{ height: `${(esperado / maximo) * 100}%`, minHeight: esperado ? 4 : 0 }}
              >
                <div className="absolute inset-x-0 bottom-0 rounded-t-[4px] bg-accent" style={{ height: esperado ? `${Math.min(100, (recaudado / esperado) * 100)}%` : 0 }} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="mt-2 grid grid-cols-6 gap-3">
        {serie.map((p) => (
          <span key={p.periodo} className={`text-center font-condensed text-xs uppercase tracking-wider ${p.periodo === periodo ? "font-bold text-text" : "text-text-muted"}`}>
            {nombreMes(p.periodo, true)}
          </span>
        ))}
      </div>
    </figure>
  )
}
