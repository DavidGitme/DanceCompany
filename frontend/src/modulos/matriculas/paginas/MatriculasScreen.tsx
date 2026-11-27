import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useState } from "react"
import ConfirmDialog from "@/compartido/ui/ConfirmDialog"
import PantallaRecurso, { claseBotonIcono, type DefinicionRecurso, type Opcion } from "@/compartido/ui/PantallaRecurso"
import { mensajeError } from "@/compartido/api/recursos"
import {
  MATRICULA_ACTIVA,
  MATRICULA_INACTIVA,
  esPendiente,
  type MatriculaDto,
} from "../dtos/matriculaDto"
import { matriculaServicio } from "../servicios/matriculaServicio"
import InterruptorEstado from "../componentes/InterruptorEstado"
import NuevaMatricula from "../componentes/NuevaMatricula"
import RequisitosMatricula from "../componentes/RequisitosMatricula"

/*
 * Matrículas en el panel: mismo listado que los demás módulos (buscar, filtros, ver,
 * editar y paginación) más el proceso propio del módulo:
 * - «Nueva matrícula» registra al estudiante (o usa uno registrado) con su grupo.
 * - Requisitos y aprobación por fila.
 * - Interruptor para activar o inactivar (pide confirmación).
 */

interface Props {
  definicion: DefinicionRecurso<MatriculaDto>
  privilegios?: string[]
  sedeFija: number | null
  nombreSede?: string | null
  abrirCrear?: boolean
  onCrearAbierto?: () => void
  cargarCatalogo: (ruta: string) => Promise<Opcion[]>
  // Aviso de éxito o error del panel
  onAviso: (mensaje: string) => void
}

const plural = (n: number, uno: string, varios: string) => `${n} ${n === 1 ? uno : varios}`

