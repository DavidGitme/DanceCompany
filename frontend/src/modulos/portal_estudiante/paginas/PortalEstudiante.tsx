import { useState, type ReactNode } from "react"
import ThemeToggle from "@/compartido/ui/ThemeToggle"
import Button from "@/compartido/ui/Button"
import StatusBadge from "@/compartido/ui/StatusBadge"
import logoFna from "@/recursos/logo-fna.png"
import type { ErrorApi } from "@/nucleo/http/clienteHttp"
import IconoEstudiante, { type NombreIconoEstudiante } from "../componentes/IconoEstudiante"
import { usePortalEstudiante, type DatosPortal } from "../hooks/usePortalEstudiante"
import type { BloqueHorario, Clase } from "../dtos/portalEstudianteDto"

type Vista = "inicio" | "clases" | "pagos" | "talleres" | "convocatorias" | "noticias" | "perfil"

const navegacion: { id: Vista; etiqueta: string; icono: NombreIconoEstudiante }[] = [
  { id: "inicio", etiqueta: "Inicio", icono: "inicio" },
  { id: "clases", etiqueta: "Mis clases", icono: "clases" },
  { id: "pagos", etiqueta: "Mis pagos", icono: "pagos" },
  { id: "talleres", etiqueta: "Talleres", icono: "talleres" },
  { id: "convocatorias", etiqueta: "Convocatorias", icono: "convocatorias" },
  { id: "noticias", etiqueta: "Noticias", icono: "noticias" },
  { id: "perfil", etiqueta: "Mi perfil", icono: "perfil" },
]

const DIAS = ["Lunes", "Martes", "Miercoles", "Jueves", "Viernes", "Sabado", "Domingo"]
const NOMBRE_DIA: Record<string, string> = { Miercoles: "Miércoles", Sabado: "Sábado" }
const superficie = "rounded-2xl border border-border bg-surface shadow-lg shadow-black/5"

// ---------- Formatos ----------
const pesos = (valor: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(valor)

const fecha = (iso: string | null) => {
  if (!iso) return "—"
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number)
  return new Intl.DateTimeFormat("es-CO", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(a, m - 1, d),
  )
}

