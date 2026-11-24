import { Fragment, useCallback, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import Paginacion from "@/compartido/ui/Paginacion"
import StatusBadge from "@/compartido/ui/StatusBadge"
import { erroresDeCampo, mensajeError, recursoApi } from "@/compartido/api/recursos"
import type { ErrorApi } from "@/nucleo/http/clienteHttp"

/* ─── Tipos que describe cada módulo ─── */

export type Valores = Record<string, string | string[]>

export interface Opcion {
  valor: string
  etiqueta: string
  // Datos extra para validar (p. ej. la capacidad de un aula)
  extra?: Record<string, unknown>
}

export interface CampoFormulario {
  clave: string
  etiqueta: string
  tipo?: "texto" | "numero" | "fecha" | "email" | "tel" | "area" | "seleccion" | "multiple"
  requerido?: boolean
  ayuda?: string
  min?: number
  max?: number
  ancho?: "mitad" | "completo"
  seccion?: string
  // Nombre de la fuente de opciones (selección y selección múltiple)
  fuente?: string
  // Campo del que dependen las opciones (se recargan al cambiarlo)
  dependeDe?: string
  placeholder?: string
}

export interface ColumnaTabla<T> {
  clave: string
  etiqueta: string
  render?: (fila: T) => ReactNode
  alinear?: "derecha"
}

export interface FiltroLista {
  // Nombre del parámetro de la API (sede, nivel, estilo…)
  clave: string
  etiqueta: string
  fuente: string
}

export type CargadorOpciones = (valores: Valores) => Promise<Opcion[]>

export interface DefinicionRecurso<T> {
  id: string
  titulo: string
  singular: string
  // Para los mensajes: "La sede se creó" / "El nivel se creó"
  genero: "f" | "m"
  grupo: string
  descripcion: string
  ruta: string
  idClave: keyof T & string
  nombreFila: (fila: T) => string
  columnas: ColumnaTabla<T>[]
  campos: CampoFormulario[]
  filtros?: FiltroLista[]
  // Activo / Inactivo con PATCH /estado
  conEstado?: boolean
  // Borrado físico (solo catálogos sin estado)
  eliminable?: boolean
  buscarPlaceholder?: string
  fuentes?: Record<string, CargadorOpciones>
  valoresIniciales?: Valores
  aFormulario: (fila: T) => Valores
  aSolicitud: (valores: Valores, modo: "crear" | "editar") => Record<string, unknown>
  validar?: (valores: Valores, opciones: Record<string, Opcion[]>) => Record<string, string>
  // Advertencia (no bloquea) antes de inactivar
  avisoInactivar?: (fila: T) => string | undefined
  // Bloquea el borrado con un motivo
  bloqueoEliminar?: (fila: T) => string | undefined
  // Con sede fija, el campo idSede sigue visible al editar (traslado de estudiante)
  permiteCambiarSede?: boolean
}

/*
 * Cuenta de administrador de una sede: el backend ya limita todo a su sede, así que
 * el filtro y la columna de sede sobran y el formulario usa su sede sin preguntarla.
 */
export function conSedeFija<T>(
  definicion: DefinicionRecurso<T>,
  sedeFija: number | null | undefined,
  modo?: "crear" | "editar",
): DefinicionRecurso<T> {
  if (!sedeFija) return definicion
  const mostrarSede = modo === "editar" && definicion.permiteCambiarSede
  return {
    ...definicion,
    filtros: definicion.filtros?.filter((f) => f.clave !== "sede"),
    columnas: definicion.columnas.filter((c) => c.clave !== "sede"),
    campos: mostrarSede ? definicion.campos : definicion.campos.filter((c) => c.clave !== "idSede"),
    valoresIniciales: { ...(definicion.valoresIniciales ?? {}), idSede: String(sedeFija) },
  }
}

interface FilaBase {
  idEstado?: number
  estado?: string
}

/* ─── Contexto por pantalla: se conserva al cambiar de módulo ─── */

interface ContextoLista {
  pagina: number
  tamano: number
  buscar: string
  estado: string
  filtros: Record<string, string>
}

const contextos = new Map<string, ContextoLista>()
const contextoInicial: ContextoLista = { pagina: 1, tamano: 10, buscar: "", estado: "", filtros: {} }

const ESTADO_ACTIVO = 1
const ESTADO_INACTIVO = 2

/* ─── Iconos (Heroicons outline, trazo 1.5 como en la landing) ─── */

const rutasIcono = {
  buscar: "M21 21l-5.2-5.2m0 0A7.5 7.5 0 105.2 5.2a7.5 7.5 0 0010.6 10.6z",
  mas: "M12 4.5v15m7.5-7.5h-15",
  editar: "M16.86 4.49l1.69-1.69a1.88 1.88 0 112.65 2.65L10.58 16.07a4.5 4.5 0 01-1.9 1.13L6 18l.8-2.69a4.5 4.5 0 011.13-1.9l8.93-8.92z",
  apagar: "M5.64 6.36a9 9 0 1012.73 0M12 3v9",
  encender: "M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  eliminar: "M14.74 9l-.35 9m-4.78 0L9.26 9m9.97-3.21L18.16 19.67A2.25 2.25 0 0115.92 21.75H8.08a2.25 2.25 0 01-2.24-2.08L4.77 5.79m14.46 0a48 48 0 00-3.48-.4m-12 .56c.34-.06.68-.11 1.02-.17m0 0a48 48 0 013.48-.4m7.5 0v-.92c0-1.18-.91-2.16-2.09-2.2a51.96 51.96 0 00-3.32 0c-1.18.04-2.09 1.02-2.09 2.2v.92m7.5 0a48.67 48.67 0 00-7.5 0",
  cerrar: "M6 18L18 6M6 6l12 12",
  alerta: "M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.01",
  vacio: "M20.25 7.5l-.63 10.63a2.25 2.25 0 01-2.24 2.12H6.62a2.25 2.25 0 01-2.24-2.12L3.75 7.5M10 11.25h4M3.38 7.5h17.25c.62 0 1.12-.5 1.12-1.12v-1.5c0-.63-.5-1.13-1.12-1.13H3.38c-.63 0-1.13.5-1.13 1.13v1.5c0 .62.5 1.12 1.13 1.12z",
  check: "M4.5 12.75l6 6 9-13.5",
  ojo: "M2.04 12.32a1 1 0 010-.64C3.42 7.51 7.36 4.5 12 4.5c4.64 0 8.57 3.01 9.96 7.18.07.21.07.43 0 .64C20.58 16.49 16.64 19.5 12 19.5c-4.64 0-8.57-3.01-9.96-7.18zM15 12a3 3 0 11-6 0 3 3 0 016 0z",
  recargar: "M16.02 9.35h4.99V4.36M2.99 19.64v-4.99h4.99m-4.99 0l3.18 3.18a8.25 8.25 0 0013.8-3.7M4.03 9.35a8.25 8.25 0 0113.8-3.7l3.18 3.18",
}

export function Icono({ nombre, clase = "h-4 w-4" }: { nombre: keyof typeof rutasIcono; clase?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className={clase} aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" d={rutasIcono[nombre]} />
    </svg>
  )
}

export const claseEntrada =
  "w-full rounded-xl border border-border bg-surface-alt px-3.5 py-2.5 font-body text-sm text-text outline-none transition-colors placeholder:text-text-muted focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-0 disabled:opacity-60"
export const claseBotonPrincipal =
  "inline-flex items-center justify-center gap-2 rounded-full bg-accent px-5 py-2.5 font-condensed text-sm font-bold uppercase tracking-wider text-on-accent transition-all duration-300 hover:-translate-y-0.5 hover:bg-accent-strong active:translate-y-0 disabled:pointer-events-none disabled:opacity-50"
export const claseBotonSecundario =
  "inline-flex items-center justify-center gap-2 rounded-full border border-border px-5 py-2.5 font-condensed text-sm font-semibold uppercase tracking-wider text-text-soft transition-colors hover:border-accent hover:text-text disabled:opacity-50"
export const claseBotonIcono =
  "grid h-9 w-9 place-items-center rounded-full text-text-muted transition-colors"
export const hoverNeutro = "hover:bg-accent/10 hover:text-accent"
export const hoverPeligro = "hover:bg-red-500/10 hover:text-red-500"
const hoverExito = "hover:bg-emerald-500/10 hover:text-emerald-500"

const comoTexto = (valor: string | string[] | undefined) => (Array.isArray(valor) ? valor.join(",") : (valor ?? ""))

/* ─── Formulario (diálogo modal) ─── */

interface ErrorGuardado {
  general: string
  campos: Record<string, string>
}

interface FormularioProps<T> {
  definicion: DefinicionRecurso<T>
  modo: "crear" | "editar"
  valoresIniciales: Valores
  opcionesBase: Record<string, Opcion[]>
  onGuardar: (valores: Valores) => Promise<ErrorGuardado | null>
  onCerrar: () => void
}

function FormularioRecurso<T>({ definicion, modo, valoresIniciales, opcionesBase, onGuardar, onCerrar }: FormularioProps<T>) {
  const [valores, setValores] = useState<Valores>(valoresIniciales)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [opciones, setOpciones] = useState<Record<string, Opcion[]>>(opcionesBase)
  const [cargandoOpciones, setCargandoOpciones] = useState<Record<string, boolean>>({})
  const [guardando, setGuardando] = useState(false)
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const tituloId = useId()
  const dialogoRef = useRef<HTMLFormElement>(null)
  const guardandoRef = useRef(false)
  const cerrarRef = useRef(onCerrar)
  cerrarRef.current = onCerrar
  guardandoRef.current = guardando

  // Opciones que dependen de otro campo (aulas e instructores según la sede)
  const dependientes = definicion.campos.filter((c) => c.fuente && c.dependeDe)
  const llaveDependencias = dependientes.map((c) => comoTexto(valores[c.dependeDe!])).join("|")

  useEffect(() => {
    dependientes.forEach((campo) => {
      const padre = comoTexto(valores[campo.dependeDe!])
      const cargar = definicion.fuentes?.[campo.fuente!]
      if (!cargar) return
      if (!padre) {
        setOpciones((prev) => ({ ...prev, [campo.fuente!]: [] }))
        return
      }
      setCargandoOpciones((prev) => ({ ...prev, [campo.clave]: true }))
      cargar(valores)
        .then((lista) => setOpciones((prev) => ({ ...prev, [campo.fuente!]: lista })))
        .catch(() => setOpciones((prev) => ({ ...prev, [campo.fuente!]: [] })))
        .finally(() => setCargandoOpciones((prev) => ({ ...prev, [campo.clave]: false })))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llaveDependencias])

  // Foco inicial, Escape para cerrar y foco atrapado dentro del diálogo
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null
    const dialogo = dialogoRef.current
    dialogo?.querySelector<HTMLElement>("input, select, textarea")?.focus()
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === "Escape" && !guardandoRef.current) cerrarRef.current()
      if (evento.key !== "Tab" || !dialogo) return
      const enfocables = Array.from(
        dialogo.querySelectorAll<HTMLElement>("button, input, select, textarea, [href]"),
      ).filter((el) => !el.hasAttribute("disabled"))
      if (!enfocables.length) return
      const primero = enfocables[0]
      const ultimo = enfocables[enfocables.length - 1]
      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault()
        ultimo.focus()
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault()
        primero.focus()
      }
    }
    document.addEventListener("keydown", alTeclear)
    return () => {
      document.removeEventListener("keydown", alTeclear)
      anterior?.focus?.()
    }
  }, [])

  const cambiar = (clave: string, valor: string | string[]) => {
    setValores((prev) => {
      const siguiente = { ...prev, [clave]: valor }
      // Al cambiar el campo padre se limpian sus dependientes
      definicion.campos
        .filter((c) => c.dependeDe === clave)
        .forEach((c) => {
          siguiente[c.clave] = c.tipo === "multiple" ? [] : ""
        })
      return siguiente
    })
    setErrores((prev) => ({ ...prev, [clave]: "" }))
  }

  const validar = () => {
    const encontrados: Record<string, string> = {}
    definicion.campos.forEach((campo) => {
      const valor = valores[campo.clave]
      const vacio = Array.isArray(valor) ? valor.length === 0 : !String(valor ?? "").trim()
      if (campo.requerido && vacio) {
        encontrados[campo.clave] = campo.tipo === "multiple" ? "Selecciona al menos una opción." : "Este campo es obligatorio."
        return
      }
      if (vacio || Array.isArray(valor)) return
      const texto = String(valor).trim()
      if (campo.tipo === "numero") {
        const numero = Number(texto)
        if (Number.isNaN(numero)) encontrados[campo.clave] = "Escribe un número válido."
        else if (campo.min !== undefined && numero < campo.min) encontrados[campo.clave] = `El valor mínimo es ${campo.min}.`
        else if (campo.max !== undefined && numero > campo.max) encontrados[campo.clave] = `El valor máximo es ${campo.max}.`
      } else if (campo.max !== undefined && texto.length > campo.max) {
        encontrados[campo.clave] = `Máximo ${campo.max} caracteres.`
      } else if (campo.min !== undefined && texto.length < campo.min) {
        encontrados[campo.clave] = `Escribe al menos ${campo.min} caracteres.`
      }
      if (campo.tipo === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(texto)) {
        encontrados[campo.clave] = "Escribe un correo válido."
      }
    })
    Object.assign(encontrados, Object.fromEntries(
      Object.entries(definicion.validar?.(valores, opciones) ?? {}).filter(([clave]) => !encontrados[clave]),
    ))
    setErrores(encontrados)
    return encontrados
  }

  const enviar = async (evento: React.FormEvent) => {
    evento.preventDefault()
    setErrorGeneral(null)
    const encontrados = validar()
    const primero = Object.keys(encontrados).find((clave) => encontrados[clave])
    if (primero) {
      dialogoRef.current?.querySelector<HTMLElement>(`[name="${primero}"]`)?.focus()
      return
    }
    setGuardando(true)
    try {
      const resultado = await onGuardar(valores)
      if (resultado) {
        setErrores(resultado.campos)
        setErrorGeneral(resultado.general)
      }
    } finally {
      setGuardando(false)
    }
  }

  const titulo = `${modo === "crear" ? "Crear" : "Editar"} ${definicion.singular}`
  let seccionAnterior = ""

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4 animar-fondo"
      onMouseDown={(e) => e.target === e.currentTarget && !guardando && onCerrar()}
    >
      <form
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        noValidate
        onSubmit={enviar}
        className="flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-border bg-surface shadow-2xl sm:rounded-3xl animar-entrada"
      >
        <header className="flex items-start justify-between gap-4 border-b border-border px-6 py-5">
          <div>
            <p className="font-condensed text-xs font-semibold uppercase tracking-[0.2em] text-accent">{definicion.titulo}</p>
            <h2 id={tituloId} className="mt-1 font-display text-2xl uppercase leading-none text-text">{titulo}</h2>
          </div>
          <button type="button" onClick={onCerrar} disabled={guardando} className={`${claseBotonIcono} ${hoverNeutro}`} aria-label="Cerrar formulario">
            <Icono nombre="cerrar" clase="h-5 w-5" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {errorGeneral && (
            <p role="alert" className="mb-4 flex gap-2 rounded-xl border border-red-400/30 bg-red-400/10 p-3 font-body text-sm text-red-600 dark:text-red-300">
              <Icono nombre="alerta" clase="h-5 w-5 shrink-0" />
              {errorGeneral}
            </p>
          )}
          <p className="mb-4 font-body text-xs text-text-muted">
            Los campos con <span className="text-red-500" aria-hidden="true">*</span>
            <span className="sr-only">asterisco</span> son obligatorios.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            {definicion.campos.map((campo) => {
              const id = `${definicion.id}-${campo.clave}`
              const error = errores[campo.clave]
              const idAyuda = `${id}-ayuda`
              const idError = `${id}-error`
              const describe = [campo.ayuda ? idAyuda : "", error ? idError : ""].filter(Boolean).join(" ") || undefined
              const lista = campo.fuente ? opciones[campo.fuente] ?? [] : []
              const valor = valores[campo.clave]
              const cargandoLista = cargandoOpciones[campo.clave]
              const sinPadre = campo.dependeDe && !comoTexto(valores[campo.dependeDe])
              const nuevaSeccion = campo.seccion && campo.seccion !== seccionAnterior
              if (campo.seccion) seccionAnterior = campo.seccion
              const comunes = {
                id,
                name: campo.clave,
                "aria-invalid": error ? true : undefined,
                "aria-describedby": describe,
                "aria-required": campo.requerido || undefined,
                disabled: guardando,
              }

              let control: ReactNode
              if (campo.tipo === "multiple") {
                const seleccion = Array.isArray(valor) ? valor : []
                control = (
                  <fieldset aria-describedby={describe} aria-invalid={error ? true : undefined} className="flex flex-wrap gap-2">
                    <legend className="sr-only">{campo.etiqueta}</legend>
                    {lista.length === 0 && <span className="font-body text-sm text-text-muted">{cargandoLista ? "Cargando…" : "No hay opciones activas."}</span>}
                    {lista.map((opcion) => {
                      const marcado = seleccion.includes(opcion.valor)
                      return (
                        <label
                          key={opcion.valor}
                          className={`flex cursor-pointer items-center gap-2 rounded-full border px-3.5 py-2 font-body text-sm transition-colors focus-within:outline-2 focus-within:outline-accent ${marcado ? "border-accent bg-accent/10 text-text" : "border-border text-text-soft hover:border-accent/50"}`}
                        >
                          <input
                            type="checkbox"
                            name={campo.clave}
                            className="h-4 w-4 accent-[var(--color-accent)]"
                            checked={marcado}
                            disabled={guardando}
                            onChange={() =>
                              cambiar(campo.clave, marcado ? seleccion.filter((v) => v !== opcion.valor) : [...seleccion, opcion.valor])
                            }
                          />
                          {opcion.etiqueta}
                        </label>
                      )
                    })}
                  </fieldset>
                )
              } else if (campo.tipo === "seleccion") {
                control = (
                  <select
                    {...comunes}
                    disabled={guardando || Boolean(sinPadre) || cargandoLista}
                    value={comoTexto(valor)}
                    onChange={(e) => cambiar(campo.clave, e.target.value)}
                    className={`${claseEntrada} cursor-pointer`}
                  >
                    <option value="">
                      {sinPadre
                        ? `Primero elige ${definicion.campos.find((c) => c.clave === campo.dependeDe)?.etiqueta.toLowerCase()}`
                        : cargandoLista
                          ? "Cargando opciones…"
                          : lista.length
                            ? "Selecciona una opción"
                            : "No hay opciones disponibles"}
                    </option>
                    {lista.map((opcion) => (
                      <option key={opcion.valor} value={opcion.valor}>{opcion.etiqueta}</option>
                    ))}
                  </select>
                )
              } else if (campo.tipo === "area") {
                control = (
                  <textarea
                    {...comunes}
                    rows={3}
                    maxLength={campo.max}
                    placeholder={campo.placeholder}
                    value={comoTexto(valor)}
                    onChange={(e) => cambiar(campo.clave, e.target.value)}
                    className={`${claseEntrada} resize-y`}
                  />
                )
              } else {
                const tipos = { texto: "text", numero: "number", fecha: "date", email: "email", tel: "tel" } as const
                control = (
                  <input
                    {...comunes}
                    type={tipos[(campo.tipo ?? "texto") as keyof typeof tipos]}
                    inputMode={campo.tipo === "numero" ? "numeric" : campo.tipo === "tel" ? "tel" : undefined}
                    min={campo.tipo === "numero" ? campo.min : undefined}
                    max={campo.tipo === "numero" ? campo.max : undefined}
                    maxLength={campo.tipo !== "numero" ? campo.max : undefined}
                    placeholder={campo.placeholder}
                    autoComplete="off"
                    value={comoTexto(valor)}
                    onChange={(e) => cambiar(campo.clave, e.target.value)}
                    className={claseEntrada}
                  />
                )
              }

              return (
                <Fragment key={campo.clave}>
                  {nuevaSeccion && (
                    <p className="mt-1 border-b border-border pb-2 font-condensed text-xs font-bold uppercase tracking-[0.2em] text-accent sm:col-span-2">
                      {campo.seccion}
                    </p>
                  )}
                <div className={campo.ancho === "mitad" ? "" : "sm:col-span-2"}>
                  <label htmlFor={campo.tipo === "multiple" ? undefined : id} className="mb-1.5 block font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
                    {campo.etiqueta}
                    {campo.requerido && <span className="ml-0.5 text-red-500" aria-hidden="true">*</span>}
                  </label>
                  {control}
                  {campo.ayuda && <p id={idAyuda} className="mt-1 font-body text-xs text-text-muted">{campo.ayuda}</p>}
                  {error && <p id={idError} className="mt-1 font-body text-xs font-medium text-red-600 dark:text-red-300">{error}</p>}
                </div>
                </Fragment>
              )
            })}
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t border-border px-6 py-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onCerrar} disabled={guardando} className={claseBotonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando} aria-busy={guardando} className={claseBotonPrincipal}>
            {guardando && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
            {guardando ? "Guardando…" : modo === "crear" ? `Crear ${definicion.singular}` : "Guardar cambios"}
          </button>
        </footer>
      </form>
    </div>
  )
}

