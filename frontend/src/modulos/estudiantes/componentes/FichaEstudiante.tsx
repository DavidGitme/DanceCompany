import { useCallback, useEffect, useState } from "react"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import type { Opcion } from "@/compartido/ui/PantallaRecurso"
import { Icono, claseBotonIcono, claseBotonPrincipal, claseBotonSecundario, hoverPeligro } from "@/compartido/ui/PantallaRecurso"
import { mensajeError } from "@/compartido/api/recursos"
import type { AcudienteDto } from "../dtos/inscripcionDto"
import { inscripcionServicio } from "../servicios/inscripcionServicio"
import CamposAcudiente, { acudienteASolicitud, acudienteVacio, validarAcudiente } from "./CamposAcudiente"
import { Dialogo, MensajeError, Seccion, edadEn } from "./formulario"

/*
 * Ficha del estudiante ("Ver"): datos, grupos y acudientes. Es la única tarea del panel
 * que no cubre el formulario de edición: agregar o quitar acudientes.
 */

export interface EstudianteFicha {
  idEstudiante: number
  nombre: string
  tipoDocumento: string
  documento: string | null
  telefono: string | null
  email: string | null
  fecha_nacimiento: string | null
  sede: string
  estado: string
  grupos: { idGrupo: number; nombre: string }[]
}

interface Props {
  estudiante: EstudianteFicha
  cargarCatalogo: (ruta: string) => Promise<Opcion[]>
  onCerrar: () => void
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-condensed text-[11px] uppercase tracking-wider text-text-muted">{etiqueta}</dt>
      <dd className="truncate font-body text-sm text-text">{valor}</dd>
    </div>
  )
}

