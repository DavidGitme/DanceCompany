import { useState } from "react"
import type { Opcion } from "@/compartido/ui/PantallaRecurso"
import { Icono, claseBotonIcono, claseBotonSecundario, claseEntrada, hoverPeligro } from "@/compartido/ui/PantallaRecurso"
import { mensajeError } from "@/compartido/api/recursos"
import type { ErrorApi } from "@/nucleo/http/clienteHttp"
import type { AcudienteSolicitudDto, PersonaEncontradaDto } from "../dtos/inscripcionDto"
import { inscripcionServicio } from "../servicios/inscripcionServicio"
import { Campo, correoValido, errorDocumento, errorTelefono } from "./formulario"

/*
 * Un acudiente: se busca primero por documento (por ejemplo, el de un hermano ya
 * inscrito). Si no existe, se registran sus datos.
 */
export interface AcudienteFormulario {
  clave: number
  documentoBusqueda: string
  encontrada: PersonaEncontradaDto | null
  nuevo: { nombre: string; idTipoDocumento: string; documento: string; telefono: string; email: string } | null
  idParentesco: string
}

let siguiente = 0
export const acudienteVacio = (): AcudienteFormulario => ({
  clave: ++siguiente,
  documentoBusqueda: "",
  encontrada: null,
  nuevo: null,
  idParentesco: "",
})

export function validarAcudiente(a: AcudienteFormulario, tipos: Opcion[]): Record<string, string> {
  const errores: Record<string, string> = {}
  if (!a.idParentesco) errores.idParentesco = "Elige el parentesco."
  if (!a.encontrada && !a.nuevo) {
    errores.documentoBusqueda = "Busca el documento del acudiente."
    return errores
  }
  if (a.nuevo) {
    const tipo = tipos.find((t) => t.valor === a.nuevo!.idTipoDocumento)?.etiqueta ?? ""
    if (a.nuevo.nombre.trim().length < 2) errores.nombre = "Escribe el nombre completo."
    if (!a.nuevo.idTipoDocumento) errores.idTipoDocumento = "Elige el tipo de documento."
    const errorDoc = errorDocumento(tipo, a.nuevo.documento)
    if (errorDoc) errores.documento = errorDoc
    const errorTel = errorTelefono(a.nuevo.telefono)
    if (errorTel) errores.telefono = errorTel
    if (a.nuevo.email && !correoValido(a.nuevo.email)) errores.email = "Escribe un correo válido."
  }
  return errores
}

export function acudienteASolicitud(a: AcudienteFormulario): AcudienteSolicitudDto {
  if (a.encontrada) return { idPersona: a.encontrada.idPersona, idParentesco: Number(a.idParentesco) }
  const n = a.nuevo!
  return {
    persona: {
      nombre: n.nombre.trim(),
      idTipoDocumento: Number(n.idTipoDocumento),
      documento: n.documento.trim(),
      telefono: n.telefono.trim(),
      email: n.email.trim() || undefined,
    },
    idParentesco: Number(a.idParentesco),
  }
}

interface Props {
  valor: AcudienteFormulario
  numero: number
  tipos: Opcion[]
  parentescos: Opcion[]
  errores: Record<string, string>
  deshabilitado?: boolean
  onCambiar: (valor: AcudienteFormulario) => void
  onQuitar?: () => void
}

