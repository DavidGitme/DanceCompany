import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Opcion } from "@/compartido/ui/PantallaRecurso"
import { claseBotonPrincipal, claseBotonSecundario, claseEntrada } from "@/compartido/ui/PantallaRecurso"
import { erroresDeCampo, mensajeError } from "@/compartido/api/recursos"
import {
  Campo,
  Dialogo,
  InscripcionEstudiante,
  MensajeError,
  Seccion,
  edadEn,
  textoValorMatricula,
  type InscripcionRespuestaDto,
} from "@/modulos/estudiantes"
import {
  MATRICULA_ACTIVA,
  cuposLibres,
  type EstudianteParaMatriculaDto,
  type GrupoParaMatriculaDto,
  type RequisitoMatriculaDto,
} from "../dtos/matriculaDto"
import { matriculaServicio } from "../servicios/matriculaServicio"

/*
 * «Nueva matrícula». Primero se matricula: con «Estudiante nuevo» se registra a la persona
 * junto con su matrícula (POST /inscripciones) y así aparece en Estudiantes. Con «Ya está
 * registrado» se matricula a un estudiante existente (cambio de grupo o nuevo ciclo).
 * En los dos casos la matrícula queda pendiente hasta cumplir los requisitos.
 */

type Modo = "nuevo" | "registrado"

interface Props {
  sedeFija: number | null
  nombreSede?: string | null
  cargarCatalogo: (ruta: string) => Promise<Opcion[]>
  onCerrar: () => void
  onCreada: (mensaje: string) => void
}

const DIAS_MARGEN = 366

// Fecha local de hoy en formato AAAA-MM-DD
const hoyIso = () => {
  const hoy = new Date()
  return new Date(hoy.getTime() - hoy.getTimezoneOffset() * 60000).toISOString().slice(0, 10)
}

function SelectorModo({ modo, onCambiar, deshabilitado }: { modo: Modo; onCambiar: (m: Modo) => void; deshabilitado?: boolean }) {
  const opciones: [Modo, string][] = [
    ["nuevo", "Estudiante nuevo"],
    ["registrado", "Ya está registrado"],
  ]
  return (
    <div role="radiogroup" aria-label={tr("¿A quién vas a matricular?")} className="mb-5 grid grid-cols-2 gap-1 rounded-full border border-border bg-surface-alt p-1">
      {opciones.map(([valor, etiqueta]) => {
        const activo = modo === valor
        return (
          <button
            key={valor}
            type="button"
            role="radio"
            aria-checked={activo}
            disabled={deshabilitado}
            onClick={() => onCambiar(valor)}
            className={`rounded-full px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
              activo ? "bg-accent text-on-accent shadow-md shadow-accent/20" : "text-text-soft hover:text-text"
            }`}
          >
            {tr(etiqueta)}
          </button>
        )
      })}
    </div>
  )
}

export default function NuevaMatricula({ sedeFija, nombreSede, cargarCatalogo, onCerrar, onCreada }: Props) {
  const [modo, setModo] = useState<Modo>("nuevo")

  if (modo === "nuevo") {
    return (
      <InscripcionEstudiante
        modoMatricula
        encabezado={<SelectorModo modo={modo} onCambiar={setModo} />}
        sedeFija={sedeFija}
        nombreSede={nombreSede}
        cargarCatalogo={cargarCatalogo}
        onCerrar={onCerrar}
        onInscrito={(r: InscripcionRespuestaDto) => {
          const correo = r.correoEnviado ? ` ${tr("Le enviamos un correo con su acceso.")}` : r.aviso ? ` ${tr(r.aviso)}` : ""
          onCreada(
            tr("{nombre} quedó registrado con su matrícula, pendiente de aprobación.", { nombre: r.estudiante.nombre }) + correo,
          )
        }}
      />
    )
  }
  return (
    <MatriculaEstudianteRegistrado
      encabezado={<SelectorModo modo={modo} onCambiar={setModo} />}
      sedeFija={sedeFija}
      nombreSede={nombreSede}
      onCerrar={onCerrar}
      onCreada={onCreada}
    />
  )
}

interface RegistradoProps {
  encabezado: ReactNode
  sedeFija: number | null
  nombreSede?: string | null
  onCerrar: () => void
  onCreada: (mensaje: string) => void
}

