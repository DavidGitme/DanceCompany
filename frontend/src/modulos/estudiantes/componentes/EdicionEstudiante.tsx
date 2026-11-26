import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useMemo, useState } from "react"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import type { Opcion } from "@/compartido/ui/PantallaRecurso"
import { claseBotonPrincipal, claseBotonSecundario, claseEntrada } from "@/compartido/ui/PantallaRecurso"
import { erroresDeCampo, mensajeError, recursoApi } from "@/compartido/api/recursos"
import type { AcudienteDto } from "../dtos/inscripcionDto"
import { inscripcionServicio } from "../servicios/inscripcionServicio"
import CamposAcudiente, { acudienteASolicitud, acudienteVacio, validarAcudiente, type AcudienteFormulario } from "./CamposAcudiente"
import {
  Campo,
  Dialogo,
  MensajeError,
  Seccion,
  TELEFONO_DIGITOS,
  correoValido,
  edadEn,
  errorDocumento,
  errorTelefono,
  errorTipoParaEdad,
  esMenorDeEdad,
} from "./formulario"

/*
 * Edición del estudiante: sus datos y los de su acudiente en una sola pantalla.
 * Es el único lugar donde se modifican (la ficha "Ver" es de solo lectura).
 * Reglas: un menor de edad debe tener acudiente y no se le puede quitar.
 */

export interface EstudianteEdicion {
  idEstudiante: number
  nombre: string
  idTipoDocumento: number
  documento: string | null
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  idSede: number
  sede: string
}

interface Props {
  estudiante: EstudianteEdicion
  cargarCatalogo: (ruta: string) => Promise<Opcion[]>
  onCerrar: () => void
  onGuardado: (nombre: string) => void
}

type DatosAcudiente = { nombre: string; telefono: string; email: string; idParentesco: string }

const MAX_CARACTERES_TELEFONO = 15
const soloDigitos = (valor: string) => valor.replace(/\D/g, "")

const acudienteAFormulario = (a: AcudienteDto): DatosAcudiente => ({
  nombre: a.nombre,
  telefono: a.telefono ?? "",
  email: a.email ?? "",
  idParentesco: String(a.idParentesco),
})