export default function CamposAcudiente({ valor, numero, tipos, parentescos, errores, deshabilitado, onCambiar, onQuitar }: Props) {
  const [buscando, setBuscando] = useState(false)
  const [errorBusqueda, setErrorBusqueda] = useState<string | null>(null)
  const prefijo = `acudiente-${valor.clave}`

  const buscar = async () => {
    const documento = valor.documentoBusqueda.trim()
    if (documento.replace(/[\s.-]/g, "").length < 5) {
      setErrorBusqueda("Escribe al menos 5 caracteres del documento.")
      return
    }
    setBuscando(true)
    setErrorBusqueda(null)
    try {
      const persona = await inscripcionServicio.buscarPersona(documento)
      onCambiar({ ...valor, encontrada: persona, nuevo: null })
    } catch (e) {
      if ((e as ErrorApi)?.codigo === "no_encontrado") {
        // No existe: se registran sus datos con el documento ya escrito
        onCambiar({
          ...valor,
          encontrada: null,
          nuevo: { nombre: "", idTipoDocumento: "1", documento, telefono: "", email: "" },
        })
      } else {
        setErrorBusqueda(mensajeError(e))
      }
    } finally {
      setBuscando(false)
    }
  }

  const cambiarNuevo = (campo: keyof NonNullable<AcudienteFormulario["nuevo"]>, texto: string) =>
    onCambiar({ ...valor, nuevo: { ...valor.nuevo!, [campo]: texto } })

  return (
    <fieldset className="grid gap-4 rounded-2xl border border-border p-4 sm:col-span-2 sm:grid-cols-2">
      <legend className="flex w-full items-center justify-between px-1 font-condensed text-xs font-semibold uppercase tracking-wider text-text-soft">
        Acudiente {numero}
      </legend>
      {onQuitar && (
        <div className="-mt-2 flex justify-end sm:col-span-2">
          <button
            type="button"
            onClick={onQuitar}
            disabled={deshabilitado}
            className={`${claseBotonIcono} ${hoverPeligro}`}
            aria-label={`Quitar acudiente ${numero}`}
            title="Quitar"
          >
            <Icono nombre="eliminar" />
          </button>
        </div>
      )}

      {!valor.encontrada && !valor.nuevo && (
        <Campo
          id={`${prefijo}-buscar`}
          etiqueta="Documento del acudiente"
          requerido
          ancho="completo"
          error={errorBusqueda ?? errores.documentoBusqueda}
          ayuda="Si ya está registrado (por ejemplo, por un hermano) se reutilizan sus datos."
        >
          {(props) => (
            <div className="flex gap-2">
              <input
                {...props}
                value={valor.documentoBusqueda}
                onChange={(e) => onCambiar({ ...valor, documentoBusqueda: e.target.value })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    buscar()
                  }
                }}
                maxLength={20}
                autoComplete="off"
                disabled={deshabilitado || buscando}
                className={claseEntrada}
              />
              <button type="button" onClick={buscar} disabled={deshabilitado || buscando} className={claseBotonSecundario}>
                {buscando ? "Buscando…" : "Buscar"}
              </button>
            </div>
          )}
        </Campo>
      )}

      {valor.encontrada && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-surface-alt p-3 sm:col-span-2">
          <div>
            <p className="font-body text-sm font-semibold text-text">{valor.encontrada.nombre}</p>
            <p className="font-body text-xs text-text-muted">
              {valor.encontrada.tipoDocumento} {valor.encontrada.documento}
              {valor.encontrada.esAcudiente ? " · ya es acudiente" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onCambiar({ ...valor, encontrada: null, nuevo: null })}
            disabled={deshabilitado}
            className="font-condensed text-xs font-semibold uppercase tracking-wider text-accent hover:underline"
          >
            Cambiar
          </button>
        </div>
      )}

      {valor.nuevo && (
        <>
          <p className="font-body text-xs text-text-muted sm:col-span-2">
            No hay nadie registrado con ese documento: completa sus datos.{" "}
            <button
              type="button"
              onClick={() => onCambiar({ ...valor, nuevo: null })}
              className="font-semibold text-accent hover:underline"
            >
              Buscar otro
            </button>
          </p>
          <Campo id={`${prefijo}-nombre`} etiqueta="Nombre completo" requerido ancho="completo" error={errores.nombre}>
            {(props) => (
              <input {...props} value={valor.nuevo!.nombre} maxLength={100} disabled={deshabilitado}
                onChange={(e) => cambiarNuevo("nombre", e.target.value)} className={claseEntrada} />
            )}
          </Campo>
          <Campo id={`${prefijo}-tipo`} etiqueta="Tipo de documento" requerido error={errores.idTipoDocumento}>
            {(props) => (
              <select {...props} value={valor.nuevo!.idTipoDocumento} disabled={deshabilitado}
                onChange={(e) => cambiarNuevo("idTipoDocumento", e.target.value)} className={claseEntrada}>
                {tipos.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
              </select>
            )}
          </Campo>
          <Campo id={`${prefijo}-documento`} etiqueta="Número de documento" requerido error={errores.documento}>
            {(props) => (
              <input {...props} value={valor.nuevo!.documento} maxLength={20} disabled={deshabilitado}
                onChange={(e) => cambiarNuevo("documento", e.target.value)} className={claseEntrada} />
            )}
          </Campo>
          <Campo id={`${prefijo}-telefono`} etiqueta="Teléfono" requerido error={errores.telefono}>
            {(props) => (
              <input {...props} type="tel" inputMode="tel" value={valor.nuevo!.telefono} maxLength={20} disabled={deshabilitado}
                onChange={(e) => cambiarNuevo("telefono", e.target.value)} className={claseEntrada} />
            )}
          </Campo>
          <Campo id={`${prefijo}-email`} etiqueta="Correo electrónico" error={errores.email}>
            {(props) => (
              <input {...props} type="email" value={valor.nuevo!.email} maxLength={100} disabled={deshabilitado}
                onChange={(e) => cambiarNuevo("email", e.target.value)} className={claseEntrada} />
            )}
          </Campo>
        </>
      )}

      <Campo id={`${prefijo}-parentesco`} etiqueta="Parentesco" requerido error={errores.idParentesco}>
        {(props) => (
          <select {...props} value={valor.idParentesco} disabled={deshabilitado}
            onChange={(e) => onCambiar({ ...valor, idParentesco: e.target.value })} className={claseEntrada}>
            <option value="">Selecciona…</option>
            {parentescos.map((p) => <option key={p.valor} value={p.valor}>{p.etiqueta}</option>)}
          </select>
        )}
      </Campo>
    </fieldset>
  )
}
