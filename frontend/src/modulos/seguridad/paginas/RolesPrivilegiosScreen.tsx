import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import { clienteHttp } from "@/nucleo/http/clienteHttp"
import { useAuth } from "@/nucleo/auth/useAuth"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import { mensajeError } from "@/compartido/api/recursos"
import {
  Icono,
  claseBotonPrincipal,
  claseBotonSecundario,
  claseEntrada,
} from "@/compartido/ui/PantallaRecurso"
import type { RespuestaLista } from "@/compartido/tipos/entities"

/*
 * Seguridad nivel 3: lo que cada rol puede hacer en cada módulo.
 * Ver, crear, editar y eliminar se guardan en roles_permisos y el backend los exige
 * en cada petición (GET = ver, POST = crear, PUT/PATCH = editar, DELETE = eliminar).
 */

type Accion = "ver" | "crear" | "editar" | "eliminar"
const ACCIONES: { clave: Accion; etiqueta: string; ayuda: string }[] = [
  { clave: "ver", etiqueta: "Ver", ayuda: "Entra al módulo y consulta la información" },
  { clave: "crear", etiqueta: "Crear", ayuda: "Registra información nueva" },
  { clave: "editar", etiqueta: "Editar", ayuda: "Modifica, activa o inactiva registros" },
  { clave: "eliminar", etiqueta: "Eliminar", ayuda: "Borra o retira registros" },
]

// Nombres legibles de los módulos (tabla permisos)
const NOMBRES: Record<string, string> = {
  dashboard: "Dashboard",
  estudiantes: "Estudiantes e inscripción",
  instructores: "Instructores",
  pagos: "Pagos y mensualidades",
  grupos: "Grupos",
  horarios: "Horarios",
  sedes: "Sedes",
  talleres: "Talleres",
  usuarios: "Seguridad (usuarios, personas, roles)",
  roles: "Roles",
  reportes: "Reportes",
  matriculas: "Matrículas",
  aulas: "Aulas",
  niveles: "Niveles",
  estilos: "Estilos",
  convocatorias: "Convocatorias y competencias",
  noticias: "Noticias",
}

interface Rol {
  idRol: number
  nombre: string
  idEstado: number
}

interface FilaPrivilegio {
  idPermiso: number
  modulo: string
  ver: boolean
  crear: boolean
  editar: boolean
  eliminar: boolean
}

interface Matriz {
  idRol: number
  rol: string
  editable: boolean
  privilegios: FilaPrivilegio[]
}


/*
 * Superadministrador = cuenta Administrador sin sede (cuenta técnica): crea roles, los
 * activa o inactiva y ajusta privilegios. Administrador de sede: solo ajusta los privilegios
 * de los roles que no son Administrador (el backend aplica las mismas reglas).
 */