export default function EdicionEstudiante({ estudiante, cargarCatalogo, onCerrar, onGuardado }: Props) {
  const [datos, setDatos] = useState({
    idTipoDocumento: String(estudiante.idTipoDocumento),
    documento: estudiante.documento ?? "",
    fecha_nacimiento: estudiante.fecha_nacimiento ?? "",
    nombre: estudiante.nombre,
    telefono: estudiante.telefono ?? "",
    email: estudiante.email ?? "",
    idSede: String(estudiante.idSede),
  })
  const [tipos, setTipos] = useState<Opcion[]>([])
  const [parentescos, setParentescos] = useState<Opcion[]>([])
  const [sedes, setSedes] = useState<Opcion[]>([])
  const [acudiente, setAcudiente] = useState<AcudienteDto | null>(null)
  const [datosAcudiente, setDatosAcudiente] = useState<DatosAcudiente | null>(null)
  const [nuevo, setNuevo] = useState<AcudienteFormulario | null>(null)
  const [cargando, setCargando] = useState(true)
  const [errores, setErrores] = useState<Record<string, string>>({})
  const [erroresAcudiente, setErroresAcudiente] = useState<Record<string, string>>({})
  const [erroresNuevo, setErroresNuevo] = useState<Record<string, string>>({})
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)
  const [quitando, setQuitando] = useState(false)
  const [confirmarQuitar, setConfirmarQuitar] = useState(false)

  const ponerAcudiente = (lista: AcudienteDto[]) => {
    const actual = lista[0] ?? null
    setAcudiente(actual)
    setDatosAcudiente(actual ? acudienteAFormulario(actual) : null)
  }

  const cargarAcudiente = useCallback(async () => {
    setCargando(true)
    try {
      ponerAcudiente(await inscripcionServicio.acudientes(estudiante.idEstudiante))
    } catch (e) {
      setErrorGeneral(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [estudiante.idEstudiante])

  useEffect(() => {
    cargarAcudiente()
    cargarCatalogo("/catalogos/tipos-documento").then(setTipos).catch(() => setTipos([]))
    cargarCatalogo("/catalogos/parentescos").then(setParentescos).catch(() => setParentescos([]))
    recursoApi
      .opciones<{ idSede: number; nombre: string }>("/sedes/disponibles")
      .then((lista) => setSedes(lista.map((s) => ({ valor: String(s.idSede), etiqueta: s.nombre }))))
      .catch(() => setSedes([{ valor: String(estudiante.idSede), etiqueta: estudiante.sede }]))
  }, [cargarAcudiente, cargarCatalogo, estudiante.idSede, estudiante.sede])

  const edad = edadEn(datos.fecha_nacimiento)
  const menor = esMenorDeEdad(datos.fecha_nacimiento)
  const tipoNombre = tipos.find((t) => t.valor === datos.idTipoDocumento)?.etiqueta ?? ""
  const avisoTipo = useMemo(() => errorTipoParaEdad(tipoNombre, edad), [tipoNombre, edad])

  // Menor sin acudiente: se abre el bloque para agregarlo (es obligatorio)
  useEffect(() => {
    if (!cargando && menor && !acudiente) setNuevo((prev) => prev ?? acudienteVacio())
  }, [cargando, menor, acudiente])

  const cambiar = (campo: keyof typeof datos, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: "" }))
  }

  const cambiarAcudiente = (campo: keyof DatosAcudiente, valor: string) => {
    setDatosAcudiente((prev) => (prev ? { ...prev, [campo]: valor } : prev))
    setErroresAcudiente((prev) => ({ ...prev, [campo]: "" }))
  }

  const validar = () => {
    const e: Record<string, string> = {}
    if (!datos.idTipoDocumento) e.idTipoDocumento = "Elige el tipo de documento."
    const errorDoc = errorDocumento(tipoNombre, datos.documento)
    if (errorDoc) e.documento = errorDoc
    if (!datos.fecha_nacimiento) e.fecha_nacimiento = "Este campo es obligatorio."
    else if (edad === null || edad < 0) e.fecha_nacimiento = "La fecha de nacimiento no puede ser futura."
    else if (avisoTipo) e.idTipoDocumento = avisoTipo
    if (datos.nombre.trim().length < 2) e.nombre = "Escribe el nombre completo."
    const errorTel = errorTelefono(datos.telefono)
    if (errorTel) e.telefono = errorTel
    if (datos.email && !correoValido(datos.email)) e.email = "Escribe un correo válido."
    if (!datos.idSede) e.idSede = "Elige la sede."

    const eA: Record<string, string> = {}
    if (datosAcudiente) {
      if (datosAcudiente.nombre.trim().length < 2) eA.nombre = "Escribe el nombre completo."
      const telA = errorTelefono(datosAcudiente.telefono)
      if (telA) eA.telefono = telA
      if (datosAcudiente.email && !correoValido(datosAcudiente.email)) eA.email = "Escribe un correo válido."
      if (!datosAcudiente.idParentesco) eA.idParentesco = "Elige el parentesco."
    }

    // Un bloque nuevo sin datos se ignora, salvo que sea obligatorio
    const nuevoConDatos = nuevo && (nuevo.encontrada || nuevo.nuevo || nuevo.idParentesco || nuevo.documentoBusqueda.trim())
    const eN = nuevo && (nuevoConDatos || (menor && !acudiente)) ? validarAcudiente(nuevo, tipos) : {}

    setErrores(e)
    setErroresAcudiente(eA)
    setErroresNuevo(eN)
    const faltaAcudiente = menor && !acudiente && !nuevoConDatos
    return {
      valido: !Object.keys(e).length && !Object.keys(eA).length && !Object.keys(eN).length && !faltaAcudiente,
      faltaAcudiente,
      agregar: Boolean(nuevoConDatos),
    }
  }

  const enviar = async () => {
    setErrorGeneral(null)
    const { valido, faltaAcudiente, agregar } = validar()
    if (!valido) {
      setErrorGeneral(
        faltaAcudiente
          ? tr("El estudiante es menor de edad: agrégale un acudiente antes de guardar.")
          : tr("Revisa los campos marcados."),
      )
      return
    }
    setGuardando(true)
    try {
      // 1. Acudiente: primero, para que la regla "menor con acudiente" se cumpla al guardar al estudiante
      if (acudiente && datosAcudiente) {
        const original = acudienteAFormulario(acudiente)
        const cambio = (Object.keys(original) as (keyof DatosAcudiente)[]).some((k) => original[k].trim() !== datosAcudiente[k].trim())
        if (cambio) {
          ponerAcudiente(
            await inscripcionServicio.editarAcudiente(estudiante.idEstudiante, acudiente.idAcudiente, {
              nombre: datosAcudiente.nombre.trim(),
              telefono: soloDigitos(datosAcudiente.telefono),
              email: datosAcudiente.email.trim() || undefined,
              idParentesco: Number(datosAcudiente.idParentesco),
            }),
          )
        }
      } else if (nuevo && agregar) {
        ponerAcudiente(await inscripcionServicio.agregarAcudiente(estudiante.idEstudiante, acudienteASolicitud(nuevo)))
        setNuevo(null)
      }

      // 2. Datos del estudiante
      await recursoApi.actualizar("/estudiantes", estudiante.idEstudiante, {
        idTipoDocumento: Number(datos.idTipoDocumento),
        documento: datos.documento.trim(),
        fecha_nacimiento: datos.fecha_nacimiento,
        nombre: datos.nombre.trim(),
        telefono: soloDigitos(datos.telefono),
        email: datos.email.trim() || undefined,
        idSede: Number(datos.idSede),
      })
      onGuardado(datos.nombre.trim())
    } catch (e) {
      const campos = erroresDeCampo(e)
      setErrores(campos)
      setErrorGeneral(Object.keys(campos).length ? tr("Revisa los campos marcados.") : mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  const quitar = async () => {
    if (!acudiente) return
    setQuitando(true)
    try {
      ponerAcudiente(await inscripcionServicio.quitarAcudiente(estudiante.idEstudiante, acudiente.idAcudiente))
      setErrorGeneral(null)
    } catch (e) {
      setErrorGeneral(mensajeError(e))
    } finally {
      setQuitando(false)
      setConfirmarQuitar(false)
    }
  }

  const ocupado = guardando || quitando
  const campoTelefono = (id: string, valor: string, error: string | undefined, alCambiar: (v: string) => void, alExceder: (msg: string) => void) => (
    <Campo id={id} etiqueta="Teléfono" requerido error={error} ayuda={`Máximo ${TELEFONO_DIGITOS} dígitos.`}>
      {(p) => (
        <input {...p} type="tel" inputMode="numeric" value={valor} maxLength={MAX_CARACTERES_TELEFONO} disabled={ocupado}
          onChange={(e) => {
            const limpio = soloDigitos(e.target.value)
            alCambiar(limpio)
            if (limpio.length > TELEFONO_DIGITOS) alExceder(errorTelefono(limpio) ?? "")
          }}
          className={claseEntrada} />
      )}
    </Campo>
  )

  return (
    <>
      <Dialogo
        antetitulo={`${tr("Estudiante")} · ${estudiante.sede}`}
        titulo={tr("Editar estudiante")}
        ocupado={ocupado}
        onCerrar={onCerrar}
        onEnviar={enviar}
        pie={
          <>
            <button type="button" onClick={onCerrar} disabled={ocupado} className={claseBotonSecundario}>{tr("Cancelar")}</button>
            <button type="submit" disabled={ocupado || cargando} aria-busy={guardando} className={claseBotonPrincipal}>
              {guardando ? tr("Guardando…") : tr("Guardar cambios")}
            </button>
          </>
        }
      >
        <MensajeError mensaje={errorGeneral} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Seccion>{tr("Datos del estudiante")}</Seccion>
          {/* Orden acordado: tipo y número de documento, fecha de nacimiento y nombre completo */}
          <Campo id="edit-tipo" etiqueta="Tipo de documento" requerido error={errores.idTipoDocumento}>
            {(p) => (
              <select {...p} value={datos.idTipoDocumento} disabled={ocupado} onChange={(e) => cambiar("idTipoDocumento", e.target.value)} className={claseEntrada}>
                {tipos.map((t) => <option key={t.valor} value={t.valor}>{tr(t.etiqueta)}</option>)}
              </select>
            )}
          </Campo>
          <Campo id="edit-documento" etiqueta="Número de documento" requerido error={errores.documento}>
            {(p) => <input {...p} value={datos.documento} maxLength={20} autoComplete="off" disabled={ocupado} onChange={(e) => cambiar("documento", e.target.value)} className={claseEntrada} />}
          </Campo>
          <Campo id="edit-nacimiento" etiqueta="Fecha de nacimiento" requerido error={errores.fecha_nacimiento}
            ayuda={edad !== null && edad >= 0 ? `${edad} años${menor ? tr(" · menor de edad: requiere acudiente") : ""}` : undefined}>
            {(p) => <input {...p} type="date" value={datos.fecha_nacimiento} disabled={ocupado} onChange={(e) => cambiar("fecha_nacimiento", e.target.value)} className={claseEntrada} />}
          </Campo>
          <Campo id="edit-nombre" etiqueta="Nombre completo" requerido error={errores.nombre}>
            {(p) => <input {...p} value={datos.nombre} maxLength={100} disabled={ocupado} onChange={(e) => cambiar("nombre", e.target.value)} className={claseEntrada} />}
          </Campo>
          {campoTelefono("edit-telefono", datos.telefono, errores.telefono, (v) => cambiar("telefono", v),
            (msg) => setErrores((prev) => ({ ...prev, telefono: msg })))}
          <Campo id="edit-email" etiqueta="Correo electrónico" error={errores.email}>
            {(p) => <input {...p} type="email" value={datos.email} maxLength={100} disabled={ocupado} onChange={(e) => cambiar("email", e.target.value)} className={claseEntrada} />}
          </Campo>
          <Campo id="edit-sede" etiqueta="Sede" requerido error={errores.idSede} ayuda="Cambiarla es un traslado: primero inactiva su matrícula activa.">
            {(p) => (
              <select {...p} value={datos.idSede} disabled={ocupado} onChange={(e) => cambiar("idSede", e.target.value)} className={claseEntrada}>
                {!sedes.some((s) => s.valor === datos.idSede) && <option value={datos.idSede}>{estudiante.sede}</option>}
                {sedes.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
              </select>
            )}
          </Campo>

          <Seccion>{menor ? tr("Acudiente (obligatorio: es menor de edad)") : tr("Acudiente")}</Seccion>
          {cargando ? (
            <p className="font-body text-sm text-text-muted sm:col-span-2">{tr("Cargando acudientes…")}</p>
          ) : acudiente && datosAcudiente ? (
            <fieldset className="grid gap-4 rounded-2xl border border-border p-4 sm:col-span-2 sm:grid-cols-2">
              <legend className="px-1 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
                {acudiente.tipoDocumento} {acudiente.documento}
              </legend>
              <p className="-mt-2 font-body text-xs text-text-muted sm:col-span-2">
                {tr("El documento no se edita: es el usuario de su cuenta. Si el acudiente es de varios hermanos, el cambio se ve en todos.")}
              </p>
              <Campo id="edit-acu-nombre" etiqueta="Nombre completo" requerido ancho="completo" error={erroresAcudiente.nombre}>
                {(p) => <input {...p} value={datosAcudiente.nombre} maxLength={100} disabled={ocupado} onChange={(e) => cambiarAcudiente("nombre", e.target.value)} className={claseEntrada} />}
              </Campo>
              {campoTelefono("edit-acu-telefono", datosAcudiente.telefono, erroresAcudiente.telefono, (v) => cambiarAcudiente("telefono", v),
                (msg) => setErroresAcudiente((prev) => ({ ...prev, telefono: msg })))}
              <Campo id="edit-acu-email" etiqueta="Correo electrónico" error={erroresAcudiente.email}
                ayuda="Puede ser el mismo para varios estudiantes (por ejemplo, hermanos).">
                {(p) => <input {...p} type="email" value={datosAcudiente.email} maxLength={100} disabled={ocupado} onChange={(e) => cambiarAcudiente("email", e.target.value)} className={claseEntrada} />}
              </Campo>
              <Campo id="edit-acu-parentesco" etiqueta="Parentesco" requerido error={erroresAcudiente.idParentesco}>
                {(p) => (
                  <select {...p} value={datosAcudiente.idParentesco} disabled={ocupado} onChange={(e) => cambiarAcudiente("idParentesco", e.target.value)} className={claseEntrada}>
                    <option value="">{tr("Selecciona…")}</option>
                    {parentescos.map((o) => <option key={o.valor} value={o.valor}>{tr(o.etiqueta)}</option>)}
                  </select>
                )}
              </Campo>
              <div className="flex items-end justify-end">
                {menor ? (
                  <p className="font-body text-xs text-text-muted">{tr("No se puede quitar mientras sea menor de edad.")}</p>
                ) : (
                  <button type="button" onClick={() => setConfirmarQuitar(true)} disabled={ocupado}
                    className="rounded-full px-4 py-2 font-condensed text-xs font-semibold uppercase tracking-wider text-red-600 transition-colors hover:bg-red-500/10 focus-visible:outline-2 focus-visible:outline-red-500 dark:text-red-300">
                    {tr("Quitar acudiente")}
                  </button>
                )}
              </div>
            </fieldset>
          ) : nuevo ? (
            <CamposAcudiente
              valor={nuevo}
              numero={1}
              tipos={tipos}
              parentescos={parentescos}
              errores={erroresNuevo}
              deshabilitado={ocupado}
              onCambiar={(valor) => {
                setNuevo(valor)
                setErroresNuevo({})
              }}
              onQuitar={menor ? undefined : () => setNuevo(null)}
            />
          ) : (
            <button type="button" onClick={() => setNuevo(acudienteVacio())} disabled={ocupado}
              className={`${claseBotonSecundario} sm:col-span-2`}>
              {tr("Agregar acudiente")}
            </button>
          )}
        </div>
      </Dialogo>

      <ConfirmDialog
        open={confirmarQuitar}
        title={tr("Quitar acudiente")}
        message={acudiente ? `${acudiente.nombre} dejará de ser acudiente de ${estudiante.nombre}. Sus pagos anteriores se conservan.` : ""}
        confirmLabel="Quitar"
        tone="peligro"
        loading={quitando}
        onConfirm={quitar}
        onClose={() => setConfirmarQuitar(false)}
      />
    </>
  )
}
