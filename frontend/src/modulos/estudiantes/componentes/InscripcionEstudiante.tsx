import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useMemo, useState, type ReactNode } from "react"
import type { Opcion } from "@/compartido/ui/PantallaRecurso"
import { claseBotonPrincipal, claseBotonSecundario, claseEntrada } from "@/compartido/ui/PantallaRecurso"
import { erroresDeCampo, mensajeError, recursoApi } from "@/compartido/api/recursos"
import type { InscripcionRespuestaDto, InscripcionSolicitudDto } from "../dtos/inscripcionDto"
import { inscripcionServicio } from "../servicios/inscripcionServicio"
import CamposAcudiente, {
  acudienteASolicitud,
  acudienteVacio,
  validarAcudiente,
  type AcudienteFormulario,
} from "./CamposAcudiente"
import {
  Campo,
  Dialogo,
  MensajeError,
  Seccion,
  correoValido,
  edadEn,
  errorDocumento,
  errorNombre,
  errorTelefono,
  errorTipoParaEdad,
  textoValorMatricula,
  EDAD_ADULTO,
  TELEFONO_DIGITOS,
} from "./formulario"

/*
 * Inscripción presencial: el administrador registra al estudiante en la sede, con sus
 * acudientes y, si ya se definió, la matrícula en un grupo y la cuenta del portal.
 * La API guarda todo junto o nada (POST /inscripciones).
 *
 * Con `modoMatricula` es el formulario de «Nueva matrícula»: primero se matricula y así
 * la persona queda registrada. La matrícula queda pendiente de aprobación.
 */

const MAX_ACUDIENTES = 1
const MAX_CARACTERES_TELEFONO = 15

interface Props {
  // Sede de la cuenta del administrador; si es null se elige en el formulario
  sedeFija: number | null
  nombreSede?: string | null
  cargarCatalogo: (ruta: string) => Promise<Opcion[]>
  onCerrar: () => void
  onInscrito: (respuesta: InscripcionRespuestaDto) => void
  // Formulario de «Nueva matrícula»: el grupo es obligatorio
  modoMatricula?: boolean
  // Contenido arriba del formulario (selector de estudiante nuevo o registrado)
  encabezado?: ReactNode
}

interface GrupoOpcion {
  idGrupo: number
  nombre: string
  nivel: string
  estilo: string
  // Solo vienen de /matriculas/opciones/grupos
  edadMin?: number | null
  edadMax?: number | null
  capacidad?: number
  ocupados?: number
}

const cuposLibres = (g: GrupoOpcion) =>
  g.capacidad !== undefined && g.ocupados !== undefined ? Math.max(0, g.capacidad - g.ocupados) : null

// Edad y cupo del grupo elegido (el backend repite las mismas reglas al guardar)
function errorGrupo(grupo: GrupoOpcion | undefined, edad: number | null): string | undefined {
  if (!grupo) return undefined
  if (cuposLibres(grupo) === 0) return tr("El grupo no tiene cupos disponibles.")
  if (edad === null || edad < 0) return undefined
  const minima = grupo.edadMin ?? null
  const maxima = grupo.edadMax ?? null
  if ((minima !== null && edad < minima) || (maxima !== null && edad > maxima)) {
    return tr("Con {edad} años no puede entrar a este nivel (acepta de {min} a {max} años).", {
      edad,
      min: minima ?? "-",
      max: maxima ?? "-",
    })
  }
  return undefined
}

const datosVacios = {
  nombre: "",
  idTipoDocumento: "2",
  documento: "",
  telefono: "",
  email: "",
  fecha_nacimiento: "",
  idSede: "",
  idGrupo: "",
  clave: "",
  confirmarClave: "",
}

