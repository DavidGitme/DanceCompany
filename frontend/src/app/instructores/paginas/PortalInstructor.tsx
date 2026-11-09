import { useState, type ReactNode } from "react"
import Paginacion from "@/compartido/ui/Paginacion"
import Button from "@/compartido/ui/Button"
import StatusBadge from "@/compartido/ui/StatusBadge"
import logoFna from "@/recursos/logo-fna.png"
import IconoInstructor from "../componentes/IconoInstructor"
import {
  estudiantesInstructorMock,
  gruposInstructorMock,
  instructorMock,
  type EstudianteInstructor,
  type GrupoInstructor,
} from "@/modulos/instructores"

type VistaInstructor =
  | "inicio"
  | "grupos"
  | "estudiantes"
  | "perfil"

interface PortalInstructorProps {
  onSalir: () => void
}

const navegacion: {
  id: VistaInstructor
  etiqueta: string
  icono: "inicio" | "grupos" | "estudiantes" | "perfil"
}[] = [
  { id: "inicio", etiqueta: "Inicio", icono: "inicio" },
  { id: "grupos", etiqueta: "Mis grupos", icono: "grupos" },
  { id: "estudiantes", etiqueta: "Mis estudiantes", icono: "estudiantes" },
  { id: "perfil", etiqueta: "Mi perfil", icono: "perfil" },
]

const superficie =
  "rounded-2xl border border-border bg-surface shadow-lg shadow-black/5"
const campo =
  "w-full rounded-xl border border-border bg-surface-alt px-4 py-2.5 text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-purple-400"

function usePaginacion<T>(elementos: T[], tamanoInicial = 6) {
  const [pagina, setPagina] = useState(1)
  const [tamano, setTamano] = useState(tamanoInicial)

  const total = elementos.length
  const totalPaginas = Math.max(1, Math.ceil(total / tamano))
  const paginaActual = Math.min(pagina, totalPaginas)

  const visibles = elementos.slice(
    (paginaActual - 1) * tamano,
    paginaActual * tamano,
  )

  return {
    visibles,
    pagina: paginaActual,
    totalPaginas,
    total,
    tamano,
    setPagina,
    setTamano,
  }
}

