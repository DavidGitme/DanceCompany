import { useEffect, useMemo, useState } from "react"
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
  errorTelefono,
  errorTipoParaEdad,
} from "./formulario"

/*
 * Inscripción presencial: el administrador registra al estudiante en la sede, con sus
 * acudientes y, si ya se definió, la matrícula en un grupo y la cuenta del portal.
 * La API guarda todo junto o nada (POST /inscripciones).
 */

const MAX_ACUDIENTES = 3
const EDAD_ADULTO = 18

interface Props {
  // Sede de la cuenta del administrador; si es null se elige en el formulario
  sedeFija: number | null
  nombreSede?: string | null
  cargarCatalogo: (ruta: string) => Promise<Opcion[]>
  onCerrar: () => void
  onInscrito: (respuesta: InscripcionRespuestaDto) => void
}

interface GrupoOpcion {
  idGrupo: number
  nombre: string
  nivel: string
  estilo: string
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
  valor_matricula: "",
  clave: "",
  confirmarClave: "",
}

export default function InscripcionEstudiante({ sedeFija, nombreSede, cargarCatalogo, onCerrar, onInscrito }: Props) {
  const [datos, setDatos] = useState({ ...datosVacios, idSede: sedeFija ? String(sedeFija) : "" })
  const [acudientes, setAcudientes] = useState<AcudienteFormulario[]>([acudienteVacio()])
  const [matricular, setMatricular] = useState(false)
  const [crearCuenta, setCrearCuenta] = useState(false)
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

  // Solo los grupos activos de la sede del estudiante
  useEffect(() => {
    if (!matricular || !datos.idSede) {
      setGrupos([])
      return
    }
    recursoApi
      .opciones<GrupoOpcion>("/grupos/disponibles", { sede: datos.idSede })
      .then(setGrupos)
      .catch(() => setGrupos([]))
  }, [matricular, datos.idSede])

  const edad = edadEn(datos.fecha_nacimiento)
  const menor = edad !== null && edad < EDAD_ADULTO
  const tipoNombre = tipos.find((t) => t.valor === datos.idTipoDocumento)?.etiqueta ?? ""
  const avisoTipo = useMemo(() => errorTipoParaEdad(tipoNombre, edad), [tipoNombre, edad])

  const cambiar = (campo: keyof typeof datosVacios, valor: string) => {
    setDatos((prev) => ({ ...prev, [campo]: valor }))
    setErrores((prev) => ({ ...prev, [campo]: "" }))
  }

  const validar = () => {
    const e: Record<string, string> = {}
    if (datos.nombre.trim().length < 2) e.nombre = "Escribe el nombre completo."
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
      const valor = Number(datos.valor_matricula)
      if (datos.valor_matricula === "" || Number.isNaN(valor) || valor < 0) e.valor_matricula = "Escribe un valor válido."
    }
    if (crearCuenta) {
      if (!datos.email) e.email = "El estudiante entra al portal con su correo: es obligatorio para crear la cuenta."
      if (datos.clave.length < 8) e.clave = "Mínimo 8 caracteres."
      else if (datos.clave !== datos.confirmarClave) e.confirmarClave = "Las claves no coinciden."
    }

    const porAcudiente: Record<number, Record<string, string>> = {}
    // Un adulto puede no tener acudiente: los bloques vacíos se ignoran
    const conDatos = acudientes.filter((a) => menor || a.encontrada || a.nuevo || a.idParentesco)
    conDatos.forEach((a) => {
      const errorA = validarAcudiente(a, tipos)
      if (Object.keys(errorA).length) porAcudiente[a.clave] = errorA
    })
    if (menor && conDatos.length === 0) e.acudientes = "Un estudiante menor de edad necesita al menos un acudiente."

    setErrores(e)
    setErroresAcudientes(porAcudiente)
    return { valido: !Object.keys(e).length && !Object.keys(porAcudiente).length, conDatos }
  }

  const enviar = async () => {
    setErrorGeneral(null)
    const { valido, conDatos } = validar()
    if (!valido) {
      setErrorGeneral("Revisa los campos marcados.")
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
      ...(matricular ? { idGrupo: Number(datos.idGrupo), valor_matricula: Number(datos.valor_matricula) } : {}),
      ...(crearCuenta ? { clave: datos.clave } : {}),
    }
    setGuardando(true)
    try {
      onInscrito(await inscripcionServicio.inscribir(solicitud))
    } catch (e) {
      const campos = erroresDeCampo(e)
      setErrores(campos)
      setErrorGeneral(Object.keys(campos).length ? "Revisa los campos marcados." : mensajeError(e))
    } finally {
      setGuardando(false)
    }
  }

  return (
    <Dialogo
      antetitulo={nombreSede ? `Sede ${nombreSede}` : "Estudiantes"}
      titulo="Inscribir estudiante"
      ocupado={guardando}
      onCerrar={onCerrar}
      onEnviar={enviar}
      pie={
        <>
          <button type="button" onClick={onCerrar} disabled={guardando} className={claseBotonSecundario}>Cancelar</button>
          <button type="submit" disabled={guardando} aria-busy={guardando} className={claseBotonPrincipal}>
            {guardando ? "Inscribiendo…" : "Inscribir estudiante"}
          </button>
        </>
      }
    >
      <MensajeError mensaje={errorGeneral} />
      <p className="mb-4 font-body text-xs text-text-muted">
        La inscripción es presencial. Los campos con <span className="text-red-500" aria-hidden="true">*</span>
        <span className="sr-only">asterisco</span> son obligatorios.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Seccion>Datos del estudiante</Seccion>
        <Campo id="insc-nombre" etiqueta="Nombre completo" requerido ancho="completo" error={errores.nombre}>
          {(p) => <input {...p} value={datos.nombre} maxLength={100} disabled={guardando} onChange={(e) => cambiar("nombre", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-nacimiento" etiqueta="Fecha de nacimiento" requerido error={errores.fecha_nacimiento}
          ayuda={edad !== null && edad >= 0 ? `${edad} años${menor ? " · menor de edad" : ""}` : undefined}>
          {(p) => <input {...p} type="date" value={datos.fecha_nacimiento} disabled={guardando} onChange={(e) => cambiar("fecha_nacimiento", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-tipo" etiqueta="Tipo de documento" requerido error={errores.idTipoDocumento}
          ayuda="Registro civil hasta los 6 años, tarjeta de identidad de 7 a 17 y cédula desde los 18.">
          {(p) => (
            <select {...p} value={datos.idTipoDocumento} disabled={guardando} onChange={(e) => cambiar("idTipoDocumento", e.target.value)} className={claseEntrada}>
              {tipos.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
            </select>
          )}
        </Campo>
        <Campo id="insc-documento" etiqueta="Número de documento" requerido error={errores.documento}>
          {(p) => <input {...p} value={datos.documento} maxLength={20} autoComplete="off" disabled={guardando} onChange={(e) => cambiar("documento", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-telefono" etiqueta="Teléfono" requerido error={errores.telefono}>
          {(p) => <input {...p} type="tel" inputMode="tel" value={datos.telefono} maxLength={20} disabled={guardando} onChange={(e) => cambiar("telefono", e.target.value)} className={claseEntrada} />}
        </Campo>
        <Campo id="insc-email" etiqueta="Correo electrónico" requerido={crearCuenta} error={errores.email}>
          {(p) => <input {...p} type="email" value={datos.email} maxLength={100} disabled={guardando} onChange={(e) => cambiar("email", e.target.value)} className={claseEntrada} />}
        </Campo>
        {!sedeFija && (
          <Campo id="insc-sede" etiqueta="Sede" requerido error={errores.idSede}>
            {(p) => (
              <select {...p} value={datos.idSede} disabled={guardando} onChange={(e) => { cambiar("idSede", e.target.value); cambiar("idGrupo", "") }} className={claseEntrada}>
                <option value="">Selecciona…</option>
                {sedes.map((s) => <option key={s.valor} value={s.valor}>{s.etiqueta}</option>)}
              </select>
            )}
          </Campo>
        )}

        <Seccion>Acudientes {menor ? "(obligatorio para menores de edad)" : "(opcional)"}</Seccion>
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
            onQuitar={acudientes.length > 1 ? () => setAcudientes((prev) => prev.filter((x) => x.clave !== a.clave)) : undefined}
          />
        ))}
        {acudientes.length < MAX_ACUDIENTES && (
          <button type="button" disabled={guardando} onClick={() => setAcudientes((prev) => [...prev, acudienteVacio()])}
            className={`${claseBotonSecundario} sm:col-span-2`}>
            Agregar otro acudiente
          </button>
        )}

        <Seccion>Matrícula y acceso</Seccion>
        <label className="flex items-center gap-3 font-body text-sm text-text sm:col-span-2">
          <input type="checkbox" checked={matricular} disabled={guardando} onChange={(e) => setMatricular(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Matricular ahora en un grupo
        </label>
        {matricular && (
          <>
            <Campo id="insc-grupo" etiqueta="Grupo" requerido error={errores.idGrupo}
              ayuda="Se validan el cupo y la edad del nivel al guardar.">
              {(p) => (
                <select {...p} value={datos.idGrupo} disabled={guardando || !datos.idSede} onChange={(e) => cambiar("idGrupo", e.target.value)} className={claseEntrada}>
                  <option value="">{datos.idSede ? "Selecciona…" : "Primero elige la sede"}</option>
                  {grupos.map((g) => <option key={g.idGrupo} value={g.idGrupo}>{g.nombre} · {g.nivel} · {g.estilo}</option>)}
                </select>
              )}
            </Campo>
            <Campo id="insc-valor" etiqueta="Valor de la matrícula" requerido error={errores.valor_matricula}>
              {(p) => <input {...p} type="number" inputMode="numeric" min={0} value={datos.valor_matricula} disabled={guardando} onChange={(e) => cambiar("valor_matricula", e.target.value)} className={claseEntrada} />}
            </Campo>
          </>
        )}
        <label className="flex items-center gap-3 font-body text-sm text-text sm:col-span-2">
          <input type="checkbox" checked={crearCuenta} disabled={guardando} onChange={(e) => setCrearCuenta(e.target.checked)} className="h-4 w-4 accent-[var(--color-accent)]" />
          Crear la cuenta del portal del estudiante
        </label>
        {crearCuenta && (
          <>
            <Campo id="insc-clave" etiqueta="Clave inicial" requerido error={errores.clave} ayuda="Entrégala al estudiante; inicia sesión con su correo.">
              {(p) => <input {...p} type="password" autoComplete="new-password" value={datos.clave} maxLength={128} disabled={guardando} onChange={(e) => cambiar("clave", e.target.value)} className={claseEntrada} />}
            </Campo>
            <Campo id="insc-clave2" etiqueta="Confirmar clave" requerido error={errores.confirmarClave}>
              {(p) => <input {...p} type="password" autoComplete="new-password" value={datos.confirmarClave} maxLength={128} disabled={guardando} onChange={(e) => cambiar("confirmarClave", e.target.value)} className={claseEntrada} />}
            </Campo>
          </>
        )}
      </div>
    </Dialogo>
  )
}
