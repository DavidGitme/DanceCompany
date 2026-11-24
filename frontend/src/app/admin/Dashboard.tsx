import { useCallback, useEffect, useState, type ReactNode } from "react"
import { recursoApi } from "@/compartido/api/recursos"
import { Icono } from "@/compartido/ui/PantallaRecurso"
import { useAuth } from "@/nucleo/auth/useAuth"
import { requierePermiso } from "@/nucleo/auth/requierePermiso"
import { formatoPesos, type Sede } from "@/app/admin/recursos"

interface DashboardProps {
  // Abre un módulo; con crear=true abre también su formulario
  onNavigate: (modulo: string, crear?: boolean) => void
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

interface Mensualidad {
  idMensualidad: number
  estudiante: string
  grupo: string
  periodo: string
  fecha_limite: string
  saldo: string
  estado: string
}

// Cada dato se carga aparte: si falta un permiso o falla una ruta, el resto se muestra
type Dato<T> = { estado: "cargando" } | { estado: "listo"; valor: T } | { estado: "error" }

const ESTADO_ACTIVO = 1
const MENSUALIDAD_PENDIENTE = 3
const MENSUALIDAD_VENCIDA = 5
const MENSUALIDAD_MORA = 6

const hoy = new Date()
const aIso = (fecha: Date) =>
  `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}-${String(fecha.getDate()).padStart(2, "0")}`
const inicioMes = aIso(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
const nombreMes = hoy.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
const fechaCorta = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })

const contar = (ruta: string, parametros: Record<string, string | number | undefined> = {}) =>
  recursoApi.listar(ruta, { ...parametros, tamano: 1 }).then((r) => r.total)