/* ─── Pantalla ─── */

interface PantallaRecursoProps<T> {
  definicion: DefinicionRecurso<T>
  // Abre el formulario de creación al entrar (acciones rápidas del Dashboard)
  abrirCrear?: boolean
  onCrearAbierto?: () => void
  // Sede de la cuenta (administrador de sede); null = sin restricción
  sedeFija?: number | null
  // Reemplaza el formulario genérico de creación (inscripción del estudiante)
  alCrear?: () => void
  // Botones adicionales por fila (por ejemplo, ver la ficha)
  accionesFila?: (fila: T) => ReactNode
  // Cambia el valor para volver a cargar la lista desde afuera
  recargar?: number
  // false oculta "Nuevo" (por ejemplo, sedes para un administrador de sede)
  permiteCrear?: boolean
  // false oculta editar, inactivar y eliminar en esa fila (registros de otra sede)
  puedeGestionar?: (fila: T) => boolean
}

type Accion<T> = { tipo: "estado" | "eliminar"; fila: T } | null

export default function PantallaRecurso<T extends FilaBase>({
  definicion: definicionBase,
  abrirCrear,
  onCrearAbierto,
  sedeFija,
  alCrear,
  accionesFila,
  recargar,
  permiteCrear = true,
  puedeGestionar,
}: PantallaRecursoProps<T>) {
  const definicion = useMemo(() => conSedeFija(definicionBase, sedeFija), [definicionBase, sedeFija])
  const [contexto, setContexto] = useState<ContextoLista>(() => contextos.get(definicion.id) ?? contextoInicial)
  const [busqueda, setBusqueda] = useState(contexto.buscar)
  const [filas, setFilas] = useState<T[]>([])
  const [total, setTotal] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<{ mensaje: string; sinPermiso: boolean } | null>(null)
  const [opcionesFiltro, setOpcionesFiltro] = useState<Record<string, Opcion[]>>({})
  const [formulario, setFormulario] = useState<{ modo: "crear" | "editar"; fila: T | null } | null>(null)
  const [accion, setAccion] = useState<Accion<T>>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState<string | undefined>()
  const [aviso, setAviso] = useState<string | null>(null)
  const peticion = useRef(0)

  // Guarda filtros y página para volver al mismo punto
  useEffect(() => {
    contextos.set(definicion.id, contexto)
  }, [contexto, definicion.id])

  const actualizar = (cambios: Partial<ContextoLista>) =>
    setContexto((prev) => ({ ...prev, pagina: 1, ...cambios }))

  // Búsqueda con espera corta para no consultar en cada tecla
  useEffect(() => {
    if (busqueda === contexto.buscar) return
    const espera = window.setTimeout(() => actualizar({ buscar: busqueda }), 350)
    return () => window.clearTimeout(espera)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda])

  const cargar = useCallback(async () => {
    const numero = ++peticion.current
    setCargando(true)
    setError(null)
    try {
      const respuesta = await recursoApi.listar<T>(definicion.ruta, {
        pagina: contexto.pagina,
        tamano: contexto.tamano,
        buscar: contexto.buscar,
        estado: definicion.conEstado ? contexto.estado : undefined,
        ...contexto.filtros,
        // Con sede fija no se envía un filtro de sede guardado de otra sesión
        ...(sedeFija ? { sede: undefined } : {}),
      })
      if (numero !== peticion.current) return
      // Si se borró el último registro de la página, vuelve a la anterior
      if (respuesta.datos.length === 0 && respuesta.total > 0 && contexto.pagina > 1) {
        setContexto((prev) => ({ ...prev, pagina: Math.max(1, Math.ceil(respuesta.total / prev.tamano)) }))
        return
      }
      setFilas(respuesta.datos)
      setTotal(respuesta.total)
    } catch (e) {
      if (numero !== peticion.current) return
      const codigo = (e as ErrorApi)?.codigo
      setError({ mensaje: mensajeError(e), sinPermiso: codigo === "no_autorizado" })
    } finally {
      if (numero === peticion.current) setCargando(false)
    }
  }, [contexto, definicion, sedeFija])

  useEffect(() => {
    cargar()
  }, [cargar, recargar])

  // Opciones de los filtros y de los campos sin dependencia (una vez)
  // Se usa la definición completa: con sede fija, el campo sede solo aparece al editar
  const fuentesBase = useMemo(() => {
    const nombres = new Set<string>()
    definicionBase.filtros?.forEach((f) => nombres.add(f.fuente))
    definicionBase.campos.forEach((c) => c.fuente && !c.dependeDe && nombres.add(c.fuente))
    return [...nombres]
  }, [definicionBase])

  const cargarFuentes = useCallback(() => {
    fuentesBase.forEach((nombre) => {
      definicion.fuentes?.[nombre]?.({})
        .then((lista) => setOpcionesFiltro((prev) => ({ ...prev, [nombre]: lista })))
        .catch(() => setOpcionesFiltro((prev) => ({ ...prev, [nombre]: prev[nombre] ?? [] })))
    })
  }, [definicion, fuentesBase])

  useEffect(() => {
    cargarFuentes()
  }, [cargarFuentes])

  const abrirNuevo = useCallback(() => {
    if (!permiteCrear) return
    if (alCrear) alCrear()
    else setFormulario({ modo: "crear", fila: null })
  }, [alCrear, permiteCrear])

  useEffect(() => {
    if (!abrirCrear) return
    abrirNuevo()
    onCrearAbierto?.()
  }, [abrirCrear, onCrearAbierto, abrirNuevo])

  useEffect(() => {
    if (!aviso) return
    const espera = window.setTimeout(() => setAviso(null), 4500)
    return () => window.clearTimeout(espera)
  }, [aviso])

  const articulo = definicion.genero === "f" ? "La" : "El"
  const nombreDe = (fila: T) => definicion.nombreFila(fila)

  const guardar = async (valores: Valores): Promise<ErrorGuardado | null> => {
    const modo = formulario?.modo ?? "crear"
    try {
      const cuerpo = definicion.aSolicitud(valores, modo)
      if (modo === "crear") {
        await recursoApi.crear(definicion.ruta, cuerpo)
      } else if (formulario?.fila) {
        await recursoApi.actualizar(definicion.ruta, Number(formulario.fila[definicion.idClave]), cuerpo)
      }
      setFormulario(null)
      setAviso(`${articulo} ${definicion.singular} se ${modo === "crear" ? "creó" : "actualizó"} correctamente.`)
      // Los catálogos nuevos aparecen en los filtros y formularios
      cargarFuentes()
      await cargar()
      return null
    } catch (e) {
      const campos = erroresDeCampo(e)
      return {
        general: Object.keys(campos).length ? "Revisa los campos marcados." : mensajeError(e),
        campos,
      }
    }
  }

  const confirmarAccion = async () => {
    if (!accion) return
    setProcesando(true)
    setErrorAccion(undefined)
    const id = Number(accion.fila[definicion.idClave])
    try {
      if (accion.tipo === "eliminar") {
        await recursoApi.eliminar(definicion.ruta, id)
        setAviso(`${articulo} ${definicion.singular} se eliminó.`)
      } else {
        const activar = accion.fila.idEstado !== ESTADO_ACTIVO
        await recursoApi.cambiarEstado(definicion.ruta, id, activar ? ESTADO_ACTIVO : ESTADO_INACTIVO)
        setAviso(`${articulo} ${definicion.singular} quedó ${activar ? (definicion.genero === "f" ? "activa" : "activo") : definicion.genero === "f" ? "inactiva" : "inactivo"}.`)
      }
      setAccion(null)
      cargarFuentes()
      await cargar()
    } catch (e) {
      setErrorAccion(mensajeError(e))
    } finally {
      setProcesando(false)
    }
  }

  const filtrosActivos =
    Object.values(contexto.filtros).filter(Boolean).length + (contexto.estado ? 1 : 0) + (contexto.buscar ? 1 : 0)
  const limpiarFiltros = () => {
    setBusqueda("")
    actualizar({ buscar: "", estado: "", filtros: {} })
  }
  const totalPaginas = Math.max(1, Math.ceil(total / contexto.tamano))

  const acciones = (fila: T) => {
    const activo = fila.idEstado === ESTADO_ACTIVO
    const nombre = nombreDe(fila)
    if (puedeGestionar && !puedeGestionar(fila)) {
      return <div className="flex items-center justify-end gap-1">{accionesFila?.(fila)}</div>
    }
    return (
      <div className="flex items-center justify-end gap-1">
        {accionesFila?.(fila)}
        <button type="button" className={`${claseBotonIcono} ${hoverNeutro}`} onClick={() => setFormulario({ modo: "editar", fila })} aria-label={`Editar ${nombre}`} title="Editar">
          <Icono nombre="editar" />
        </button>
        {definicion.conEstado && (
          <button
            type="button"
            className={`${claseBotonIcono} ${activo ? hoverPeligro : hoverExito}`}
            onClick={() => {
              setErrorAccion(undefined)
              setAccion({ tipo: "estado", fila })
            }}
            aria-label={`${activo ? "Inactivar" : "Activar"} ${nombre}`}
            title={activo ? "Inactivar" : "Activar"}
          >
            <Icono nombre={activo ? "apagar" : "encender"} />
          </button>
        )}
        {definicion.eliminable && (
          <button
            type="button"
            className={`${claseBotonIcono} ${hoverPeligro}`}
            onClick={() => {
              setErrorAccion(undefined)
              setAccion({ tipo: "eliminar", fila })
            }}
            aria-label={`Eliminar ${nombre}`}
            title="Eliminar"
          >
            <Icono nombre="eliminar" />
          </button>
        )}
      </div>
    )
  }

  const textoAccion = () => {
    if (!accion) return { titulo: "", mensaje: "", boton: "", bloqueo: undefined as string | undefined, peligro: false }
    const nombre = nombreDe(accion.fila)
    if (accion.tipo === "eliminar") {
      return {
        titulo: `Eliminar ${definicion.singular}`,
        mensaje: `Se eliminará “${nombre}” de forma permanente. Esta acción no se puede deshacer.`,
        boton: "Eliminar",
        bloqueo: definicion.bloqueoEliminar?.(accion.fila) ?? errorAccion,
        peligro: true,
      }
    }
    const activo = accion.fila.idEstado === ESTADO_ACTIVO
    const advertencia = activo ? definicion.avisoInactivar?.(accion.fila) : undefined
    return {
      titulo: `${activo ? "Inactivar" : "Activar"} ${definicion.singular}`,
      mensaje: activo
        ? `“${nombre}” dejará de aparecer en las listas de selección. El registro y su historial se conservan y puedes activarlo de nuevo.${advertencia ? ` ${advertencia}` : ""}`
        : `“${nombre}” volverá a estar disponible en las listas de selección.`,
      boton: activo ? "Inactivar" : "Activar",
      bloqueo: errorAccion,
      peligro: activo,
    }
  }
  const datosAccion = textoAccion()

  const controlFiltro = "rounded-xl border border-border bg-surface-alt px-3 py-2.5 font-body text-sm text-text outline-none transition-colors focus:border-accent cursor-pointer"

  return (
    <section aria-labelledby={`${definicion.id}-titulo`} className="flex flex-col gap-6">
      {/* Avisos de éxito, anunciados a lectores de pantalla */}
      <div aria-live="polite" className="pointer-events-none fixed inset-x-4 top-4 z-[70] flex justify-end sm:inset-x-auto sm:right-6">
        {aviso && (
          <p role="status" className="pointer-events-auto flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-surface px-5 py-4 font-body text-sm font-semibold text-emerald-700 shadow-2xl shadow-black/20 dark:text-emerald-300 animar-entrada">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-emerald-500/15"><Icono nombre="check" /></span>
            {aviso}
            <button type="button" onClick={() => setAviso(null)} className="ml-1 text-text-muted hover:text-text" aria-label="Cerrar aviso">
              <Icono nombre="cerrar" />
            </button>
          </p>
        )}
      </div>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="font-condensed text-xs font-semibold uppercase tracking-[0.25em] text-accent">{definicion.grupo}</p>
          <h1 id={`${definicion.id}-titulo`} className="display mt-2 text-4xl text-text sm:text-5xl">{definicion.titulo}</h1>
          <p className="mt-2 font-body text-sm text-text-soft">{definicion.descripcion}</p>
        </div>
        {permiteCrear && (
          <button type="button" onClick={abrirNuevo} className={claseBotonPrincipal}>
            <Icono nombre="mas" />
            {definicion.genero === "f" ? "Nueva" : "Nuevo"} {definicion.singular}
          </button>
        )}
      </header>

      {/* Búsqueda y filtros */}
      <div role="search" className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-3 md:flex-row md:flex-wrap md:items-center">
        <label className="relative min-w-0 flex-1 md:min-w-64">
          <span className="sr-only">Buscar {definicion.titulo.toLowerCase()}</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"><Icono nombre="buscar" /></span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={definicion.buscarPlaceholder ?? `Buscar ${definicion.titulo.toLowerCase()}…`}
            className={`${claseEntrada} pl-9`}
          />
        </label>
        {definicion.conEstado && (
          <label className="flex flex-col gap-1 md:w-48">
            <span className="sr-only">Estado</span>
            <select value={contexto.estado} onChange={(e) => actualizar({ estado: e.target.value })} className={controlFiltro} aria-label="Filtrar por estado">
              <option value="">Todos los estados</option>
              <option value={String(ESTADO_ACTIVO)}>Activos</option>
              <option value={String(ESTADO_INACTIVO)}>Inactivos</option>
            </select>
          </label>
        )}
        {definicion.filtros?.map((filtro) => (
          <label key={filtro.clave} className="md:w-48">
            <span className="sr-only">{filtro.etiqueta}</span>
            <select
              value={contexto.filtros[filtro.clave] ?? ""}
              onChange={(e) => actualizar({ filtros: { ...contexto.filtros, [filtro.clave]: e.target.value } })}
              className={`${controlFiltro} w-full`}
              aria-label={`Filtrar por ${filtro.etiqueta.toLowerCase()}`}
            >
              <option value="">{filtro.etiqueta}: todas</option>
              {(opcionesFiltro[filtro.fuente] ?? []).map((o) => (
                <option key={o.valor} value={o.valor}>{o.etiqueta}</option>
              ))}
            </select>
          </label>
        ))}
        {filtrosActivos > 0 && (
          <button type="button" onClick={limpiarFiltros} className="font-condensed text-sm font-semibold uppercase tracking-wider text-accent underline-offset-4 hover:underline">
            Limpiar filtros ({filtrosActivos})
          </button>
        )}
      </div>

      {/* Resultados */}
      <div className="overflow-hidden rounded-[20px] border border-border bg-surface" aria-busy={cargando}>
        {error ? (
          <div role="alert" className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-500"><Icono nombre="alerta" clase="h-6 w-6" /></span>
            <h2 className="font-display text-xl uppercase text-text">
              {error.sinPermiso ? "Sin permiso para este módulo" : "No se pudo cargar la información"}
            </h2>
            <p className="max-w-md font-body text-sm text-text-soft">{error.mensaje}</p>
            {!error.sinPermiso && (
              <button type="button" onClick={cargar} className={claseBotonSecundario}>
                <Icono nombre="recargar" /> Reintentar
              </button>
            )}
          </div>
        ) : cargando && filas.length === 0 ? (
          <div className="flex flex-col gap-3 p-5" aria-label="Cargando registros">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="esqueleto h-11 rounded-xl" />
            ))}
            <span className="sr-only">Cargando…</span>
          </div>
        ) : filas.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl border border-accent/20 bg-accent/10 text-accent"><Icono nombre="vacio" clase="h-6 w-6" /></span>
            <h2 className="font-display text-xl uppercase text-text">{filtrosActivos ? "Sin resultados" : `Aún no hay ${definicion.titulo.toLowerCase()}`}</h2>
            <p className="max-w-md font-body text-sm text-text-soft">
              {filtrosActivos ? "Ningún registro coincide con la búsqueda o los filtros." : `Crea ${definicion.genero === "f" ? "la primera" : "el primer"} ${definicion.singular} para empezar.`}
            </p>
            {filtrosActivos ? (
              <button type="button" onClick={limpiarFiltros} className={claseBotonSecundario}>Limpiar filtros</button>
            ) : (
              permiteCrear && (
                <button type="button" onClick={abrirNuevo} className={claseBotonPrincipal}>
                  <Icono nombre="mas" /> {definicion.genero === "f" ? "Nueva" : "Nuevo"} {definicion.singular}
                </button>
              )
            )}
          </div>
        ) : (
          <div className={`transition-opacity ${cargando ? "opacity-60" : ""}`}>
            {/* Tabla en pantallas medianas y grandes */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full border-collapse text-left">
                <caption className="sr-only">
                  {definicion.titulo}: {total} registro{total === 1 ? "" : "s"}, página {contexto.pagina} de {totalPaginas}
                </caption>
                <thead>
                  <tr className="border-b border-border bg-surface-alt/60">
                    {definicion.columnas.map((col) => (
                      <th key={col.clave} scope="col" className={`px-5 py-3 font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted ${col.alinear === "derecha" ? "text-right" : ""}`}>
                        {col.etiqueta}
                      </th>
                    ))}
                    {definicion.conEstado && <th scope="col" className="px-5 py-3 font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">Estado</th>}
                    <th scope="col" className="px-5 py-3 text-right font-condensed text-xs font-semibold uppercase tracking-wider text-text-muted">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filas.map((fila) => (
                    <tr key={String(fila[definicion.idClave])} className="border-b border-border last:border-0 transition-colors hover:bg-accent/5">
                      {definicion.columnas.map((col, i) => {
                        const contenido = col.render ? col.render(fila) : String((fila as Record<string, unknown>)[col.clave] ?? "—")
                        return i === 0 ? (
                          <th key={col.clave} scope="row" className="px-5 py-3.5 font-body text-sm font-semibold text-text">{contenido}</th>
                        ) : (
                          <td key={col.clave} className={`px-5 py-3.5 font-body text-sm text-text-soft ${col.alinear === "derecha" ? "text-right tabular-nums" : ""}`}>{contenido}</td>
                        )
                      })}
                      {definicion.conEstado && <td className="px-5 py-3.5"><StatusBadge status={fila.estado ?? "—"} /></td>}
                      <td className="px-5 py-2">{acciones(fila)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tarjetas en móvil */}
            <ul className="divide-y divide-border md:hidden">
              {filas.map((fila) => (
                <li key={String(fila[definicion.idClave])} className="flex flex-col gap-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-body text-sm font-semibold text-text">
                      {definicion.columnas[0].render ? definicion.columnas[0].render(fila) : String((fila as Record<string, unknown>)[definicion.columnas[0].clave] ?? "—")}
                    </p>
                    {definicion.conEstado && <StatusBadge status={fila.estado ?? "—"} />}
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
                    {definicion.columnas.slice(1).map((col) => (
                      <div key={col.clave} className="min-w-0">
                        <dt className="font-condensed text-[11px] uppercase tracking-wider text-text-muted">{col.etiqueta}</dt>
                        <dd className="truncate font-body text-sm text-text-soft">
                          {col.render ? col.render(fila) : String((fila as Record<string, unknown>)[col.clave] ?? "—")}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  {acciones(fila)}
                </li>
              ))}
            </ul>

            <Paginacion
              total={total}
              pagina={contexto.pagina}
              tamano={contexto.tamano}
              totalPaginas={totalPaginas}
              onPagina={(pagina) => setContexto((prev) => ({ ...prev, pagina }))}
              onTamano={(tamano) => actualizar({ tamano })}
              opciones={[10, 20, 50, 100]}
            />
          </div>
        )}
      </div>

      {formulario && (
        <FormularioRecurso
          definicion={conSedeFija(definicionBase, sedeFija, formulario.modo)}
          modo={formulario.modo}
          valoresIniciales={formulario.fila ? definicion.aFormulario(formulario.fila) : { ...(definicion.valoresIniciales ?? {}) }}
          opcionesBase={opcionesFiltro}
          onGuardar={guardar}
          onCerrar={() => setFormulario(null)}
        />
      )}

      <ConfirmDialog
        open={Boolean(accion)}
        title={datosAccion.titulo}
        message={datosAccion.mensaje}
        confirmLabel={datosAccion.boton}
        blockedMessage={datosAccion.bloqueo}
        tone={datosAccion.peligro ? "peligro" : "normal"}
        loading={procesando}
        onConfirm={confirmarAccion}
        onClose={() => setAccion(null)}
      />
    </section>
  )
}