export default function MatriculasScreen({
  definicion,
  privilegios,
  sedeFija,
  nombreSede,
  abrirCrear,
  onCrearAbierto,
  cargarCatalogo,
  onAviso,
}: Props) {
  const puedeEditar = !privilegios || privilegios.includes("editar")
  const [recargar, setRecargar] = useState(0)
  const [creando, setCreando] = useState(false)
  const [requisitosDe, setRequisitosDe] = useState<MatriculaDto | null>(null)
  const [cambio, setCambio] = useState<MatriculaDto | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [errorCambio, setErrorCambio] = useState<string | undefined>()

  const recargarLista = useCallback(() => setRecargar((n) => n + 1), [])
  const abrirNueva = useCallback(() => setCreando(true), [])

  const confirmarCambio = async () => {
    if (!cambio) return
    const inactivar = cambio.idEstado !== MATRICULA_INACTIVA
    setProcesando(true)
    setErrorCambio(undefined)
    try {
      const nueva = await matriculaServicio.cambiarEstado(cambio.idMatricula, inactivar ? MATRICULA_INACTIVA : MATRICULA_ACTIVA)
      onAviso(
        inactivar
          ? tr("La matrícula de {nombre} quedó inactiva.", { nombre: cambio.estudiante })
          : nueva.idEstado === MATRICULA_ACTIVA
            ? tr("La matrícula de {nombre} quedó activa.", { nombre: cambio.estudiante })
            : tr("La matrícula de {nombre} volvió a quedar pendiente de aprobación.", { nombre: cambio.estudiante }),
      )
      setCambio(null)
      recargarLista()
    } catch (e) {
      setErrorCambio(mensajeError(e))
    } finally {
      setProcesando(false)
    }
  }

  const textoCambio = () => {
    if (!cambio) return { titulo: "", mensaje: "", boton: "", peligro: false }
    const nombre = `${cambio.estudiante} en ${cambio.grupo}`
    if (cambio.idEstado === MATRICULA_INACTIVA) {
      return {
        titulo: tr("Activar matrícula"),
        mensaje: cambio.fecha_aprobacion
          ? tr("La matrícula de {nombre} vuelve a estar activa y ocupa otra vez un cupo del grupo.", { nombre })
          : tr("La matrícula de {nombre} ocupa otra vez un cupo y vuelve al proceso: queda pendiente de aprobación.", { nombre }),
        boton: tr("Activar"),
        peligro: false,
      }
    }
    const conMensualidades = cambio.mensualidades > 0
      ? ` ${tr("Tiene {n} registradas; se conservan.", { n: plural(cambio.mensualidades, "mensualidad", "mensualidades") })}`
      : ""
    return esPendiente(cambio)
      ? {
          titulo: tr("Cancelar el proceso"),
          mensaje: tr("Se cancela el proceso de matrícula de {nombre} y se libera su cupo. Puedes activarla de nuevo después.", { nombre }),
          boton: tr("Inactivar"),
          peligro: true,
        }
      : {
          titulo: tr("Inactivar matrícula"),
          mensaje: tr("La matrícula de {nombre} quedará inactiva y liberará su cupo. El historial se conserva y puedes activarla de nuevo.", { nombre }) + conMensualidades,
          boton: tr("Inactivar"),
          peligro: true,
        }
  }
  const datosCambio = textoCambio()

  const accionesFila = (fila: MatriculaDto) => {
    const nombre = `${fila.estudiante} en ${fila.grupo}`
    const pendiente = esPendiente(fila)
    return (
      <>
        {fila.requisitosTotal > 0 && (
          <button
            type="button"
            onClick={() => setRequisitosDe(fila)}
            className={`${claseBotonIcono} relative ${pendiente ? "text-amber-500 hover:bg-amber-500/10" : "hover:bg-emerald-500/10 hover:text-emerald-500"}`}
            aria-label={tr(pendiente ? "Requisitos y aprobación de {nombre}" : "Ver requisitos de {nombre}", { nombre })}
            title={tr(pendiente ? "Requisitos y aprobación" : "Ver requisitos")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="h-4 w-4" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.04A11.96 11.96 0 013.6 6 12 12 0 003 9.75c0 5.6 3.82 10.3 9 11.62 5.18-1.33 9-6.03 9-11.62 0-1.31-.21-2.57-.6-3.75h-.15c-3.2 0-6.1-1.25-8.25-3.29z" />
            </svg>
            {pendiente && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-surface" aria-hidden="true" />
            )}
          </button>
        )}
        {puedeEditar && (
          <InterruptorEstado
            encendido={fila.idEstado !== MATRICULA_INACTIVA}
            pendiente={pendiente}
            nombre={nombre}
            onCambiar={() => {
              setErrorCambio(undefined)
              setCambio(fila)
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <PantallaRecurso
        definicion={definicion}
        privilegios={privilegios}
        abrirCrear={abrirCrear}
        onCrearAbierto={onCrearAbierto}
        sedeFija={sedeFija}
        alCrear={abrirNueva}
        recargar={recargar}
        // Una matrícula inactiva no se edita: primero se activa con el interruptor
        puedeGestionar={(fila: MatriculaDto) => fila.idEstado !== MATRICULA_INACTIVA}
        accionesFila={accionesFila}
      />

      {creando && (
        <NuevaMatricula
          sedeFija={sedeFija}
          nombreSede={nombreSede}
          cargarCatalogo={cargarCatalogo}
          onCerrar={() => setCreando(false)}
          onCreada={(mensaje) => {
            setCreando(false)
            recargarLista()
            onAviso(mensaje)
          }}
        />
      )}

      {requisitosDe && (
        <RequisitosMatricula
          matricula={requisitosDe}
          puedeEditar={puedeEditar}
          onCerrar={() => setRequisitosDe(null)}
          onCambio={(_detalle, mensaje) => {
            recargarLista()
            if (mensaje) {
              setRequisitosDe(null)
              onAviso(mensaje)
            }
          }}
        />
      )}

      <ConfirmDialog
        open={Boolean(cambio)}
        title={datosCambio.titulo}
        message={datosCambio.mensaje}
        confirmLabel={datosCambio.boton}
        blockedMessage={errorCambio}
        tone={datosCambio.peligro ? "peligro" : "normal"}
        loading={procesando}
        onConfirm={confirmarCambio}
        onClose={() => setCambio(null)}
      />
    </>
  )
}