function useDato<T>(cargar: () => Promise<T>, habilitado: boolean, version: number): Dato<T> {
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
  if (dato.estado === "cargando") return <span className="esqueleto inline-block h-9 w-20 rounded-lg align-middle" aria-label="Cargando" />
  if (dato.estado === "error") return <span className="text-text-muted" title="Sin datos o sin permiso">—</span>
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
      <span className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-text-muted">{etiqueta}</span>
      <span className="display text-5xl text-text">
        <Valor dato={dato}>{(v) => v.toLocaleString("es-CO")}</Valor>
      </span>
      <span className="flex items-center justify-between font-body text-xs text-text-soft">
        {detalle}
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
  const pagosMes = useDato(
    () =>
      recursoApi.listar<Pago>("/pagos", { desde: inicioMes, hasta: aIso(hoy), tamano: 100 }).then((r) => ({
        total: r.datos.reduce((suma, p) => suma + Number(p.monto), 0),
        cantidad: r.total,
        incompleto: r.total > r.datos.length,
      })),
    puede("pagos"),
    version,
  )
  const ultimosPagos = useDato(() => recursoApi.listar<Pago>("/pagos", { tamano: 5 }).then((r) => r.datos), puede("pagos"), version)
  const cartera = useDato(
    async () => {
      const [vencidas, mora, pendientes] = await Promise.all([
        recursoApi.listar<Mensualidad>("/mensualidades", { estado: MENSUALIDAD_VENCIDA, tamano: 5 }),
        recursoApi.listar<Mensualidad>("/mensualidades", { estado: MENSUALIDAD_MORA, tamano: 5 }),
        contar("/mensualidades", { estado: MENSUALIDAD_PENDIENTE }),
      ])
      return {
        atrasadas: [...mora.datos, ...vencidas.datos].slice(0, 5),
        totalAtrasadas: vencidas.total + mora.total,
        pendientes,
      }
    },
    puede("pagos"),
    version,
  )

  const nombre = usuario?.nombre.split(" ")[0] ?? ""
  const accesos = [
    { modulo: "estudiantes", etiqueta: "Inscribir estudiante", permiso: "estudiantes" },
    { modulo: "grupos", etiqueta: "Crear grupo", permiso: "grupos" },
    { modulo: "instructores", etiqueta: "Agregar instructor", permiso: "instructores" },
    { modulo: "adm-aulas", etiqueta: "Nueva aula", permiso: "aulas" },
  ].filter((a) => puede(a.permiso))

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-accent">
            {hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="display mt-2 text-5xl text-text sm:text-6xl">
            Hola{nombre ? "," : ""} <span className="text-blush">{nombre}</span>
          </h1>
          <p className="mt-2 font-body text-sm text-text-soft">Resumen de la academia con datos reales de la base de datos.</p>
        </div>
        <button
          type="button"
          onClick={() => setVersion((v) => v + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 font-condensed text-sm font-semibold uppercase tracking-wider text-text-soft transition-colors hover:border-accent hover:text-text"
        >
          <Icono nombre="recargar" /> Actualizar
        </button>
      </header>

      {accesos.length > 0 && (
        <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-2">
          {accesos.map((a) => (
            <button
              key={a.modulo}
              type="button"
              onClick={() => onNavigate(a.modulo, true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider text-on-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-strong"
            >
              <Icono nombre="mas" /> {a.etiqueta}
            </button>
          ))}
        </nav>
      )}

      <section aria-label="Indicadores" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Tarjeta etiqueta="Estudiantes activos" dato={estudiantes} detalle={usuario?.sede ? `Sede ${usuario.sede}` : "En todas las sedes"} onClick={puede("estudiantes") ? () => onNavigate("estudiantes") : undefined} />
        <Tarjeta etiqueta="Grupos activos" dato={grupos} detalle="Con cupos e instructor" onClick={puede("grupos") ? () => onNavigate("grupos") : undefined} />
        <Tarjeta etiqueta="Instructores activos" dato={instructores} detalle="Asignados a sedes" onClick={puede("instructores") ? () => onNavigate("instructores") : undefined} />
        <Tarjeta etiqueta="Convocatorias abiertas" dato={convocatorias} detalle="Recibiendo postulaciones" />
      </section>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* Cartera */}
        <section aria-labelledby="titulo-cartera" className="rounded-[20px] border border-border bg-surface p-6 lg:col-span-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 id="titulo-cartera" className="font-display text-2xl uppercase text-text">Mensualidades por cobrar</h2>
            <p className="font-body text-xs text-text-muted">
              <Valor dato={cartera}>{(c) => `${c.pendientes} pendiente${c.pendientes === 1 ? "" : "s"} · ${c.totalAtrasadas} vencida${c.totalAtrasadas === 1 ? "" : "s"} o en mora`}</Valor>
            </p>
          </div>
          <div className="mt-4">
            <Valor dato={cartera}>
              {(c) =>
                c.atrasadas.length === 0 ? (
                  <p className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4 font-body text-sm text-emerald-700 dark:text-emerald-300">
                    No hay mensualidades vencidas ni en mora.
                  </p>
                ) : (
                  <ul className="divide-y divide-border">
                    {c.atrasadas.map((m) => (
                      <li key={m.idMensualidad} className="flex flex-wrap items-center justify-between gap-2 py-3">
                        <div className="min-w-0">
                          <p className="font-body text-sm font-semibold text-text">{m.estudiante}</p>
                          <p className="truncate font-body text-xs text-text-muted">
                            {m.grupo} · periodo {m.periodo} · venció el {fechaCorta(m.fecha_limite)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-body text-sm font-semibold tabular-nums text-text">{formatoPesos(m.saldo)}</span>
                          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-0.5 font-condensed text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-300">{m.estado}</span>
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
          <h2 id="titulo-sedes" className="font-display text-2xl uppercase text-text">Estudiantes por sede</h2>
          <div className="mt-5 flex flex-col gap-4">
            <Valor dato={sedes}>
              {(lista) => {
                const maximo = Math.max(1, ...lista.map((s) => s.estudiantesActivos))
                return lista.length === 0 ? (
                  <p className="font-body text-sm text-text-muted">No hay sedes activas.</p>
                ) : (
                  lista.map((s) => (
                    <div key={s.idSede}>
                      <div className="mb-1.5 flex justify-between font-condensed text-sm uppercase tracking-wider">
                        <span className="text-text">{s.nombre}</span>
                        <span className="tabular-nums text-text-soft">{s.estudiantesActivos} · {s.gruposActivos} grupos</span>
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

      {/* Pagos */}
      <section aria-labelledby="titulo-pagos" className="rounded-[20px] border border-border bg-surface p-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="titulo-pagos" className="font-display text-2xl uppercase text-text">Pagos</h2>
          <p className="font-body text-sm text-text-soft">
            Recaudo de {nombreMes}:{" "}
            <Valor dato={pagosMes}>
              {(p) => (
                <strong className="text-text">
                  {formatoPesos(p.total)} · {p.cantidad} pago{p.cantidad === 1 ? "" : "s"}
                  {p.incompleto ? " (primeros 100)" : ""}
                </strong>
              )}
            </Valor>
          </p>
        </div>
        <div className="mt-4">
          <Valor dato={ultimosPagos}>
            {(lista) =>
              lista.length === 0 ? (
                <p className="font-body text-sm text-text-muted">Todavía no hay pagos registrados.</p>
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
