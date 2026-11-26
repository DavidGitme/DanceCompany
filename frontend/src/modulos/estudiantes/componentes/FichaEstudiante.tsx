import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useCallback, useEffect, useState } from "react"
import { claseBotonPrincipal, claseBotonSecundario } from "@/compartido/ui/PantallaRecurso"
import { mensajeError } from "@/compartido/api/recursos"
import type { AcudienteDto } from "../dtos/inscripcionDto"
import { inscripcionServicio } from "../servicios/inscripcionServicio"
import { Dialogo, MensajeError, Seccion, edadEn, esMenorDeEdad } from "./formulario"

/*
 * Ficha del estudiante ("Ver"): solo lectura. Datos, grupos y acudiente.
 * Cualquier cambio (también del acudiente) se hace desde "Editar".
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
  onCerrar: () => void
  // Abre la edición (si el rol puede editar)
  onEditar?: () => void
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="min-w-0">
      <dt className="font-condensed text-[11px] uppercase tracking-wider text-text-muted">{tr(etiqueta)}</dt>
      <dd className="truncate font-body text-sm text-text">{valor}</dd>
    </div>
  )
}

export default function FichaEstudiante({ estudiante, onCerrar, onEditar }: Props) {
  const [acudientes, setAcudientes] = useState<AcudienteDto[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const edad = edadEn(estudiante.fecha_nacimiento ?? "")
  const menor = esMenorDeEdad(estudiante.fecha_nacimiento)

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
  }, [cargar])

  return (
    <Dialogo
      antetitulo={`Estudiante · ${estudiante.sede}`}
      titulo={estudiante.nombre}
      onCerrar={onCerrar}
      pie={
        <>
          <button type="button" onClick={onCerrar} className={claseBotonSecundario}>{tr("Cerrar")}</button>
          {onEditar && (
            <button type="button" onClick={onEditar} className={claseBotonPrincipal}>{tr("Editar")}</button>
          )}
        </>
      }
    >
      <MensajeError mensaje={error} />
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
        <Dato etiqueta="Documento" valor={`${estudiante.tipoDocumento} ${estudiante.documento ?? "—"}`} />
        <Dato etiqueta="Edad" valor={edad !== null ? tr("{edad} años", { edad }) : tr("Sin fecha de nacimiento")} />
        <Dato etiqueta="Estado" valor={tr(estudiante.estado)} />
        <Dato etiqueta="Teléfono" valor={estudiante.telefono ?? "—"} />
        <Dato etiqueta="Correo" valor={estudiante.email ?? "—"} />
        <Dato etiqueta="Grupos" valor={estudiante.grupos.map((g) => g.nombre).join(", ") || tr("Sin matrícula")} />
      </dl>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <Seccion>{tr("Acudiente")}</Seccion>
        {cargando ? (
          <p className="font-body text-sm text-text-muted sm:col-span-2">{tr("Cargando acudientes…")}</p>
        ) : acudientes.length === 0 ? (
          <p className="font-body text-sm text-text-muted sm:col-span-2">
            {menor
              ? tr("Sin acudiente registrado. Es menor de edad: agrégalo desde Editar.")
              : tr("Sin acudiente registrado.")}
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-2xl border border-border sm:col-span-2">
            {acudientes.map((a) => (
              <li key={a.idAcudiente} className="p-3">
                <p className="font-body text-sm font-semibold text-text">{a.nombre} <span className="font-normal text-text-muted">· {a.parentesco}</span></p>
                <p className="truncate font-body text-xs text-text-muted">
                  {a.tipoDocumento} {a.documento}{a.telefono ? ` · ${a.telefono}` : ""}{a.email ? ` · ${a.email}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Dialogo>
  )
}