function MatriculaEstudianteRegistrado({ encabezado, sedeFija, nombreSede, onCerrar, onCreada }: RegistradoProps) {
  const [estudiantes, setEstudiantes] = useState<EstudianteParaMatriculaDto[]>([])
  const [cargandoEstudiantes, setCargandoEstudiantes] = useState(true)
  const [grupos, setGrupos] = useState<GrupoParaMatriculaDto[]>([])
  const [cargandoGrupos, setCargandoGrupos] = useState(false)
  const [requisitos, setRequisitos] = useState<RequisitoMatriculaDto[]>([])
  const [busqueda, setBusqueda] = useState("")
  const [datos, setDatos] = useState({ idEstudiante: "", idGrupo: "", fecha_matricula: hoyIso() })
  const [tocados, setTocados] = useState<Set<string>>(new Set())
  const [intento, setIntento] = useState(false)
  const [erroresServidor, setErroresServidor] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    matriculaServicio
      .estudiantes(sedeFija)
      .then(setEstudiantes)
      .catch((e) => setErrorGeneral(mensajeError(e)))
      .finally(() => setCargandoEstudiantes(false))
    matriculaServicio.requisitos().then(setRequisitos).catch(() => setRequisitos([]))
  }, [sedeFija])

  const estudiante = estudiantes.find((e) => String(e.idEstudiante) === datos.idEstudiante)

  // Solo grupos activos de la sede del estudiante
  useEffect(() => {
    if (!estudiante) {
      setGrupos([])
      return
    }
    let vigente = true
    setCargandoGrupos(true)
    matriculaServicio
      .grupos(estudiante.idSede)
      .then((lista) => vigente && setGrupos(lista))
      .catch(() => vigente && setGrupos([]))
      .finally(() => vigente && setCargandoGrupos(false))
    return () => {
      vigente = false
    }
  }, [estudiante])

  const filtrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    if (!texto) return estudiantes
    return estudiantes.filter(
      (e) => e.nombre.toLowerCase().includes(texto) || (e.documento ?? "").toLowerCase().includes(texto) || String(e.idEstudiante) === datos.idEstudiante,
    )
  }, [busqueda, estudiantes, datos.idEstudiante])

  const grupo = grupos.find((g) => String(g.idGrupo) === datos.idGrupo)
  const fechaMatricula = datos.fecha_matricula ? new Date(`${datos.fecha_matricula}T00:00:00`) : null
  const edad = estudiante?.fecha_nacimiento && fechaMatricula ? edadEn(estudiante.fecha_nacimiento, fechaMatricula) : null

  // Validación en vivo: mismas reglas del backend (sede, cupo, edad del nivel y fecha)
  const errores = useMemo(() => {
    const e: Record<string, string> = {}
    if (!datos.idEstudiante) e.idEstudiante = tr("Elige el estudiante.")
    if (!datos.idGrupo) e.idGrupo = tr("Elige el grupo.")
    else if (grupo && cuposLibres(grupo) === 0) e.idGrupo = tr("El grupo no tiene cupos disponibles.")
    else if (grupo && edad !== null) {
      const { edadMin, edadMax } = grupo
      if ((edadMin !== null && edad < edadMin) || (edadMax !== null && edad > edadMax)) {
        e.idGrupo = tr("Con {edad} años no puede entrar a este nivel (acepta de {min} a {max} años).", {
          edad,
          min: edadMin ?? "-",
          max: edadMax ?? "-",
        })
      }
    }
    if (!datos.fecha_matricula || !fechaMatricula || Number.isNaN(fechaMatricula.getTime())) {
      e.fecha_matricula = tr("Este campo es obligatorio.")
    } else {
      const dias = (fechaMatricula.getTime() - new Date(`${hoyIso()}T00:00:00`).getTime()) / 864e5
      if (dias > DIAS_MARGEN) e.fecha_matricula = tr("La fecha no puede ser de más de un año en el futuro.")
      else if (dias < -DIAS_MARGEN) e.fecha_matricula = tr("La fecha no puede ser de hace más de un año.")
    }
    return e
  }, [datos, grupo, edad, fechaMatricula])

  const error = (campo: string) => erroresServidor[campo] || ((intento || tocados.has(campo)) && errores[campo]) || undefined

  const cambiar = (campo: keyof typeof datos, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor, ...(campo === "idEstudiante" ? { idGrupo: "" } : {}) }))
    setTocados((prev) => new Set(prev).add(campo))
    setErroresServidor((prev) => ({ ...prev, [campo]: "" }))
  }

  const enviar = async () => {
    setIntento(true)
    setErrorGeneral(null)
    if (Object.keys(errores).length) {
      setErrorGeneral(tr("Revisa los campos marcados."))
      return
    }
    setGuardando(true)
    try {
      const creada = await matriculaServicio.crear({
        idEstudiante: Number(datos.idEstudiante),
        idGrupo: Number(datos.idGrupo),
        fecha_matricula: datos.fecha_matricula,
      })
      onCreada(
        creada.idEstado === MATRICULA_ACTIVA
          ? tr("La matrícula de {nombre} quedó creada y activa.", { nombre: creada.estudiante })
          : tr("La matrícula de {nombre} quedó creada y pendiente de aprobación.", { nombre: creada.estudiante }),
      )
    } catch (e) {
      const campos = erroresDeCampo(e)
      setErroresServidor(campos)
      setErrorGeneral(Object.keys(campos).length ? tr("Revisa los campos marcados.") : mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo
      antetitulo={nombreSede ? `${tr("Sede")} ${nombreSede}` : tr("Matrículas")}
      titulo={tr("Nueva matrícula")}
      ocupado={guardando}
      onCerrar={onCerrar}
      onEnviar={enviar}
      pie={
        <>
          <button type="button" onClick={onCerrar} disabled={guardando} className={claseBotonSecundario}>{tr("Cancelar")}</button>
          <button type="submit" disabled={guardando} aria-busy={guardando} className={claseBotonPrincipal}>
            {guardando && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />}
            {guardando ? tr("Matriculando…") : tr("Crear matrícula")}
          </button>
        </>
      }
    >
      {encabezado}
      <MensajeError mensaje={errorGeneral} />
      <p className="mb-4 font-body text-xs text-text-muted">
        {tr("Para un estudiante que ya está registrado: un nuevo ciclo o un cambio de grupo.")}{" "}
        {tr("Los campos con")} <span className="text-red-500" aria-hidden="true">*</span>
        <span className="sr-only">{tr("asterisco")}</span> {tr("son obligatorios.")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Seccion>{tr("Estudiante")}</Seccion>
        <Campo id="mat-buscar" etiqueta="Buscar estudiante" ayuda={cargandoEstudiantes ? "Cargando estudiantes…" : `${filtrados.length} ${tr(filtrados.length === 1 ? "estudiante activo" : "estudiantes activos")}`}>
          {(p) => (
            <input
              {...p}
              type="search"
              value={busqueda}
              placeholder={tr("Nombre o documento…")}
              disabled={guardando}
              onChange={(e) => setBusqueda(e.target.value)}
              // Enter filtra; no envía el formulario
              onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
              className={claseEntrada}
            />
          )}
        </Campo>
        <Campo
          id="mat-estudiante"
          etiqueta="Estudiante"
          requerido
          error={error("idEstudiante")}
          ayuda={estudiante ? `${tr("Sede")} ${estudiante.sede}${edad !== null ? ` · ${edad} ${tr("años")}` : ""}` : "Solo estudiantes activos."}
        >
          {(p) => (
            <select
              {...p}
              name="idEstudiante"
              value={datos.idEstudiante}
              disabled={guardando || cargandoEstudiantes}
              onChange={(e) => cambiar("idEstudiante", e.target.value)}
              onBlur={() => setTocados((prev) => new Set(prev).add("idEstudiante"))}
              className={`${claseEntrada} cursor-pointer`}
            >
              <option value="">{cargandoEstudiantes ? tr("Cargando…") : filtrados.length ? tr("Selecciona…") : tr("Ningún estudiante coincide")}</option>
              {filtrados.map((e) => (
                <option key={e.idEstudiante} value={e.idEstudiante}>
                  {e.nombre}{e.documento ? ` · ${e.documento}` : ""}{sedeFija ? "" : ` · ${e.sede}`}
                </option>
              ))}
            </select>
          )}
        </Campo>

        <Seccion>{tr("Matrícula")}</Seccion>
        <Campo id="mat-grupo" etiqueta="Grupo" requerido ancho="completo" error={error("idGrupo")} ayuda="Solo grupos activos de la sede del estudiante. Se validan el cupo y la edad del nivel.">
          {(p) => (
            <select
              {...p}
              name="idGrupo"
              value={datos.idGrupo}
              disabled={guardando || !estudiante || cargandoGrupos}
              onChange={(e) => cambiar("idGrupo", e.target.value)}
              onBlur={() => setTocados((prev) => new Set(prev).add("idGrupo"))}
              className={`${claseEntrada} cursor-pointer`}
            >
              <option value="">
                {!estudiante ? tr("Primero elige el estudiante") : cargandoGrupos ? tr("Cargando opciones…") : grupos.length ? tr("Selecciona…") : tr("No hay grupos activos en su sede")}
              </option>
              {grupos.map((g) => {
                const libres = cuposLibres(g)
                return (
                  <option key={g.idGrupo} value={g.idGrupo} disabled={libres === 0}>
                    {g.nombre} · {g.nivel} · {g.estilo} · {libres === 0 ? tr("sin cupos") : tr(libres === 1 ? "{n} cupo libre" : "{n} cupos libres", { n: libres })}
                  </option>
                )
              })}
            </select>
          )}
        </Campo>
        <Campo id="mat-fecha" etiqueta="Fecha de matrícula" requerido error={error("fecha_matricula")}>
          {(p) => (
            <input
              {...p}
              name="fecha_matricula"
              type="date"
              value={datos.fecha_matricula}
              disabled={guardando}
              onChange={(e) => cambiar("fecha_matricula", e.target.value)}
              className={claseEntrada}
            />
          )}
        </Campo>
        <div>
          <p className="mb-1.5 block font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">{tr("Valor de la matrícula")}</p>
          <p className="flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 font-body text-sm font-semibold text-text">
            {textoValorMatricula()}
            <span className="font-condensed text-[11px] font-semibold uppercase tracking-wider text-accent">{tr("Precio único")}</span>
          </p>
        </div>

        {requisitos.length > 0 && (
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 sm:col-span-2">
            <p className="font-body text-sm font-semibold text-amber-800 dark:text-amber-200">
              {tr("Queda pendiente de aprobación hasta cumplir:")}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {requisitos.map((r) => (
                <li key={r.idRequisito} className="rounded-full border border-amber-500/30 bg-surface px-3 py-1 font-body text-xs text-text-soft">
                  {tr(r.nombre)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Dialogo>
  )
}