const periodo = (aaaamm: string) => {
  const [a, m] = aaaamm.split("-").map(Number)
  const texto = new Intl.DateTimeFormat("es-CO", { month: "long", year: "numeric" }).format(new Date(a, m - 1, 1))
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

const dia = (valor: string) => NOMBRE_DIA[valor] ?? valor

const iniciales = (nombre: string) =>
  nombre.split(" ").slice(0, 2).map((parte) => parte[0]).join("").toUpperCase()

/** Próxima clase a partir de ahora, recorriendo los bloques semanales. */
function proximaClase(clases: Clase[]) {
  const ahora = new Date()
  let mejor: { clase: Clase; bloque: BloqueHorario; cuando: Date } | null = null
  for (const clase of clases) {
    for (const bloque of clase.horarios) {
      const indice = DIAS.indexOf(bloque.dia)
      if (indice < 0) continue
      const objetivo = (indice + 1) % 7 // getDay(): domingo = 0
      const [h, min] = bloque.inicio.split(":").map(Number)
      const cuando = new Date(ahora)
      cuando.setHours(h, min, 0, 0)
      let dias = (objetivo - ahora.getDay() + 7) % 7
      if (dias === 0 && cuando <= ahora) dias = 7
      cuando.setDate(cuando.getDate() + dias)
      if (!mejor || cuando < mejor.cuando) mejor = { clase, bloque, cuando }
    }
  }
  return mejor
}

interface PortalEstudianteProps {
  nombre: string
  onSalir: () => void
}

export default function PortalEstudiante({ nombre, onSalir }: PortalEstudianteProps) {
  const [vista, setVista] = useState<Vista>("inicio")
  const [menuMovil, setMenuMovil] = useState(false)
  const { datos, cargando, error, recargar, postularse } = usePortalEstudiante()

  const navegar = (destino: Vista) => {
    setVista(destino)
    setMenuMovil(false)
  }

  return (
    <div className="flex min-h-screen bg-page text-text">
      {menuMovil && (
        <button
          aria-label="Cerrar navegación"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setMenuMovil(false)}
        />
      )}

      <aside
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-surface transition-transform duration-300 lg:static lg:translate-x-0",
          menuMovil ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="flex h-20 items-center justify-between border-b border-border px-6">
          <div className="flex items-center gap-3">
            <img src={logoFna} alt="F&A Dance Company" className="h-10 w-10 object-contain brightness-0 opacity-85 dark:brightness-100 dark:opacity-100" />
            <div>
              <p className="font-display text-lg uppercase leading-none text-text">F&A</p>
              <p className="mt-1 font-condensed text-xs uppercase tracking-widest text-accent">
                Portal estudiante
              </p>
            </div>
          </div>
          <button
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-text-muted hover:bg-surface-alt hover:text-text lg:hidden"
            onClick={() => setMenuMovil(false)}
          >
            <IconoEstudiante nombre="cerrar" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
          <p className="mb-3 px-3 font-condensed text-xs uppercase tracking-widest text-text-muted">Mi espacio</p>
          {navegacion.map((opcion) => (
            <button
              key={opcion.id}
              onClick={() => navegar(opcion.id)}
              className={[
                "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-condensed text-sm font-semibold uppercase tracking-wider transition-all",
                vista === opcion.id
                  ? "bg-purple-700 text-white shadow-lg shadow-purple-700/20"
                  : "text-text-soft hover:bg-surface-alt hover:text-text",
              ].join(" ")}
            >
              <IconoEstudiante nombre={opcion.icono} />
              {opcion.etiqueta}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-alt p-3">
            <Avatar nombre={nombre} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">{nombre}</p>
              <p className="truncate text-xs text-text-muted">Estudiante</p>
            </div>
          </div>
          <button
            onClick={onSalir}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <IconoEstudiante nombre="salir" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-border bg-page/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              aria-label="Abrir navegación"
              className="rounded-xl border border-border bg-surface p-2.5 text-text lg:hidden"
              onClick={() => setMenuMovil(true)}
            >
              <IconoEstudiante nombre="menu" />
            </button>
            <div>
              <p className="font-condensed text-xs uppercase tracking-widest text-accent">Panel de estudiante</p>
              <p className="hidden text-sm text-text-muted sm:block">
                {new Intl.DateTimeFormat("es-CO", { dateStyle: "full" }).format(new Date())}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle className="text-text-muted" />
            <div className="hidden text-right md:block">
              <p className="text-sm font-semibold text-text">{nombre}</p>
              <p className="text-xs text-text-muted">{datos?.perfil.sede ? `Sede ${datos.perfil.sede}` : "Estudiante"}</p>
            </div>
            <Avatar nombre={nombre} pequeno />
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-screen-2xl">
            {cargando && <EstadoCarga />}
            {!cargando && error && (
              <Aviso tono="error" titulo="No pudimos cargar tu información" texto={error}>
                <Button size="sm" onClick={() => void recargar()}>Reintentar</Button>
              </Aviso>
            )}
            {!cargando && datos && (
              <>
                {vista === "inicio" && <Inicio datos={datos} nombre={nombre} onIr={navegar} />}
                {vista === "clases" && <MisClases datos={datos} />}
                {vista === "pagos" && <MisPagos datos={datos} />}
                {vista === "talleres" && <MisTalleres datos={datos} />}
                {vista === "convocatorias" && <MisConvocatorias datos={datos} onPostular={postularse} />}
                {vista === "noticias" && <Noticias datos={datos} />}
                {vista === "perfil" && <MiPerfil datos={datos} />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

// ---------- Inicio ----------
function Inicio({ datos, nombre, onIr }: { datos: DatosPortal; nombre: string; onIr: (v: Vista) => void }) {
  const { clases, finanzas, talleres, noticias } = datos
  const proxima = proximaClase(clases.vigentes)
  const clasesSemana = clases.vigentes.reduce((total, c) => total + c.horarios.length, 0)
  const vencidas = finanzas.mensualidades.filter((m) => m.saldo > 0 && m.estado !== "Pendiente")

  return (
    <div className="space-y-8">
      <CabeceraPagina
        ceja="Resumen"
        titulo={`¡Hola, ${nombre.split(" ")[0]}!`}
        descripcion="Aquí tienes tus clases, tu estado de cuenta y lo que pasa en F&A Dance Company."
      />

      {vencidas.length > 0 && (
        <Aviso
          tono="alerta"
          titulo={`Tienes ${vencidas.length} mensualidad${vencidas.length > 1 ? "es" : ""} por ponerte al día`}
          texto="Acércate a la recepción de tu sede para registrar el pago y seguir disfrutando tus clases."
        >
          <Button size="sm" variant="outline" onClick={() => onIr("pagos")}>Ver mis pagos</Button>
        </Aviso>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaMetrica etiqueta="Clases por semana" valor={String(clasesSemana)} ayuda={`${clases.vigentes.length} grupo(s) activo(s)`} icono="clases" />
        <TarjetaMetrica
          etiqueta="Saldo pendiente"
          valor={pesos(finanzas.saldoPendiente)}
          ayuda={finanzas.saldoPendiente > 0 ? "Matrícula y mensualidades" : "Estás al día"}
          icono="pagos"
          alerta={finanzas.saldoPendiente > 0}
        />
        <TarjetaMetrica
          etiqueta="Próximo vencimiento"
          valor={finanzas.proximoVencimiento ? fecha(finanzas.proximoVencimiento) : "—"}
          ayuda={`${finanzas.mensualidadesPendientes} mensualidad(es) con saldo`}
          icono="calendario"
        />
        <TarjetaMetrica etiqueta="Talleres" valor={String(talleres.inscritos.length)} ayuda={`${talleres.disponibles.length} disponible(s) para ti`} icono="talleres" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className={`${superficie} p-6 lg:col-span-3`}>
          <p className="font-condensed text-xs uppercase tracking-widest text-accent">Tu próxima clase</p>
          {proxima ? (
            <>
              <h2 className="mt-1 font-display text-3xl uppercase text-text">{proxima.clase.grupo}</h2>
              <p className="mt-1 text-sm text-text-muted">{proxima.clase.estilo} · {proxima.clase.nivel}</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Dato icono="calendario" texto={new Intl.DateTimeFormat("es-CO", { weekday: "long", day: "numeric", month: "long" }).format(proxima.cuando)} />
                <Dato icono="reloj" texto={`${proxima.bloque.inicio} a ${proxima.bloque.fin}`} />
                <Dato icono="ubicacion" texto={`Sede ${proxima.clase.sede} · Aula ${proxima.clase.aula}`} />
                <Dato icono="instructor" texto={proxima.clase.instructor} />
              </div>
              <Button size="sm" className="mt-6" onClick={() => onIr("clases")}>
                Ver mi horario <IconoEstudiante nombre="flecha" className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-text-muted">
              Aún no tienes clases programadas. Consulta en recepción para matricularte en un grupo.
            </p>
          )}
        </section>

        <section className={`${superficie} p-6 lg:col-span-2`}>
          <div className="flex items-center justify-between">
            <p className="font-condensed text-xs uppercase tracking-widest text-accent">Últimas noticias</p>
            <button className="text-xs text-accent hover:text-purple-300" onClick={() => onIr("noticias")}>Ver todas</button>
          </div>
          <div className="mt-4 space-y-4">
            {noticias.slice(0, 3).map((n) => (
              <article key={n.id} className="border-b border-border pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <StatusBadge status={n.tipo} />
                  <span className="text-xs text-text-muted">{fecha(n.fecha)}</span>
                </div>
                <h3 className="mt-2 font-semibold text-text">{n.titulo}</h3>
              </article>
            ))}
            {noticias.length === 0 && <p className="text-sm text-text-muted">No hay noticias por ahora.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

// ---------- Mis clases ----------
function MisClases({ datos }: { datos: DatosPortal }) {
  const { vigentes, historial } = datos.clases
  const porDia = DIAS.map((d) => ({
    dia: d,
    bloques: vigentes
      .flatMap((c) => c.horarios.filter((h) => h.dia === d).map((h) => ({ ...h, clase: c })))
      .sort((a, b) => a.inicio.localeCompare(b.inicio)),
  }))

  return (
    <div className="space-y-8">
      <CabeceraPagina ceja="Académico" titulo="Mis clases" descripcion="Tus grupos activos, tu horario semanal y tus matrículas anteriores." />

      {vigentes.length === 0 ? (
        <EstadoVacio titulo="Sin grupos activos" texto="Cuando te matricules en un grupo, aquí verás tu horario." />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {vigentes.map((c) => (
              <article key={c.idMatricula} className={`${superficie} p-6`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-condensed text-xs uppercase tracking-widest text-accent">{c.estilo} · {c.nivel}</p>
                    <h2 className="mt-1 font-display text-2xl uppercase text-text">{c.grupo}</h2>
                  </div>
                  <StatusBadge status={c.estado} />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <Dato icono="instructor" texto={c.instructor} />
                  <Dato icono="ubicacion" texto={`Sede ${c.sede} · Aula ${c.aula}`} />
                  <Dato icono="calendario" texto={`Matriculado el ${fecha(c.fechaMatricula)}`} />
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {c.horarios.map((h) => (
                    <span key={`${h.dia}${h.inicio}`} className="rounded-lg bg-surface-alt px-3 py-1.5 text-xs text-text-soft">
                      {dia(h.dia)} · {h.inicio}–{h.fin}
                    </span>
                  ))}
                  {c.horarios.length === 0 && <span className="text-xs text-text-muted">Horario por definir</span>}
                </div>
              </article>
            ))}
          </div>

          <section className={`${superficie} p-6`}>
            <h2 className="font-display text-2xl uppercase text-text">Horario semanal</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
              {porDia.map(({ dia: d, bloques }) => (
                <div key={d} className="rounded-xl border border-border bg-surface-alt/50 p-3">
                  <p className="font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">{dia(d)}</p>
                  <div className="mt-2 space-y-2">
                    {bloques.map((b) => (
                      <div key={`${b.clase.idMatricula}${b.inicio}`} className="rounded-lg bg-purple-700/90 px-2.5 py-2 text-white">
                        <p className="text-xs font-semibold">{b.inicio}–{b.fin}</p>
                        <p className="mt-0.5 text-[11px] leading-tight opacity-80">{b.clase.grupo}</p>
                      </div>
                    ))}
                    {bloques.length === 0 && <p className="text-xs text-text-muted">Libre</p>}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}

      {historial.length > 0 && (
        <Tabla
          titulo="Matrículas anteriores"
          columnas={["Grupo", "Estilo · Nivel", "Sede", "Fecha", "Estado"]}
          filas={historial.map((c) => [c.grupo, `${c.estilo} · ${c.nivel}`, c.sede, fecha(c.fechaMatricula), <StatusBadge key="e" status={c.estado} />])}
        />
      )}
    </div>
  )
}

// ---------- Mis pagos ----------
function MisPagos({ datos }: { datos: DatosPortal }) {
  const f = datos.finanzas
  return (
    <div className="space-y-8">
      <CabeceraPagina
        ceja="Estado de cuenta"
        titulo="Mis pagos"
        descripcion="Tus mensualidades, tu matrícula y los pagos registrados. Los pagos se realizan en la recepción de tu sede."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <TarjetaMetrica etiqueta="Saldo pendiente" valor={pesos(f.saldoPendiente)} ayuda={f.saldoPendiente > 0 ? "Por pagar" : "Estás al día"} icono="pagos" alerta={f.saldoPendiente > 0} />
        <TarjetaMetrica etiqueta="Total pagado" valor={pesos(f.totalPagado)} ayuda={`${f.pagos.length} pago(s) registrados`} icono="check" />
        <TarjetaMetrica etiqueta="Próximo vencimiento" valor={f.proximoVencimiento ? fecha(f.proximoVencimiento) : "—"} ayuda="Fecha límite más cercana" icono="calendario" />
      </div>

      <Tabla
        titulo="Mensualidades"
        vacio="No tienes mensualidades registradas."
        columnas={["Periodo", "Grupo", "Valor", "Pagado", "Saldo", "Fecha límite", "Estado"]}
        filas={f.mensualidades.map((m) => [
          periodo(m.periodo), m.grupo, pesos(m.valor), pesos(m.pagado),
          <span key="s" className={m.saldo > 0 ? "font-semibold text-amber-400" : ""}>{pesos(m.saldo)}</span>,
          fecha(m.fechaLimite), <StatusBadge key="e" status={m.estado} />,
        ])}
      />

      <Tabla
        titulo="Matrícula"
        vacio="No tienes matrículas."
        columnas={["Grupo", "Valor", "Pagado", "Saldo", "Estado"]}
        filas={f.matriculas.map((m) => [m.grupo, pesos(m.valor), pesos(m.pagado), pesos(m.saldo), <StatusBadge key="e" status={m.estado} />])}
      />

      <Tabla
        titulo="Historial de pagos"
        vacio="Aún no hay pagos registrados."
        columnas={["Fecha", "Concepto", "Método", "Pagado por", "Monto"]}
        filas={f.pagos.map((p) => [fecha(p.fecha), p.concepto, p.metodo, p.pagador, pesos(p.monto)])}
      />
    </div>
  )
}

// ---------- Talleres ----------
function MisTalleres({ datos }: { datos: DatosPortal }) {
  const { inscritos, disponibles } = datos.talleres
  return (
    <div className="space-y-8">
      <CabeceraPagina ceja="Oferta" titulo="Talleres" descripcion="Los talleres en los que estás inscrito y los que puedes tomar." />
      <section>
        <h2 className="mb-4 font-display text-2xl uppercase text-text">Mis talleres</h2>
        {inscritos.length === 0 ? (
          <EstadoVacio titulo="Sin talleres" texto="Todavía no te has inscrito en ningún taller." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {inscritos.map((t) => (
              <article key={t.id} className={`${superficie} p-5`}>
                <StatusBadge status="Activo" />
                <h3 className="mt-3 font-display text-xl uppercase text-text">{t.taller}</h3>
                <div className="mt-3 space-y-2">
                  <Dato icono="calendario" texto={`Inscrito el ${fecha(t.fecha)}`} />
                  <Dato icono="pagos" texto={`${pesos(t.monto)} · ${t.metodo}`} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section>
        <h2 className="mb-4 font-display text-2xl uppercase text-text">Disponibles para ti</h2>
        {disponibles.length === 0 ? (
          <EstadoVacio titulo="Nada nuevo por ahora" texto="Cuando haya nuevos talleres los verás aquí." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {disponibles.map((t) => (
              <article key={t.id} className={`${superficie} p-5`}>
                <p className="font-condensed text-xs uppercase tracking-widest text-accent">Taller</p>
                <h3 className="mt-1 font-display text-xl uppercase text-text">{t.descripcion}</h3>
                <p className="mt-2 font-display text-2xl text-text">{t.valor > 0 ? pesos(t.valor) : "Gratis"}</p>
                <p className="mt-3 text-xs text-text-muted">Para inscribirte, acércate a la recepción de tu sede.</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ---------- Convocatorias ----------
function MisConvocatorias({ datos, onPostular }: { datos: DatosPortal; onPostular: (id: number) => Promise<void> }) {
  const { abiertas, postulaciones } = datos.convocatorias
  const [enviando, setEnviando] = useState<number | null>(null)
  const [mensaje, setMensaje] = useState<{ tono: "exito" | "error"; texto: string } | null>(null)

  const postular = async (id: number, nombre: string) => {
    setEnviando(id)
    setMensaje(null)
    try {
      await onPostular(id)
      setMensaje({ tono: "exito", texto: `Te postulaste a "${nombre}". Te avisaremos cuando haya una decisión.` })
    } catch (e) {
      setMensaje({ tono: "error", texto: (e as ErrorApi)?.mensaje ?? "No fue posible postularte." })
    } finally {
      setEnviando(null)
    }
  }

  return (
    <div className="space-y-8">
      <CabeceraPagina ceja="Oportunidades" titulo="Convocatorias" descripcion="Postúlate a las convocatorias abiertas y sigue el estado de tus postulaciones." />
      {mensaje && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-3 text-sm ${mensaje.tono === "exito" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}
        >
          {mensaje.texto}
        </div>
      )}
      <section>
        <h2 className="mb-4 font-display text-2xl uppercase text-text">Abiertas</h2>
        {abiertas.length === 0 ? (
          <EstadoVacio titulo="No hay convocatorias abiertas" texto="Cuando se abra una nueva convocatoria la verás aquí." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {abiertas.map((c) => (
              <article key={c.id} className={`${superficie} flex flex-col p-6`}>
                <div className="flex items-center gap-2">
                  <StatusBadge status="Abierta" />
                  <span className="font-condensed text-xs uppercase tracking-widest text-accent">{c.tipo}</span>
                </div>
                <h3 className="mt-3 font-display text-2xl uppercase text-text">{c.nombre}</h3>
                {c.descripcion && <p className="mt-2 text-sm text-text-muted">{c.descripcion}</p>}
                <div className="mt-4">
                  <Dato icono="calendario" texto={c.fechaFin ? `Hasta el ${fecha(c.fechaFin)}` : `Abierta desde el ${fecha(c.fechaInicio)}`} />
                </div>
                <div className="mt-5">
                  {c.yaPostulado ? (
                    <span className="inline-flex items-center gap-2 text-sm text-emerald-400">
                      <IconoEstudiante nombre="check" /> Ya estás postulado
                    </span>
                  ) : (
                    <Button size="sm" onClick={() => void postular(c.id, c.nombre)} disabled={enviando === c.id}>
                      {enviando === c.id ? "Enviando..." : "Postularme"}
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <Tabla
        titulo="Mis postulaciones"
        vacio="Aún no te has postulado a ninguna convocatoria."
        columnas={["Convocatoria", "Vigencia", "Estado", "Beneficio"]}
        filas={postulaciones.map((p) => [p.convocatoria, p.vigencia, <StatusBadge key="e" status={p.estado} />, p.beneficio ?? "—"])}
      />
    </div>
  )
}

// ---------- Noticias ----------
function Noticias({ datos }: { datos: DatosPortal }) {
  return (
    <div className="space-y-8">
      <CabeceraPagina ceja="Comunidad" titulo="Noticias" descripcion="Novedades, promociones y eventos de la academia." />
      {datos.noticias.length === 0 ? (
        <EstadoVacio titulo="Sin noticias" texto="No hay noticias publicadas por ahora." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {datos.noticias.map((n) => (
            <article key={n.id} className={`${superficie} overflow-hidden`}>
              {n.imagen && <img src={n.imagen} alt="" className="h-44 w-full object-cover" />}
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <StatusBadge status={n.tipo} />
                  <span className="text-xs text-text-muted">{fecha(n.fecha)}</span>
                </div>
                <h3 className="mt-3 font-display text-xl uppercase text-text">{n.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-text-muted">{n.contenido}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  )
}

// ---------- Mi perfil ----------
function MiPerfil({ datos }: { datos: DatosPortal }) {
  const p = datos.perfil
  return (
    <div className="space-y-8">
      <CabeceraPagina ceja="Cuenta" titulo="Mi perfil" descripcion="Tus datos registrados en la academia. Si algo no es correcto, solicita el cambio en recepción." />
      <section className={`${superficie} p-6`}>
        <div className="flex flex-wrap items-center gap-4">
          <Avatar nombre={p.nombre} grande />
          <div>
            <h2 className="font-display text-3xl uppercase text-text">{p.nombre}</h2>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={p.estado} />
              <span className="text-sm text-text-muted">Estudiante · Sede {p.sede}</span>
            </div>
          </div>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <CampoLectura etiqueta={p.tipoDocumento} valor={p.documento} />
          <CampoLectura etiqueta="Correo" valor={p.email ?? "—"} />
          <CampoLectura etiqueta="Teléfono" valor={p.telefono ?? "—"} />
          <CampoLectura etiqueta="Fecha de nacimiento" valor={fecha(p.fecha_nacimiento)} />
          <CampoLectura etiqueta="Edad" valor={p.edad !== null ? `${p.edad} años` : "—"} />
          <CampoLectura etiqueta="Sede" valor={p.direccionSede ? `${p.sede} · ${p.direccionSede}` : p.sede} />
        </div>
      </section>
      <Tabla
        titulo="Acudientes"
        vacio="No tienes acudientes registrados."
        columnas={["Nombre", "Documento", "Parentesco"]}
        filas={p.acudientes.map((a) => [a.nombre, a.documento, a.parentesco])}
      />
    </div>
  )
}

// ---------- Piezas de interfaz ----------
function CabeceraPagina({ ceja, titulo, descripcion }: { ceja: string; titulo: string; descripcion: string }) {
  return (
    <div>
      <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-accent">{ceja}</p>
      <h1 className="mt-1 font-display text-3xl uppercase text-text sm:text-4xl">{titulo}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">{descripcion}</p>
    </div>
  )
}

function TarjetaMetrica({
  etiqueta,
  valor,
  ayuda,
  icono,
  alerta = false,
}: {
  etiqueta: string
  valor: string
  ayuda: string
  icono: NombreIconoEstudiante
  alerta?: boolean
}) {
  return (
    <div className={`${superficie} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">{etiqueta}</p>
          <p className={`mt-3 truncate font-display text-3xl ${alerta ? "text-amber-400" : "text-text"}`}>{valor}</p>
        </div>
        <span className={`rounded-xl p-3 ${alerta ? "bg-amber-500/10 text-amber-400" : "bg-purple-400/10 text-accent"}`}>
          <IconoEstudiante nombre={icono} />
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">{ayuda}</p>
    </div>
  )
}

function Tabla({
  titulo,
  columnas,
  filas,
  vacio = "Sin registros.",
}: {
  titulo: string
  columnas: string[]
  filas: ReactNode[][]
  vacio?: string
}) {
  return (
    <section className={`${superficie} overflow-hidden`}>
      <h2 className="border-b border-border px-6 py-4 font-display text-xl uppercase text-text">{titulo}</h2>
      {filas.length === 0 ? (
        <p className="px-6 py-8 text-sm text-text-muted">{vacio}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border">
                {columnas.map((c) => (
                  <th key={c} className="whitespace-nowrap px-6 py-3 font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">{c}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filas.map((fila, i) => (
                <tr key={i} className="border-b border-border last:border-0 hover:bg-surface-alt/50">
                  {fila.map((celda, j) => (
                    <td key={j} className="whitespace-nowrap px-6 py-3 text-text-soft">{celda}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function Dato({ icono, texto }: { icono: NombreIconoEstudiante; texto: string }) {
  return (
    <p className="flex items-center gap-2 text-sm text-text-soft">
      <IconoEstudiante nombre={icono} className="h-4 w-4 shrink-0 text-accent" />
      <span className="first-letter:uppercase">{texto}</span>
    </p>
  )
}

function CampoLectura({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-alt/60 px-4 py-3">
      <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">{etiqueta}</p>
      <p className="mt-1 text-sm text-text">{valor}</p>
    </div>
  )
}

function Avatar({ nombre, pequeno = false, grande = false }: { nombre: string; pequeno?: boolean; grande?: boolean }) {
  const tamano = grande ? "h-16 w-16 text-lg" : pequeno ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm"
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-900 to-purple-400 font-condensed font-bold text-white ${tamano}`}>
      {iniciales(nombre)}
    </div>
  )
}

function Aviso({
  tono,
  titulo,
  texto,
  children,
}: {
  tono: "alerta" | "error"
  titulo: string
  texto: string
  children?: ReactNode
}) {
  const color = tono === "alerta" ? "border-amber-500/30 bg-amber-500/10 text-amber-400" : "border-red-500/30 bg-red-500/10 text-red-400"
  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-5 ${color}`}>
      <div className="flex items-start gap-3">
        <IconoEstudiante nombre="alerta" className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">{titulo}</p>
          <p className="mt-1 text-sm opacity-80">{texto}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function EstadoVacio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className={`${superficie} px-6 py-14 text-center`}>
      <h3 className="font-display text-xl uppercase text-text">{titulo}</h3>
      <p className="mt-2 text-sm text-text-muted">{texto}</p>
    </div>
  )
}

function EstadoCarga() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="h-10 w-64 animate-pulse rounded-xl bg-surface-alt" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface-alt" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-surface-alt" />
    </div>
  )
}