export default function InscripcionEstudiante({
  sedeFija,
  nombreSede,
  cargarCatalogo,
  onCerrar,
  onInscrito,
  modoMatricula = false,
  encabezado,
}: Props) {
  const [datos, setDatos] = useState({ ...datosVacios, idSede: sedeFija ? String(sedeFija) : "" })
  const [acudientes, setAcudientes] = useState<AcudienteFormulario[]>([])
  const [matricular, setMatricular] = useState(modoMatricula)
  // Acceso al portal: sin cuenta, invitación por correo o contraseña asignada por la sede
  const [cuenta, setCuenta] = useState<"ninguna" | "invitar" | "clave">("ninguna")
  const [tipos, setTipos] = useState<Opcion[]>([])
  const [parentescos, setParentescos] = useState<Opcion[]>([])
  const [sedes, setSedes] = useState<Opcion[]>([])
  const [grupos, setGrupos] = useState<GrupoOpcion[]>([])
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [erroresAcudientes, setErroresAcudientes] = useState<Record<number, Record<string, string>>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarCatalogo("/catalogos/tipos-documento").then(setTipos).catch(() => setTipos([]))
    cargarCatalogo("/catalogos/parentescos").then(setParentescos).catch(() => setParentescos([]))
    if (!sedeFija) {
      recursoApi
        .opciones<{ idSede: number; nombre: string }>("/sedes/disponibles")
        .then((lista) => setSedes(lista.map((s) => ({ valor: String(s.idSede), etiqueta: s.nombre }))))
        .catch(() => setSedes([]))
    }
  }, [cargarCatalogo, sedeFija])

  // Solo los grupos activos de la sede del estudiante, con su rango de edad y cupos.
  // Si el rol no puede ver matrículas, se usa la lista simple de grupos.
  useEffect(() => {
    if (!matricular || !datos.idSede) {
      setGrupos([])
      return
    }
    let vigente = true
    recursoApi
      .opciones<GrupoOpcion>("/matriculas/opciones/grupos", { sede: datos.idSede })
      .catch(() => recursoApi.opciones<GrupoOpcion>("/grupos/disponibles", { sede: datos.idSede }))
      .then((lista) => vigente && setGrupos(lista))
      .catch(() => vigente && setGrupos([]))
    return () => {
      vigente = false
    }
  }, [matricular, datos.idSede])

  const edad = edadEn(datos.fecha_nacimiento)
  const menor = edad !== null && edad < EDAD_ADULTO
  const tipoNombre = tipos.find((t) => t.valor === datos.idTipoDocumento)?.etiqueta ?? ""
  const avisoTipo = useMemo(() => errorTipoParaEdad(tipoNombre, edad), [tipoNombre, edad])
  const grupoElegido = grupos.find((g) => String(g.idGrupo) === datos.idGrupo)
  const avisoGrupo = matricular ? errorGrupo(grupoElegido, edad) : undefined

  // Validación en vivo: el formato de cada campo se revisa al escribir y, después del
  // primer intento de guardar, el formulario completo se revisa en cada cambio
  const [intento, setIntento] = useState(false)
  const cambiar = (campo: keyof typeof datosVacios, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    const formato =
      campo === "nombre" ? (valor.trim() ? errorNombre(valor) : undefined)
      : campo === "documento" ? errorDocumento(tipoNombre, valor)
      : campo === "telefono" ? (valor ? errorTelefono(valor) : undefined)
      : campo === "email" ? (valor && !correoValido(valor) ? "Escribe un correo válido." : undefined)
      : undefined
    setErrores((prev) => ({ ...prev, [campo]: formato ?? "" }))
  }

  // Si es menor de edad, el bloque del acudiente aparece de una vez (es obligatorio)
  useEffect(() => {
    if (menor) setAcudientes((prev) => (prev.length ? prev : [acudienteVacio()]))
  }, [menor])

  const validar = () => {
    const e: Record<string, string> = {}
    const errorNom = errorNombre(datos.nombre)
    if (errorNom) e.nombre = errorNom
    if (!datos.idTipoDocumento) e.idTipoDocumento = "Elige el tipo de documento."
    const errorDoc = errorDocumento(tipoNombre, datos.documento)
    if (errorDoc) e.documento = errorDoc
    const errorTel = errorTelefono(datos.telefono)
    if (errorTel) e.telefono = errorTel
    if (datos.email && !correoValido(datos.email)) e.email = "Escribe un correo válido."
    if (!datos.fecha_nacimiento) e.fecha_nacimiento = "Este campo es obligatorio."
    else if (edad === null || edad < 0) e.fecha_nacimiento = "La fecha de nacimiento no puede ser futura."
    else if (avisoTipo) e.idTipoDocumento = avisoTipo
    if (!datos.idSede) e.idSede = "Elige la sede."
    if (matricular) {
      if (!datos.idGrupo) e.idGrupo = "Elige el grupo."
      else if (avisoGrupo) e.idGrupo = avisoGrupo
    }
    if (cuenta === "invitar" && !datos.email) {
      e.email = "La invitación llega a este correo: es obligatorio para enviarla."
    }
    if (cuenta === "clave") {
      if (datos.clave.length < 8) e.clave = "Mínimo 8 caracteres."
      else if (!/[A-Za-z]/.test(datos.clave) || !/\d/.test(datos.clave)) e.clave = "Usa al menos una letra y un número."
      else if (datos.clave !== datos.confirmarClave) e.confirmarClave = "Las contraseñas no coinciden."
    }

    const porAcudiente: Record<number, Record<string, string>> = {}
    // El acudiente es opcional: un bloque sin datos se ignora
    const conDatos = acudientes.filter((a) => a.encontrada || a.nuevo || a.idParentesco || a.documentoBusqueda.trim())
    conDatos.forEach((a) => {
      const errorA = validarAcudiente(a, tipos)
      if (Object.keys(errorA).length) porAcudiente[a.clave] = errorA
    })
    // Menor de edad: el acudiente es obligatorio (el backend aplica la misma regla)
    if (menor && conDatos.length === 0) {
      e.acudientes = tr("El estudiante es menor de edad: agrega un acudiente para poder registrarlo.")
      const primero = acudientes[0]
      if (primero) porAcudiente[primero.clave] = validarAcudiente(primero, tipos)
    }

    setErrores(e)
    setErroresAcudientes(porAcudiente)
    return { valido: !Object.keys(e).length && !Object.keys(porAcudiente).length, conDatos }
  }

  useEffect(() => {
    if (intento) validar()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intento, datos, acudientes, cuenta, matricular, grupos])

  const enviar = async () => {
    setErrorGeneral(null)
    setIntento(true)
    const { valido, conDatos } = validar()
    if (!valido) {
      setErrorGeneral(menor && !conDatos.length
        ? tr("El estudiante es menor de edad: agrega un acudiente para poder registrarlo.")
        : tr("Revisa los campos marcados."))
      return
    }
    const solicitud: InscripcionSolicitudDto = {
      nombre: datos.nombre.trim(),
      idTipoDocumento: Number(datos.idTipoDocumento),
      documento: datos.documento.trim(),
      telefono: datos.telefono.trim(),
      email: datos.email.trim() || undefined,
      fecha_nacimiento: datos.fecha_nacimiento,
      idSede: Number(datos.idSede),
      acudientes: conDatos.map(acudienteASolicitud),
      ...(matricular ? { idGrupo: Number(datos.idGrupo) } : {}),
      ...(cuenta === "invitar" ? { crearCuenta: true } : {}),
      ...(cuenta === "clave" ? { crearCuenta: true, clave: datos.clave } : {}),
    }
    setGuardando(true)
    try {
      onInscrito(await inscripcionServicio.inscribir(solicitud))
    } catch (e) {
      const campos = erroresDeCampo(e)
      setErrores(campos)
      setErrorGeneral(Object.keys(campos).length ? tr("Revisa los campos marcados.") : mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo
      antetitulo={nombreSede ? `${tr("Sede")} ${nombreSede}` : tr(modoMatricula ? "Matrículas" : "Estudiantes")}
      titulo={tr(modoMatricula ? "Nueva matrícula" : "Inscribir estudiante")}
      ocupado={guardando}
      onCerrar={onCerrar}
      onEnviar={enviar}
      pie={
        <>
          <button type="button" onClick={onCerrar} disabled={guardando} className={claseBotonSecundario}>{tr("Cancelar")}</button>
          <button type="submit" disabled={guardando} aria-busy={guardando} className={claseBotonPrincipal}>
            {guardando
              ? tr(modoMatricula ? "Matriculando…" : "Inscribiendo…")
              : tr(modoMatricula ? "Crear matrícula" : "Inscribir estudiante")}
          </button>
        </>
      }
    >
      {encabezado}
      <MensajeError mensaje={errorGeneral} />
      <p className="mb-4 font-body text-xs text-text-muted">
        {tr(modoMatricula
          ? "Se registra al estudiante con su matrícula; queda pendiente hasta cumplir los requisitos y su aprobación."
          : "La inscripción es presencial.")}{" "}
        {tr("Los campos con")} <span className="text-red-500" aria-hidden="true">*</span>
        <span className="sr-only">{tr("asterisco")}</span> {tr("son obligatorios.")}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Seccion>{tr("Datos del estudiante")}</Seccion>
        {/* Orden acordado: tipo y número de documento, fecha de nacimiento y nombre completo */}
        <Campo id="insc-tipo" etiqueta="Tipo de documento" requerido error={errores.idTipoDocumento}
          ayuda="Registro civil hasta los 6 años, tarjeta de identidad de 7 a 17 y cédula desde los 18.">
          {(p) => (
            <select {...p} value={datos.idTipoDocumento} disabled={guardando} onChange={(e) => cambiar("idTipoDocumento", e.target.value)} className={claseEntrada}>
              {tipos.map((t) => <option key={t.valor} value={t.valor}>{tr(t.etiqueta)}</option>)}
            </select>
          )}
        </Campo>
        <Campo id="insc-documento" etiqueta="Número de documento" requerido error={errores.documento}>
          {(p) => <input {...p} value={datos.documento} maxLength={20} autoComplete="off" disabled={guardando} onChange={(e) => cambiar("documento", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-nacimiento" etiqueta="Fecha de nacimiento" requerido error={errores.fecha_nacimiento}
          ayuda={edad !== null && edad >= 0 ? `${edad} años${menor ? tr(" · menor de edad: requiere acudiente") : ""}` : undefined}>
          {(p) => <input {...p} type="date" value={datos.fecha_nacimiento} disabled={guardando} onChange={(e) => cambiar("fecha_nacimiento", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-nombre" etiqueta="Nombre completo" requerido error={errores.nombre}>
          {(p) => <input {...p} value={datos.nombre} maxLength={100} disabled={guardando} onChange={(e) => cambiar("nombre", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-telefono" etiqueta="Teléfono" requerido error={errores.telefono} ayuda={`Máximo ${TELEFONO_DIGITOS} dígitos, por ejemplo 3001234567.`}>
          {(p) => (
            <input {...p} type="tel" inputMode="numeric" value={datos.telefono} maxLength={MAX_CARACTERES_TELEFONO} disabled={guardando}
              onChange={(e) => {
                const valor = e.target.value.replace(/\D/g, "")
                cambiar("telefono", valor)
                // Aviso inmediato si pasa del límite (se cuentan dígitos)
                if (valor.length > TELEFONO_DIGITOS) setErrores((prev) => ({ ...prev, telefono: errorTelefono(valor) ?? "" }))
              }}
              className={claseEntrada} />
          )}
        </Campo>
        <Campo id="insc-email" etiqueta="Correo electrónico" requerido={cuenta === "invitar"} error={errores.email}>
          {(p) => <input {...p} type="email" value={datos.email} maxLength={100} disabled={guardando} onChange={(e) => cambiar("email", e.target.value)} className={claseEntrada} />}
        </Campo>
        {!sedeFija && (
          <Campo id="insc-sede" etiqueta="Sede" requerido error={errores.idSede}>
            {(p) => (
              <select {...p} value={datos.idSede} disabled={guardando} onChange={(e) => { cambiar("idSede", e.target.value); cambiar("idGrupo", "") }} className={claseEntrada}>
                <option value="">{tr("Selecciona…")}</option>
                {sedes.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
              </select>
            )}
          </Campo>
        )}

        <Seccion>{menor ? tr("Acudiente (obligatorio: es menor de edad)") : tr("Acudiente (opcional)")}</Seccion>
        {acudientes.length === 0 && (
          <p className="font-body text-xs text-text-muted sm:col-span-2">
            {menor ? tr("Es menor de edad: el acudiente es obligatorio para registrarlo.") : tr("Puedes registrar un acudiente si el estudiante lo necesita.")}
          </p>
        )}
        {errores.acudientes && <p role="alert" className="font-body text-xs font-medium text-red-600 dark:text-red-300 sm:col-span-2">{errores.acudientes}</p>}
        {acudientes.map((a, indice) => (
          <CamposAcudiente
            key={a.clave}
            valor={a}
            numero={indice + 1}
            tipos={tipos}
            parentescos={parentescos}
            errores={erroresAcudientes[a.clave] ?? {}}
            deshabilitado={guardando}
            onCambiar={(nuevo) => {
              setAcudientes((prev) => prev.map((x) => (x.clave === a.clave ? nuevo : x)))
              // El error se recalcula al volver a enviar
              setErroresAcudientes((prev) => ({ ...prev, [a.clave]: {} }))
            }}
            // Un menor no puede quedarse sin acudiente
            onQuitar={menor && acudientes.length <= 1 ? undefined : () => setAcudientes((prev) => prev.filter((x) => x.clave !== a.clave))}
          />
        ))}
        {acudientes.length < MAX_ACUDIENTES && (
          <button type="button" disabled={guardando} onClick={() => setAcudientes((prev) => [...prev, acudienteVacio()])}
            className={`${claseBotonSecundario} sm:col-span-2`}>
            {tr("Agregar acudiente")}
          </button>
        )}

        <Seccion>{tr(modoMatricula ? "Matrícula" : "Matrícula y acceso")}</Seccion>
        {!modoMatricula && (
          <label className="flex items-center gap-3 font-body text-sm text-text sm:col-span-2">
            <input type="checkbox" checked={matricular} disabled={guardando} onChange={(e) => setMatricular(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
            {tr("Matricular ahora en un grupo")}
          </label>
        )}
        {matricular && (
          <>
            <Campo id="insc-grupo" etiqueta="Grupo" requerido error={errores.idGrupo || avisoGrupo}
              ayuda="Solo grupos activos de la sede. Se validan el cupo y la edad del nivel.">
              {(p) => (
                <select {...p} value={datos.idGrupo} disabled={guardando || !datos.idSede} onChange={(e) => cambiar("idGrupo", e.target.value)} className={claseEntrada}>
                  <option value="">{datos.idSede ? tr("Selecciona…") : tr("Primero elige la sede")}</option>
                  {grupos.map((g) => {
                    const libres = cuposLibres(g)
                    return (
                      <option key={g.idGrupo} value={g.idGrupo} disabled={libres === 0}>
                        {g.nombre} · {g.nivel} · {g.estilo}
                        {libres !== null ? ` · ${libres === 0 ? tr("sin cupos") : tr(libres === 1 ? "{n} cupo libre" : "{n} cupos libres", { n: libres })}` : ""}
                      </option>
                    )
                  })}
                </select>
              )}
            </Campo>
            <div>
              <p className="mb-1.5 block font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">{tr("Valor de la matrícula")}</p>
              <p className="flex items-center justify-between gap-2 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5 font-body text-sm font-semibold text-text">
                {textoValorMatricula()}
                <span className="font-condensed text-[11px] font-semibold uppercase tracking-wider text-accent">{tr("Precio único")}</span>
              </p>
              <p className="mt-1 font-body text-xs text-text-muted">{tr("Queda pendiente de aprobación hasta cumplir los requisitos.")}</p>
            </div>
          </>
        )}
        <fieldset className="flex flex-col gap-2 sm:col-span-2">
          <legend className="mb-1 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
            {tr("Acceso al portal del estudiante")}
          </legend>
          <p className="font-body text-xs text-text-muted">{tr("El usuario para iniciar sesión es el número de documento.")}</p>
          {([
            ["ninguna", "Sin cuenta por ahora"],
            ["invitar", "Enviar invitación al correo (el estudiante crea su contraseña)"],
            ["clave", "Asignar una contraseña y entregarla en la sede"],
          ] as const).map(([valor, etiqueta]) => (
            <label key={valor} className="flex items-center gap-3 font-body text-sm text-text">
              <input type="radio" name="insc-cuenta" value={valor} checked={cuenta === valor} disabled={guardando}
                onChange={() => { setCuenta(valor); setErrores((prev) => ({ ...prev, email: "", clave: "", confirmarClave: "" })) }}
                className="h-4 w-4 accent-[var(--color-accent)]" />
              {tr(etiqueta)}
            </label>
          ))}
        </fieldset>
        {cuenta === "clave" && (
          <>
            <Campo id="insc-clave" etiqueta="Contraseña inicial" requerido error={errores.clave} ayuda="Mínimo 8 caracteres, con letras y números.">
              {(p) => <input {...p} type="password" autoComplete="new-password" value={datos.clave} maxLength={128} disabled={guardando} onChange={(e) => cambiar("clave", e.target.value)} className={claseEntrada} />}
            </Campo>
            <Campo id="insc-clave2" etiqueta="Confirmar contraseña" requerido error={errores.confirmarClave}>
              {(p) => <input {...p} type="password" autoComplete="new-password" value={datos.confirmarClave} maxLength={128} disabled={guardando} onChange={(e) => cambiar("confirmarClave", e.target.value)} className={claseEntrada} />}
            </Campo>
          </>
        )}
      </div>
    </Dialogo>
  )
}