export default function RolesPrivilegiosScreen() {
  const { usuario } = useAuth()
  const superadmin = Boolean(usuario && usuario.idSede == null && usuario.roles.includes("administrador"))
  const [nuevoRol, setNuevoRol] = useState<string | null>(null)
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null)
  const [cambioEstado, setCambioEstado] = useState<Rol | null>(null)
  const [roles, setRoles] = useState<Rol[]>([])
  const [rolActivo, setRolActivo] = useState<number | null>(null)
  const [matriz, setMatriz] = useState<Matriz | null>(null)
  const [original, setOriginal] = useState<string>("")
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  const cargarRoles = useCallback((seleccionar?: number) => {
    return clienteHttp
      .get<RespuestaLista<Rol>>("/roles?pagina=1&tamano=100")
      .then((r) => {
        setRoles(r.datos)
        // Empieza por el primer rol que se puede ajustar (no el Administrador)
        const primero = r.datos.find((rol) => rol.nombre.toLowerCase() !== "administrador") ?? r.datos[0]
        setRolActivo((actual) => seleccionar ?? actual ?? primero?.idRol ?? null)
      })
      .catch((e) => setError(mensajeError(e)))
      .finally(() => setCargando(false))
  }, [])

  useEffect(() => {
    cargarRoles()
  }, [cargarRoles])

  // Validación en vivo del nombre del rol nuevo
  const errorNombreRol = (nombre: string) => {
    const limpio = nombre.trim()
    if (limpio.length < 2) return tr("Escribe al menos 2 caracteres.")
    if (limpio.length > 30) return tr("Máximo {max} caracteres.", { max: 30 })
    if (roles.some((r) => r.nombre.trim().toLowerCase() === limpio.toLowerCase())) return tr("Ya existe un rol con ese nombre.")
    return null
  }

  const crearRol = async () => {
    if (nuevoRol === null) return
    const problema = errorNombreRol(nuevoRol)
    setErrorNuevo(problema)
    if (problema) return
    setGuardando(true)
    try {
      const creado = await clienteHttp.post<Rol>("/roles", { nombre: nuevoRol.trim(), idEstado: 1, permisos: [] })
      setNuevoRol(null)
      setAviso(tr("Se creó el rol {rol}. Marca sus privilegios y guarda.", { rol: creado.nombre }))
      await cargarRoles(creado.idRol)
    } catch (e) {
      setErrorNuevo(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const confirmarEstado = async () => {
    if (!cambioEstado) return
    setGuardando(true)
    try {
      if (cambioEstado.idEstado === 1) {
        await clienteHttp.delete(`/roles/${cambioEstado.idRol}`)
      } else {
        await clienteHttp.put(`/roles/${cambioEstado.idRol}`, { nombre: cambioEstado.nombre, idEstado: 1 })
      }
      setAviso(tr(cambioEstado.idEstado === 1 ? "El rol {rol} quedó inactivo." : "El rol {rol} quedó activo.", { rol: cambioEstado.nombre }))
      setCambioEstado(null)
      await cargarRoles()
    } catch (e) {
      setError(mensajeError(e))
      setCambioEstado(null)
    } finally {
      setGuardando(false)
    }
  }

  const cargarMatriz = useCallback(async (idRol: number) => {
    setCargando(true)
    setError(null)
    try {
      const datos = await clienteHttp.get<Matriz>(`/roles/${idRol}/privilegios`)
      setMatriz(datos)
      setOriginal(JSON.stringify(datos.privilegios))
    } catch (e) {
      setError(mensajeError(e))
      setMatriz(null)
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    if (rolActivo !== null) cargarMatriz(rolActivo)
  }, [rolActivo, cargarMatriz])

  useEffect(() => {
    if (!aviso) return
    const espera = window.setTimeout(() => setAviso(null), 4500)
    return () => window.clearTimeout(espera)
  }, [aviso])

  const cambios = useMemo(() => Boolean(matriz && JSON.stringify(matriz.privilegios) !== original), [matriz, original])

  const marcar = (idPermiso: number, accion: Accion, valor: boolean) => {
    setMatriz((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        privilegios: prev.privilegios.map((fila) => {
          if (fila.idPermiso !== idPermiso) return fila
          const nueva = { ...fila, [accion]: valor }
          // Sin "ver" no se puede hacer nada más; cualquier otra acción incluye "ver"
          if (accion === "ver" && !valor) return { ...nueva, crear: false, editar: false, eliminar: false }
          if (accion !== "ver" && valor) nueva.ver = true
          return nueva
        }),
      }
    })
  }

  const marcarFila = (idPermiso: number, valor: boolean) =>
    setMatriz((prev) =>
      prev && {
        ...prev,
        privilegios: prev.privilegios.map((fila) =>
          fila.idPermiso === idPermiso ? { ...fila, ver: valor, crear: valor, editar: valor, eliminar: valor } : fila,
        ),
      },
    )

  const guardar = async () => {
    if (!matriz) return
    setGuardando(true)
    setError(null)
    try {
      const datos = await clienteHttp.put<Matriz>(`/roles/${matriz.idRol}/privilegios`, {
        privilegios: matriz.privilegios.map(({ idPermiso, ver, crear, editar, eliminar }) => ({
          idPermiso, ver, crear, editar, eliminar,
        })),
      })
      setMatriz(datos)
      setOriginal(JSON.stringify(datos.privilegios))
      setAviso(`Los privilegios del rol ${datos.rol} se guardaron. Aplican desde la siguiente acción de esas cuentas.`)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const resumen = (rol: Matriz) => rol.privilegios.filter((f) => f.ver).length

  return (
    <section aria-labelledby="roles-titulo" className="flex flex-col gap-6">
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex justify-end sm:inset-x-auto sm:right-6">
        {aviso && (
          <p role="status" className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-surface px-5 py-4 font-body text-sm font-semibold text-emerald-700 shadow-2xl dark:text-emerald-300">
            <Icono nombre="check" /> {aviso}
          </p>
        )}
      </div>

      {/* Mismo encabezado que los demás listados: grupo, título y una instrucción breve */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-accent">{tr("Seguridad")}</p>
          <h1 id="roles-titulo" className="display mt-2 text-4xl text-text sm:text-5xl">{tr("Roles y privilegios")}</h1>
          <p className="mt-2 font-body text-sm text-text-soft">{tr("Elige un rol y marca qué puede hacer en cada módulo.")}</p>
        </div>
        {superadmin && (
          <button type="button" className={claseBotonPrincipal} onClick={() => { setNuevoRol(""); setErrorNuevo(null) }} disabled={guardando}>
            <Icono nombre="mas" /> {tr("Nuevo rol")}
          </button>
        )}
      </header>

      {nuevoRol !== null && (
        <form
          noValidate
          onSubmit={(e) => { e.preventDefault(); crearRol() }}
          className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:flex-row sm:items-start"
        >
          <label className="flex-1">
            <span className="mb-1.5 block font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
              {tr("Nombre del rol")} <span className="text-red-500" aria-hidden="true">*</span>
            </span>
            <input
              autoFocus
              value={nuevoRol}
              maxLength={30}
              onChange={(e) => { setNuevoRol(e.target.value); setErrorNuevo(errorNombreRol(e.target.value)) }}
              aria-invalid={errorNuevo ? true : undefined}
              aria-describedby={errorNuevo ? "rol-nuevo-error" : undefined}
              className={claseEntrada}
              placeholder={tr("Ej. Recepción")}
            />
            {errorNuevo && <span id="rol-nuevo-error" className="mt-1 block font-body text-xs font-medium text-red-600 dark:text-red-300">{errorNuevo}</span>}
          </label>
          <div className="flex gap-2 sm:pt-6">
            <button type="button" className={claseBotonSecundario} onClick={() => setNuevoRol(null)} disabled={guardando}>{tr("Cancelar")}</button>
            <button type="submit" className={claseBotonPrincipal} disabled={guardando || Boolean(errorNuevo)}>{tr("Crear rol")}</button>
          </div>
        </form>
      )}

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        {/* Roles */}
        <nav aria-label={tr("Roles")} className="flex flex-row gap-2 overflow-x-auto lg:flex-col">
          {roles.map((rol) => {
            const activo = rol.idRol === rolActivo
            return (
              <button
                key={rol.idRol}
                type="button"
                aria-current={activo ? "true" : undefined}
                disabled={guardando}
                onClick={() => {
                  if (cambios && !window.confirm("Tienes cambios sin guardar. ¿Quieres descartarlos?")) return
                  setRolActivo(rol.idRol)
                }}
                className={`flex shrink-0 items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left font-body text-sm transition-colors ${
                  activo ? "border-accent bg-accent/10 text-text" : "border-border bg-surface text-text-soft hover:border-accent/50"
                }`}
              >
                <span className="font-semibold">{tr(rol.nombre)}</span>
                {rol.idEstado !== 1 && <span className="font-condensed text-[11px] uppercase tracking-wider text-text-muted">{tr("Inactivo")}</span>}
              </button>
            )
          })}
        </nav>

        {/* Matriz */}
        <div className="overflow-hidden rounded-[20px] border border-border bg-surface" aria-busy={cargando}>
          {error && (
            <p role="alert" className="m-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 font-body text-sm text-red-600 dark:text-red-300">
              <Icono nombre="alerta" clase="h-5 w-5 shrink-0" /> {error}
            </p>
          )}
          {cargando && !matriz ? (
            <div className="flex flex-col gap-3 p-5">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="esqueleto h-10 rounded-xl" />)}
            </div>
          ) : matriz ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div>
                  <h2 className="font-display text-2xl uppercase text-text">{tr(matriz.rol)}</h2>
                  <p className="font-body text-xs text-text-muted">
                    {matriz.editable
                      ? tr("Acceso a {n} de {total} módulos.", { n: resumen(matriz), total: matriz.privilegios.length })
                      : tr("Acceso completo a todos los módulos (no se puede limitar).")}
                  </p>
                </div>
                {matriz.editable && (
                  <div className="flex flex-wrap gap-2">
                    {superadmin && (() => {
                      const rol = roles.find((r) => r.idRol === matriz.idRol)
                      return rol && rol.nombre.trim().toLowerCase() !== "administrador" ? (
                        <button type="button" className={claseBotonSecundario} disabled={guardando} onClick={() => setCambioEstado(rol)}>
                          {tr(rol.idEstado === 1 ? "Inactivar rol" : "Activar rol")}
                        </button>
                      ) : null
                    })()}
                    <button type="button" className={claseBotonSecundario} disabled={!cambios || guardando} onClick={() => cargarMatriz(matriz.idRol)}>
                      {tr("Descartar")}
                    </button>
                    <button type="button" className={claseBotonPrincipal} disabled={!cambios || guardando} aria-busy={guardando} onClick={guardar}>
                      {guardando ? tr("Guardando…") : tr("Guardar privilegios")}
                    </button>
                  </div>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <caption className="sr-only">Privilegios del rol {matriz.rol} por módulo</caption>
                  <thead>
                    <tr className="border-b border-border bg-surface-alt/60">
                      <th scope="col" className="px-5 py-3 font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">{tr("Módulo")}</th>
                      {ACCIONES.map((a) => (
                        <th key={a.clave} scope="col" title={tr(a.ayuda)} className="px-3 py-3 text-center font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">
                          {tr(a.etiqueta)}
                        </th>
                      ))}
                      {matriz.editable && <th scope="col" className="px-3 py-3 text-center font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">{tr("Todo")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {matriz.privilegios.map((fila) => {
                      const nombre = tr(NOMBRES[fila.modulo] ?? fila.modulo)
                      const todo = fila.ver && fila.crear && fila.editar && fila.eliminar
                      return (
                        <tr key={fila.idPermiso} className="border-b border-border last:border-0 hover:bg-accent/5">
                          <th scope="row" className="px-5 py-3 font-body text-sm font-semibold text-text">{nombre}</th>
                          {ACCIONES.map((a) => (
                            <td key={a.clave} className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer accent-[var(--color-accent)] disabled:cursor-not-allowed"
                                checked={fila[a.clave]}
                                disabled={!matriz.editable || guardando}
                                onChange={(e) => marcar(fila.idPermiso, a.clave, e.target.checked)}
                                aria-label={tr("{privilegio} en {modulo}", { privilegio: tr(a.etiqueta), modulo: nombre })}
                              />
                            </td>
                          ))}
                          {matriz.editable && (
                            <td className="px-3 py-3 text-center">
                              <input
                                type="checkbox"
                                className="h-4 w-4 cursor-pointer accent-[var(--color-accent)]"
                                checked={todo}
                                disabled={guardando}
                                onChange={(e) => marcarFila(fila.idPermiso, e.target.checked)}
                                aria-label={tr("Todos los privilegios en {modulo}", { modulo: nombre })}
                              />
                            </td>
                          )}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <p className="border-t border-border px-5 py-3 font-body text-xs text-text-muted">
                {tr(superadmin
                  ? "Superadministrador: crea roles y ajusta todos los privilegios. Los roles se asignan en Seguridad > Usuarios."
                  : "Administrador de sede: ajusta privilegios de roles existentes; solo el superadministrador crea roles. Los roles se asignan en Seguridad > Usuarios.")}
              </p>
            </>
          ) : null}
        </div>
      </div>
      <ConfirmDialog
        open={Boolean(cambioEstado)}
        title={tr(cambioEstado?.idEstado === 1 ? "Inactivar rol" : "Activar rol")}
        message={
          cambioEstado
            ? tr(cambioEstado.idEstado === 1
                ? "Las cuentas con el rol {rol} pierden sus privilegios hasta que se active de nuevo."
                : "Las cuentas con el rol {rol} recuperan sus privilegios.", { rol: cambioEstado.nombre })
            : ""
        }
        confirmLabel={tr(cambioEstado?.idEstado === 1 ? "Inactivar" : "Activar")}
        tone={cambioEstado?.idEstado === 1 ? "peligro" : "normal"}
        loading={guardando}
        onConfirm={confirmarEstado}
        onClose={() => setCambioEstado(null)}
      />
    </section>
  )
}