export default function FichaEstudiante({ estudiante, cargarCatalogo, onCerrar }: Props) {
  const [acudientes, setAcudientes] = useState<AcudienteDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tipos, setTipos] = useState<Opcion[]>([])
  const [parentescos, setParentescos] = useState<Opcion[]>([])
  const [nuevo, setNuevo] = useState<ReturnType<typeof acudienteVacio> | null>(null)
  const [erroresNuevo, setErroresNuevo] = useState<Record<string, string>>({})
  const [porQuitar, setPorQuitar] = useState<AcudienteDto | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const edad = edadEn(estudiante.fecha_nacimiento ?? "")
  const menor = edad !== null && edad < 18

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setAcudientes(await inscripcionServicio.acudientes(estudiante.idEstudiante))
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setCargando(false)
    }
  }, [estudiante.idEstudiante])

  useEffect(() => {
    cargar()
    cargarCatalogo("/catalogos/tipos-documento").then(setTipos).catch(() => setTipos([]))
    cargarCatalogo("/catalogos/parentescos").then(setParentescos).catch(() => setParentescos([]))
  }, [cargar, cargarCatalogo])

  const guardarNuevo = async () => {
    if (!nuevo) return
    const errores = validarAcudiente(nuevo, tipos)
    setErroresNuevo(errores)
    if (Object.keys(errores).length) return
    setOcupado(true)
    try {
      setAcudientes(await inscripcionServicio.agregarAcudiente(estudiante.idEstudiante, acudienteASolicitud(nuevo)))
      setNuevo(null)
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
    } finally {
      setOcupado(false)
    }
  }

  const quitar = async () => {
    if (!porQuitar) return
    setOcupado(true)
    try {
      setAcudientes(await inscripcionServicio.quitarAcudiente(estudiante.idEstudiante, porQuitar.idAcudiente))
      setPorQuitar(null)
      setError(null)
    } catch (e) {
      setError(mensajeError(e))
      setPorQuitar(null)
    } finally {
      setOcupado(false)
    }
  }

  // El último acudiente de un menor no se puede quitar (la API también lo impide)
  const bloqueoQuitar = menor && acudientes.length <= 1
    ? "Un estudiante menor de edad debe conservar al menos un acudiente. Agrega otro antes de quitar este."
    : undefined

  return (
    <>
      <Dialogo
        antetitulo={`Estudiante · ${estudiante.sede}`}
        titulo={estudiante.nombre}
        ocupado={ocupado}
        onCerrar={onCerrar}
        pie={<button type="button" onClick={onCerrar} disabled={ocupado} className={claseBotonSecundario}>Cerrar</button>}
      >
        <MensajeError mensaje={error} />
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
          <Dato etiqueta="Documento" valor={`${estudiante.tipoDocumento} ${estudiante.documento ?? "—"}`} />
          <Dato etiqueta="Edad" valor={edad !== null ? `${edad} años` : "Sin fecha de nacimiento"} />
          <Dato etiqueta="Estado" valor={estudiante.estado} />
          <Dato etiqueta="Teléfono" valor={estudiante.telefono ?? "—"} />
          <Dato etiqueta="Correo" valor={estudiante.email ?? "—"} />
          <Dato etiqueta="Grupos" valor={estudiante.grupos.map((g) => g.nombre).join(", ") || "Sin matrícula"} />
        </dl>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Seccion>Acudientes</Seccion>
          {cargando ? (
            <p className="font-body text-sm text-text-muted sm:col-span-2">Cargando acudientes…</p>
          ) : acudientes.length === 0 ? (
            <p className="font-body text-sm text-text-muted sm:col-span-2">
              Sin acudientes registrados{menor ? ": como es menor de edad, agrega al menos uno." : "."}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-2xl border border-border sm:col-span-2">
              {acudientes.map((a) => (
                <li key={a.idAcudiente} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="font-body text-sm font-semibold text-text">{a.nombre} <span className="font-normal text-text-muted">· {a.parentesco}</span></p>
                    <p className="truncate font-body text-xs text-text-muted">
                      {a.tipoDocumento} {a.documento}{a.telefono ? ` · ${a.telefono}` : ""}{a.email ? ` · ${a.email}` : ""}
                    </p>
                  </div>
                  <button type="button" onClick={() => setPorQuitar(a)} disabled={ocupado}
                    className={`${claseBotonIcono} ${hoverPeligro}`} aria-label={`Quitar a ${a.nombre} como acudiente`} title="Quitar acudiente">
                    <Icono nombre="eliminar" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {nuevo ? (
            <>
              <CamposAcudiente
                valor={nuevo}
                numero={acudientes.length + 1}
                tipos={tipos}
                parentescos={parentescos}
                errores={erroresNuevo}
                deshabilitado={ocupado}
                onCambiar={(valor) => {
                  setNuevo(valor)
                  setErroresNuevo({})
                }}
              />
              <div className="flex justify-end gap-3 sm:col-span-2">
                <button type="button" onClick={() => setNuevo(null)} disabled={ocupado} className={claseBotonSecundario}>Cancelar</button>
                <button type="button" onClick={guardarNuevo} disabled={ocupado} className={claseBotonPrincipal}>
                  {ocupado ? "Guardando…" : "Guardar acudiente"}
                </button>
              </div>
            </>
          ) : (
            acudientes.length < 3 && (
              <button type="button" onClick={() => { setNuevo(acudienteVacio()); setErroresNuevo({}) }} disabled={ocupado || cargando}
                className={`${claseBotonSecundario} sm:col-span-2`}>
                Agregar acudiente
              </button>
            )
          )}
        </div>
      </Dialogo>

      <ConfirmDialog
        open={Boolean(porQuitar)}
        title="Quitar acudiente"
        message={porQuitar ? `${porQuitar.nombre} dejará de ser acudiente de ${estudiante.nombre}. Sus pagos anteriores se conservan.` : ""}
        confirmLabel="Quitar"
        blockedMessage={bloqueoQuitar}
        tone="peligro"
        loading={ocupado}
        onConfirm={quitar}
        onClose={() => setPorQuitar(null)}
      />
    </>
  )
}