export default function PortalInstructor({ onSalir }: PortalInstructorProps) {
  const [vista, setVista] = useState<VistaInstructor>("inicio")
  const [menuMovil, setMenuMovil] = useState(false)
  const [menuUsuario, setMenuUsuario] = useState(false)
  const [grupoSeleccionado, setGrupoSeleccionado] =
    useState<GrupoInstructor | null>(null)

  const navegar = (destino: VistaInstructor) => {
    setVista(destino)
    setMenuMovil(false)
    if (destino !== "grupos") setGrupoSeleccionado(null)
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
            <img
              src={logoFna}
              alt="F&A Dance Company"
              className="h-10 w-10 object-contain"
            />
            <div>
              <p className="font-display text-lg uppercase leading-none text-text">
                F&A
              </p>
              <p className="mt-1 font-condensed text-xs uppercase tracking-widest text-purple-400">
                Portal instructor
              </p>
            </div>
          </div>
          <button
            aria-label="Cerrar menú"
            className="rounded-lg p-2 text-text-muted hover:bg-surface-alt hover:text-text lg:hidden"
            onClick={() => setMenuMovil(false)}
          >
            <IconoInstructor nombre="cerrar" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-4 py-6">
          <p className="mb-3 px-3 font-condensed text-xs uppercase tracking-widest text-text-muted">
            Mi espacio
          </p>
          {navegacion.map((opcion) => {
            const activa = vista === opcion.id
            return (
              <button
                key={opcion.id}
                onClick={() => navegar(opcion.id)}
                className={[
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left font-condensed text-sm font-semibold uppercase tracking-wider transition-all",
                  activa
                    ? "bg-purple-700 text-white shadow-lg shadow-purple-700/20"
                    : "text-text-soft hover:bg-surface-alt hover:text-text",
                ].join(" ")}
              >
                <IconoInstructor nombre={opcion.icono} />
                {opcion.etiqueta}
              </button>
            )
          })}
        </nav>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-surface-alt p-3">
            <Avatar nombre={instructorMock.nombre} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-text">
                {instructorMock.nombre}
              </p>
              <p className="truncate text-xs text-text-muted">Instructor</p>
            </div>
          </div>
          <button
            onClick={onSalir}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-text-muted transition-colors hover:bg-red-500/10 hover:text-red-400"
          >
            <IconoInstructor nombre="salir" />
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
              <IconoInstructor nombre="menu" />
            </button>
            <div>
              <p className="font-condensed text-xs uppercase tracking-widest text-purple-400">
                Panel de instructor
              </p>
              <p className="hidden text-sm text-text-muted sm:block">
                {new Intl.DateTimeFormat("es-CO", { dateStyle: "full" }).format(new Date())}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-2">
            <button
              className="flex items-center gap-2 rounded-xl border border-transparent p-1.5 transition-colors hover:border-border hover:bg-surface"
              onClick={() => setMenuUsuario((valor) => !valor)}
            >
              <Avatar nombre={instructorMock.nombre} pequeno />
              <div className="hidden text-left md:block">
                <p className="text-sm font-semibold text-text">
                  {instructorMock.nombre}
                </p>
                <p className="text-xs text-text-muted">Instructor</p>
              </div>
              <IconoInstructor
                nombre="chevron"
                className="hidden h-4 w-4 text-text-muted md:block"
              />
            </button>

            {menuUsuario && (
              <div className={`${superficie} absolute right-0 top-14 w-56 p-2`}>
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-soft hover:bg-surface-alt hover:text-text"
                  onClick={() => navegar("perfil")}
                >
                  <IconoInstructor nombre="perfil" className="h-4 w-4" />
                  Ver mi perfil
                </button>
                <button
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-text-soft hover:bg-red-500/10 hover:text-red-400"
                  onClick={onSalir}
                >
                  <IconoInstructor nombre="salir" className="h-4 w-4" />
                  Cerrar sesión
                </button>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {vista === "inicio" && (
              <InicioInstructor onVerGrupos={() => navegar("grupos")} />
            )}
            {vista === "grupos" &&
              (grupoSeleccionado ? (
                <DetalleGrupo
                  grupo={grupoSeleccionado}
                  onVolver={() => setGrupoSeleccionado(null)}
                />
              ) : (
                <GruposInstructor onSeleccionar={setGrupoSeleccionado} />
              ))}
            {vista === "estudiantes" && <EstudiantesInstructor />}
            {vista === "perfil" && <PerfilInstructor />}
          </div>
        </main>
      </div>
    </div>
  )
}

function InicioInstructor({ onVerGrupos }: { onVerGrupos: () => void }) {
  const pendientes = estudiantesInstructorMock.filter(
    (estudiante) => estudiante.estado !== "Al día",
  ).length
  return (
    <div className="space-y-8">
      <CabeceraPagina
        ceja="Resumen de hoy"
        titulo={`¡Hola, ${instructorMock.nombre.split(" ")[0]}!`}
        descripcion="Consulta tus grupos asignados, estudiantes y la información de tu jornada."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <TarjetaMetrica
          etiqueta="Grupos asignados"
          valor={gruposInstructorMock.length}
          ayuda={`${new Set(gruposInstructorMock.map((grupo) => grupo.sede)).size} sedes activas`}
          icono="grupos"
        />
        <TarjetaMetrica
          etiqueta="Mis estudiantes"
          valor={estudiantesInstructorMock.length}
          ayuda="En todos tus grupos"
          icono="estudiantes"
        />
        <TarjetaMetrica
          etiqueta="Sedes asignadas"
          valor={new Set(gruposInstructorMock.map((grupo) => grupo.sede)).size}
          ayuda="Ubicaciones de tus grupos"
          icono="calendario"
        />
        <TarjetaMetrica
          etiqueta="Mensualidades"
          valor={pendientes}
          ayuda="Pendientes o vencidas"
          icono="seguridad"
          alerta
        />
      </div>

      <section className={`${superficie} overflow-hidden`}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5 sm:p-6">
          <div>
            <p className="font-condensed text-xs uppercase tracking-widest text-purple-400">
              Tu programación
            </p>
            <h2 className="mt-1 font-display text-2xl uppercase text-text">
              Grupos asignados
            </h2>
            <p className="mt-1 text-sm text-text-muted">
              Consulta los días, horarios, sedes y estudiantes de cada grupo.
            </p>
          </div>
          <Button size="sm" onClick={onVerGrupos}>
            Ver todos los grupos
            <IconoInstructor nombre="flecha" className="h-4 w-4" />
          </Button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6">
          {gruposInstructorMock.slice(0, 4).map((grupo) => (
            <article
              key={grupo.idGrupo}
              className="rounded-xl border border-border bg-surface-alt/60 p-4"
            >
              <p className="font-condensed text-xs uppercase tracking-widest text-purple-400">
                {grupo.estilo} · {grupo.nivel}
              </p>
              <h3 className="mt-1 font-display text-xl uppercase text-text">
                {grupo.nombre}
              </h3>
              <div className="mt-3 space-y-2">
                <DatoCompacto icono="calendario" texto={grupo.dias} />
                <DatoCompacto icono="reloj" texto={grupo.horario} />
                <DatoCompacto
                  icono="ubicacion"
                  texto={`${grupo.sede} · ${grupo.aula}`}
                />
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  )
}

function GruposInstructor({
  onSeleccionar,
}: {
  onSeleccionar: (grupo: GrupoInstructor) => void
}) {
  const [busqueda, setBusqueda] = useState("")
  const [estilo, setEstilo] = useState("")
  const [nivel, setNivel] = useState("")
  const [sede, setSede] = useState("")

  const grupos = gruposInstructorMock.filter(
    (grupo) =>
      grupo.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
      (!estilo || grupo.estilo === estilo) &&
      (!nivel || grupo.nivel === nivel) &&
      (!sede || grupo.sede === sede),
  )
  const paginacionGrupos = usePaginacion(grupos, 6)

  return (
    <div className="space-y-6">
      <CabeceraPagina
        ceja="Gestión académica"
        titulo="Mis grupos"
        descripcion="Consulta los grupos que tienes asignados, sus horarios y estudiantes."
      />
      <BarraBusquedaFiltros>
        <CampoBusqueda
          valor={busqueda}
          onChange={setBusqueda}
          placeholder="Buscar grupo..."
        />
        <MenuFiltros
          activos={[estilo, nivel, sede].filter(Boolean).length}
          onLimpiar={() => {
            setEstilo("")
            setNivel("")
            setSede("")
          }}
        >
          <OpcionFiltro
            etiqueta="Estilo"
            valor={estilo}
            onChange={setEstilo}
            opcionInicial="Todos los estilos"
          >
            <option value="Breaking">Breaking</option>
            <option value="Hip Hop">Hip Hop</option>
            <option value="Freestyle">Freestyle</option>
          </OpcionFiltro>
          <OpcionFiltro
            etiqueta="Nivel"
            valor={nivel}
            onChange={setNivel}
            opcionInicial="Todos los niveles"
          >
            <option value="Básico">Básico</option>
            <option value="Intermedio">Intermedio</option>
            <option value="Avanzado">Avanzado</option>
            <option value="Todos">Todos</option>
          </OpcionFiltro>
          <OpcionFiltro
            etiqueta="Sede"
            valor={sede}
            onChange={setSede}
            opcionInicial="Todas las sedes"
          >
            <option value="Bello">Bello</option>
            <option value="Copacabana">Copacabana</option>
          </OpcionFiltro>
        </MenuFiltros>
      </BarraBusquedaFiltros>

      {grupos.length ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {paginacionGrupos.visibles.map((grupo) => (
            <article
              key={grupo.idGrupo}
              className={`${superficie} group overflow-hidden transition-all hover:-translate-y-1 hover:border-purple-400/40`}
            >
              <div className="h-1 bg-gradient-to-r from-purple-900 via-purple-700 to-purple-400" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-condensed text-xs uppercase tracking-widest text-purple-400">
                      {grupo.estilo}
                    </p>
                    <h2 className="mt-1 font-display text-2xl uppercase text-text">
                      {grupo.nombre}
                    </h2>
                  </div>
                  <span className="rounded-full border border-border bg-surface-alt px-2.5 py-1 font-condensed text-xs uppercase text-text-soft">
                    {grupo.nivel}
                  </span>
                </div>
                <div className="mt-5 space-y-3 border-y border-border py-4">
                  <DatoCompacto
                    icono="ubicacion"
                    texto={`${grupo.sede} · ${grupo.aula}`}
                  />
                  <DatoCompacto
                    icono="calendario"
                    texto={grupo.dias}
                  />
                  <DatoCompacto icono="reloj" texto={grupo.horario} />
                  <DatoCompacto
                    icono="usuarios"
                    texto={`${grupo.estudiantes} estudiantes`}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  fullWidth
                  className="mt-4"
                  onClick={() => onSeleccionar(grupo)}
                >
                  Ver estudiantes
                  <IconoInstructor nombre="flecha" className="h-4 w-4" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <EstadoVacio
          titulo="No encontramos grupos"
          descripcion="Ajusta la búsqueda o limpia los filtros para volver a intentarlo."
        />
      )}
      {grupos.length > 0 && (
        <div className={`${superficie} overflow-hidden`}>
          <Paginacion
            pagina={paginacionGrupos.pagina}
            totalPaginas={paginacionGrupos.totalPaginas}
            total={paginacionGrupos.total}
            tamano={paginacionGrupos.tamano}
            onPagina={paginacionGrupos.setPagina}
            onTamano={paginacionGrupos.setTamano}
          />
        </div>
      )}
    </div>
  )
}

function EstudiantesInstructor() {
  const [busqueda, setBusqueda] = useState("")
  const [grupo, setGrupo] = useState("")
  const [estado, setEstado] = useState("")
  const [detalle, setDetalle] = useState<EstudianteInstructor | null>(null)

  const estudiantes = estudiantesInstructorMock.filter((estudiante) => {
    const grupoEstudiante = gruposInstructorMock.find(
      (item) => item.idGrupo === estudiante.idGrupo,
    )
    const coincideBusqueda = `${estudiante.nombre} ${estudiante.documento}`
      .toLowerCase()
      .includes(busqueda.toLowerCase())
    return (
      coincideBusqueda &&
      (!grupo || String(estudiante.idGrupo) === grupo) &&
      (!estado || estudiante.estado === estado) &&
      Boolean(grupoEstudiante)
    )
  })
  const paginacionEstudiantes = usePaginacion(estudiantes)

  return (
    <div className="space-y-6">
      <CabeceraPagina
        ceja="Seguimiento"
        titulo="Mis estudiantes"
        descripcion="Consulta la información académica y el estado de mensualidad de tus estudiantes."
      />
      <BarraBusquedaFiltros>
        <CampoBusqueda
          valor={busqueda}
          onChange={setBusqueda}
          placeholder="Nombre o identificación..."
        />
        <MenuFiltros
          activos={[grupo, estado].filter(Boolean).length}
          onLimpiar={() => {
            setGrupo("")
            setEstado("")
          }}
        >
          <OpcionFiltro
            etiqueta="Grupo"
            valor={grupo}
            onChange={setGrupo}
            opcionInicial="Todos los grupos"
          >
            {gruposInstructorMock.map((item) => (
              <option key={item.idGrupo} value={item.idGrupo}>
                {item.nombre}
              </option>
            ))}
          </OpcionFiltro>
          <OpcionFiltro
            etiqueta="Estado de mensualidad"
            valor={estado}
            onChange={setEstado}
            opcionInicial="Todas las mensualidades"
          >
            <option value="Al día">Al día</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Vencida">Vencida</option>
          </OpcionFiltro>
        </MenuFiltros>
      </BarraBusquedaFiltros>

      <div className={`${superficie} overflow-hidden`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead className="border-b border-border bg-surface-alt/70">
              <tr>
                {[
                  "Estudiante",
                  "Identificación",
                  "Grupo",
                  "Estilo",
                  "Mensualidad",
                  "Acción",
                ].map((titulo) => (
                  <th
                    key={titulo}
                    className="px-5 py-4 text-left font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted"
                  >
                    {titulo}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
             {paginacionEstudiantes.visibles.map((estudiante) => {
                const grupoEstudiante = gruposInstructorMock.find(
                  (item) => item.idGrupo === estudiante.idGrupo,
                )!
                return (
                  <tr
                    key={estudiante.idEstudiante}
                    className="border-b border-border last:border-0 hover:bg-purple-400/5"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={estudiante.nombre} pequeno />
                        <span className="font-semibold text-text">
                          {estudiante.nombre}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-sm text-text-soft">
                      {estudiante.documento}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-soft">
                      {grupoEstudiante.nombre}
                    </td>
                    <td className="px-5 py-4 text-sm text-text-soft">
                      {grupoEstudiante.estilo}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={estudiante.estado} />
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => setDetalle(estudiante)}
                        className="font-condensed text-xs font-semibold uppercase tracking-wider text-purple-400 hover:text-purple-100"
                      >
                        Ver detalle
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {!estudiantes.length && (
          <EstadoVacio
            compacto
            titulo="No hay estudiantes"
            descripcion="No existen resultados para los filtros seleccionados."
          />
        )}
       <Paginacion
      pagina={paginacionEstudiantes.pagina}
      totalPaginas={paginacionEstudiantes.totalPaginas}
      total={paginacionEstudiantes.total}
      tamano={paginacionEstudiantes.tamano}
      onPagina={paginacionEstudiantes.setPagina}
      onTamano={paginacionEstudiantes.setTamano}
      />
      </div>

      {detalle && (
        <DetalleEstudiante
          estudiante={detalle}
          onClose={() => setDetalle(null)}
        />
      )}
    </div>
  )
}

function DetalleGrupo({
  grupo,
  onVolver,
}: {
  grupo: GrupoInstructor
  onVolver: () => void
}) {
  const estudiantes = estudiantesInstructorMock.filter(
    (estudiante) => estudiante.idGrupo === grupo.idGrupo,
  )
  const paginacionEstudiantes = usePaginacion(estudiantes, 8)
  const paginacion = usePaginacion(estudiantes)

  return (
    <div className="space-y-6">
      <button
        onClick={onVolver}
        className="flex items-center gap-2 font-condensed text-sm font-semibold uppercase tracking-wider text-text-muted hover:text-purple-400"
      >
        <IconoInstructor nombre="flecha" className="h-4 w-4 rotate-180" />
        Volver a mis grupos
      </button>
      <section className={`${superficie} overflow-hidden`}>
        <div className="h-1 bg-gradient-to-r from-purple-900 via-purple-700 to-purple-400" />
        <div className="p-6">
          <div>
            <p className="font-condensed text-xs uppercase tracking-widest text-purple-400">
              Detalle de grupo
            </p>
            <h1 className="mt-1 font-display text-4xl uppercase">{grupo.nombre}</h1>
            <p className="mt-2 text-sm text-text-muted">
              {grupo.estilo} · Nivel {grupo.nivel}
            </p>
          </div>
        </div>
        <div className="grid gap-4 border-t border-border p-6 sm:grid-cols-2 lg:grid-cols-4">
          <DatoIcono icono="perfil" etiqueta="Instructor" valor={instructorMock.nombre} />
          <DatoIcono icono="ubicacion" etiqueta="Ubicación" valor={`${grupo.sede} · ${grupo.aula}`} />
          <DatoIcono icono="calendario" etiqueta="Días" valor={grupo.dias} />
          <DatoIcono icono="reloj" etiqueta="Horario" valor={grupo.horario} />
        </div>
      </section>
      <section className={`${superficie} overflow-hidden`}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div>
            <h2 className="font-display text-2xl uppercase">Estudiantes del grupo</h2>
            <p className="mt-1 text-sm text-text-muted">
              {estudiantes.length} estudiantes asignados
            </p>
          </div>
          <IconoInstructor nombre="estudiantes" className="h-6 w-6 text-purple-400" />
        </div>
        <div className="divide-y divide-border">
          {paginacion.visibles.map((estudiante) => (
            <div
              key={estudiante.idEstudiante}
              className="flex flex-wrap items-center gap-4 px-5 py-4 hover:bg-surface-alt/60"
            >
              <Avatar nombre={estudiante.nombre} pequeno />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-text">{estudiante.nombre}</p>
                <p className="text-xs text-text-muted">{estudiante.documento}</p>
              </div>
              <StatusBadge status={estudiante.estado} />
            </div>
          ))}
        </div>
        <Paginacion
  pagina={paginacion.pagina}
  totalPaginas={paginacion.totalPaginas}
  total={paginacion.total}
  tamano={paginacion.tamano}
  onPagina={paginacion.setPagina}
  onTamano={paginacion.setTamano}
/>
      </section>
    </div>
  )
}

function PerfilInstructor() {
  const [editando, setEditando] = useState(false)
  const [cambiarClave, setCambiarClave] = useState(false)
  const [mensaje, setMensaje] = useState("")
  const [perfil, setPerfil] = useState(instructorMock)
  const [borrador, setBorrador] = useState(instructorMock)

  const guardar = () => {
    setPerfil(borrador)
    setEditando(false)
    setMensaje("Tu información se actualizó correctamente.")
    window.setTimeout(() => setMensaje(""), 3500)
  }

  return (
    <div className="space-y-6">
      <CabeceraPagina
        ceja="Cuenta personal"
        titulo="Mi perfil"
        descripcion="Consulta y actualiza tu información personal y de contacto."
      />
      {mensaje && <MensajeExito texto={mensaje} />}
      <div className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
        <section className={`${superficie} p-6 text-center`}>
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-900 to-purple-400 font-display text-3xl text-white shadow-xl shadow-purple-700/20">
            {iniciales(perfil.nombre)}
          </div>
          <h2 className="mt-5 font-display text-2xl uppercase">{perfil.nombre}</h2>
          <p className="mt-1 text-sm text-purple-400">Instructor</p>
          <p className="mt-4 text-sm text-text-muted">{perfil.especialidad}</p>
          <div className="mt-6 rounded-xl border border-border bg-surface-alt p-4 text-left">
            <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">
              Estado de cuenta
            </p>
            <div className="mt-2 flex items-center justify-between">
              <span className="text-sm text-text-soft">Acceso habilitado</span>
              <StatusBadge status="Activo" />
            </div>
          </div>
        </section>

        <section className={`${superficie} p-6`}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
            <div>
              <h2 className="font-display text-2xl uppercase">
                Información personal
              </h2>
              <p className="mt-1 text-sm text-text-muted">
                Datos visibles para la academia.
              </p>
            </div>
            {!editando && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setBorrador(perfil)
                  setEditando(true)
                }}
              >
                <IconoInstructor nombre="editar" className="h-4 w-4" />
                Editar información
              </Button>
            )}
          </div>
          <div className="grid gap-5 py-6 sm:grid-cols-2">
            <CampoPerfil
              etiqueta="Nombre completo"
              valor={borrador.nombre}
              editando={editando}
              onChange={(valor) =>
                setBorrador((actual) => ({ ...actual, nombre: valor }))
              }
            />
            <CampoPerfil
              etiqueta="Identificación"
              valor={borrador.documento}
              editando={false}
              onChange={() => undefined}
            />
            <CampoPerfil
              etiqueta="Correo electrónico"
              valor={borrador.correo}
              editando={editando}
              tipo="email"
              onChange={(valor) =>
                setBorrador((actual) => ({ ...actual, correo: valor }))
              }
            />
            <CampoPerfil
              etiqueta="Teléfono"
              valor={borrador.telefono}
              editando={editando}
              onChange={(valor) =>
                setBorrador((actual) => ({ ...actual, telefono: valor }))
              }
            />
          </div>
          {editando && (
            <div className="flex justify-end gap-3 border-t border-border pt-5">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setBorrador(perfil)
                  setEditando(false)
                }}
              >
                Cancelar
              </Button>
              <Button size="sm" onClick={guardar}>
                Guardar cambios
              </Button>
            </div>
          )}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-surface-alt p-4">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-purple-400/10 p-2.5 text-purple-400">
                <IconoInstructor nombre="seguridad" />
              </span>
              <div>
                <p className="text-sm font-semibold text-text">
                  Información de acceso
                </p>
                <p className="text-xs text-text-muted">
                  Última actualización hace 3 meses
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setCambiarClave(true)}
            >
              Cambiar contraseña
            </Button>
          </div>
        </section>
      </div>
      {cambiarClave && (
        <Modal titulo="Cambiar contraseña" onClose={() => setCambiarClave(false)}>
          <div className="space-y-4">
            {["Contraseña actual", "Nueva contraseña", "Confirmar contraseña"].map(
              (etiqueta) => (
                <label key={etiqueta}>
                  <span className="mb-1.5 block font-condensed text-xs uppercase tracking-wider text-text-muted">
                    {etiqueta}
                  </span>
                  <input type="password" className={campo} placeholder="••••••••" />
                </label>
              ),
            )}
            <Button
              fullWidth
              size="sm"
              onClick={() => {
                setCambiarClave(false)
                setMensaje("Tu contraseña se actualizó correctamente.")
                window.setTimeout(() => setMensaje(""), 3500)
              }}
            >
              Actualizar contraseña
            </Button>
          </div>
        </Modal>
      )}
    </div>
  )
}

function DetalleEstudiante({
  estudiante,
  onClose,
}: {
  estudiante: EstudianteInstructor
  onClose: () => void
}) {
  const grupo = gruposInstructorMock.find(
    (item) => item.idGrupo === estudiante.idGrupo,
  )!
  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        aria-label="Cerrar detalle"
        className="absolute inset-0"
        onClick={onClose}
      />
      <aside className="relative z-10 h-full w-full max-w-xl overflow-y-auto border-l border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Avatar nombre={estudiante.nombre} />
            <div>
              <p className="font-condensed text-xs uppercase tracking-widest text-purple-400">
                Detalle del estudiante
              </p>
              <h2 className="mt-1 font-display text-2xl uppercase">
                {estudiante.nombre}
              </h2>
            </div>
          </div>
          <button
            aria-label="Cerrar"
            className="rounded-xl border border-border p-2 text-text-muted hover:text-text"
            onClick={onClose}
          >
            <IconoInstructor nombre="cerrar" />
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <DatoTexto etiqueta="Identificación" valor={estudiante.documento} />
          <DatoTexto etiqueta="Teléfono" valor={estudiante.telefono} />
          <DatoTexto etiqueta="Correo" valor={estudiante.correo} />
          <DatoTexto etiqueta="Estado actual" valor={estudiante.estado} />
        </div>
        <div className="mt-6 rounded-xl border border-border bg-surface-alt p-4">
          <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">
            Grupo asignado
          </p>
          <p className="mt-2 font-semibold text-text">{grupo.nombre}</p>
          <p className="mt-1 text-sm text-text-muted">
            {grupo.estilo} · {grupo.nivel} · {grupo.sede}
          </p>
        </div>
        <div className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-xl uppercase">
              Historial de mensualidades
            </h3>
            <StatusBadge status={estudiante.estado} />
          </div>
          <div className="space-y-3">
            {estudiante.mensualidades.map((mensualidad) => (
              <div
                key={mensualidad.periodo}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-border p-4"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-text">
                    {mensualidad.periodo}
                  </p>
                  <p className="mt-1 text-xs text-text-muted">
                    Límite: {mensualidad.fechaLimite}
                  </p>
                </div>
                <p className="text-sm text-text-soft">
                  ${mensualidad.valor.toLocaleString("es-CO")}
                </p>
                <StatusBadge status={mensualidad.estado} />
              </div>
            ))}
          </div>
          <p className="mt-4 rounded-xl border border-border bg-surface-alt p-3 text-xs leading-relaxed text-text-muted">
            Esta información es únicamente de consulta. Los pagos solo pueden
            ser modificados por el personal administrativo.
          </p>
        </div>
      </aside>
    </div>
  )
}

function CabeceraPagina({
  ceja,
  titulo,
  descripcion,
}: {
  ceja: string
  titulo: string
  descripcion: string
}) {
  return (
    <div>
      <p className="font-condensed text-xs font-semibold uppercase tracking-widest text-purple-400">
        {ceja}
      </p>
      <h1 className="mt-1 font-display text-3xl uppercase text-text sm:text-4xl">
        {titulo}
      </h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-muted">
        {descripcion}
      </p>
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
  valor: number
  ayuda: string
  icono: "grupos" | "estudiantes" | "calendario" | "seguridad"
  alerta?: boolean
}) {
  return (
    <div className={`${superficie} p-5`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">
            {etiqueta}
          </p>
          <p
            className={`mt-3 font-display text-4xl ${alerta ? "text-amber-400" : "text-text"}`}
          >
            {String(valor).padStart(2, "0")}
          </p>
        </div>
        <span
          className={`rounded-xl p-3 ${alerta ? "bg-amber-500/10 text-amber-400" : "bg-purple-400/10 text-purple-400"}`}
        >
          <IconoInstructor nombre={icono} />
        </span>
      </div>
      <p className="mt-3 text-xs text-text-muted">{ayuda}</p>
    </div>
  )
}

function BarraBusquedaFiltros({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${superficie} flex flex-col gap-4 p-4 sm:flex-row sm:items-end`}
    >
      {children}
    </div>
  )
}

function CampoBusqueda({
  valor,
  onChange,
  placeholder,
}: {
  valor: string
  onChange: (valor: string) => void
  placeholder: string
}) {
  return (
    <label className="relative min-w-64 flex-[2]">
      <span className="mb-1.5 block font-condensed text-xs uppercase tracking-wider text-text-muted">
        Buscar
      </span>
      <IconoInstructor
        nombre="buscar"
        className="absolute bottom-3 left-3 h-4 w-4 text-text-muted"
      />
      <input
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
        className={`${campo} pl-10`}
        placeholder={placeholder}
      />
    </label>
  )
}

function MenuFiltros({
  activos,
  onLimpiar,
  children,
}: {
  activos: number
  onLimpiar: () => void
  children: ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  return (
    <div className="relative sm:ml-auto">
      <button
        type="button"
        aria-expanded={abierto}
        onClick={() => setAbierto((valor) => !valor)}
        className={[
          "flex w-full items-center justify-center gap-2 rounded-xl border px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider transition-colors sm:w-auto",
          abierto || activos
            ? "border-purple-400/50 bg-purple-400/10 text-purple-400"
            : "border-border bg-surface-alt text-text-soft hover:border-purple-400/40 hover:text-text",
        ].join(" ")}
      >
        <IconoInstructor nombre="filtro" className="h-4 w-4" />
        Filtrar
        {activos > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-purple-700 px-1.5 text-xs text-white">
            {activos}
          </span>
        )}
        <IconoInstructor
          nombre="chevron"
          className={`h-4 w-4 transition-transform ${abierto ? "rotate-180" : ""}`}
        />
      </button>
      {abierto && (
        <>
          <button
            aria-label="Cerrar filtros"
            className="fixed inset-0 z-30"
            onClick={() => setAbierto(false)}
          />
          <div
            className={`${superficie} absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] p-4`}
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="font-condensed text-sm font-semibold uppercase tracking-wider text-text">
                  Filtros
                </p>
                <p className="mt-0.5 text-xs text-text-muted">
                  Selecciona una o varias opciones
                </p>
              </div>
              {activos > 0 && (
                <button
                  type="button"
                  onClick={onLimpiar}
                  className="font-condensed text-xs font-semibold uppercase tracking-wider text-purple-400 hover:text-purple-100"
                >
                  Limpiar
                </button>
              )}
            </div>
            <div className="space-y-4">{children}</div>
            <Button
              fullWidth
              size="sm"
              className="mt-5"
              onClick={() => setAbierto(false)}
            >
              Ver resultados
            </Button>
          </div>
        </>
      )}
    </div>
  )
}

function OpcionFiltro({
  etiqueta,
  valor,
  onChange,
  opcionInicial,
  children,
}: {
  etiqueta: string
  valor: string
  onChange: (valor: string) => void
  opcionInicial: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-condensed text-xs uppercase tracking-wider text-text-muted">
        {etiqueta}
      </span>
      <select
        className={campo}
        value={valor}
        onChange={(evento) => onChange(evento.target.value)}
      >
        <option value="">{opcionInicial}</option>
        {children}
      </select>
    </label>
  )
}

function DatoIcono({
  icono,
  etiqueta,
  valor,
}: {
  icono: "reloj" | "ubicacion" | "grupos" | "perfil" | "calendario"
  etiqueta: string
  valor: string
}) {
  return (
    <div className="flex items-start gap-3">
      <span className="rounded-xl bg-purple-400/10 p-2.5 text-purple-400">
        <IconoInstructor nombre={icono} className="h-4 w-4" />
      </span>
      <div>
        <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">
          {etiqueta}
        </p>
        <p className="mt-1 text-sm font-medium text-text">{valor}</p>
      </div>
    </div>
  )
}

function DatoCompacto({
  icono,
  texto,
}: {
  icono: "ubicacion" | "calendario" | "reloj" | "usuarios"
  texto: string
}) {
  return (
    <div className="flex items-center gap-2.5 text-sm text-text-soft">
      <IconoInstructor nombre={icono} className="h-4 w-4 text-purple-400" />
      {texto}
    </div>
  )
}

function DatoTexto({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div>
      <p className="font-condensed text-xs uppercase tracking-wider text-text-muted">
        {etiqueta}
      </p>
      <p className="mt-1 text-sm font-medium text-text">{valor}</p>
    </div>
  )
}

function CampoPerfil({
  etiqueta,
  valor,
  editando,
  onChange,
  tipo = "text",
}: {
  etiqueta: string
  valor: string
  editando: boolean
  onChange: (valor: string) => void
  tipo?: string
}) {
  return (
    <label>
      <span className="mb-1.5 block font-condensed text-xs uppercase tracking-wider text-text-muted">
        {etiqueta}
      </span>
      {editando ? (
        <input
          type={tipo}
          className={campo}
          value={valor}
          onChange={(evento) => onChange(evento.target.value)}
        />
      ) : (
        <div className="rounded-xl border border-border bg-surface-alt px-4 py-3 text-sm text-text">
          {valor}
        </div>
      )}
    </label>
  )
}

function Avatar({
  nombre,
  pequeno = false,
}: {
  nombre: string
  pequeno?: boolean
}) {
  return (
    <div
      className={[
        "flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-900 to-purple-400 font-condensed font-bold text-white",
        pequeno ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm",
      ].join(" ")}
    >
      {iniciales(nombre)}
    </div>
  )
}

function EstadoVacio({
  titulo,
  descripcion,
  compacto = false,
}: {
  titulo: string
  descripcion: string
  compacto?: boolean
}) {
  return (
    <div
      className={`${superficie} flex flex-col items-center justify-center px-6 text-center ${compacto ? "border-0 py-12 shadow-none" : "py-20"}`}
    >
      <span className="rounded-2xl bg-surface-alt p-4 text-text-muted">
        <IconoInstructor nombre="buscar" className="h-7 w-7" />
      </span>
      <h2 className="mt-4 font-display text-xl uppercase">{titulo}</h2>
      <p className="mt-2 max-w-md text-sm text-text-muted">{descripcion}</p>
    </div>
  )
}

function MensajeExito({ texto }: { texto: string }) {
  return (
    <div
      role="status"
      className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400"
    >
      <IconoInstructor nombre="seguridad" className="h-5 w-5" />
      {texto}
    </div>
  )
}

function Modal({
  titulo,
  onClose,
  children,
}: {
  titulo: string
  onClose: () => void
  children: ReactNode
}) {
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <button
        aria-label="Cerrar modal"
        className="absolute inset-0"
        onClick={onClose}
      />
      <div className={`${superficie} relative z-10 w-full max-w-md p-6`}>
        <div className="mb-5 flex items-center justify-between">
          <h2 className="font-display text-2xl uppercase">{titulo}</h2>
          <button
            aria-label="Cerrar"
            className="rounded-xl p-2 text-text-muted hover:bg-surface-alt hover:text-text"
            onClick={onClose}
          >
            <IconoInstructor nombre="cerrar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const iniciales = (nombre: string) =>
  nombre
    .split(" ")
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase()
