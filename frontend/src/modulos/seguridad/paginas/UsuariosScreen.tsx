import { tr } from "@/nucleo/i18n/IdiomaContext"
import { useEffect, useMemo, useState } from "react"
import PantallaRecurso from "@/compartido/ui/PantallaRecurso"
import { mensajeError } from "@/compartido/api/recursos"
import { definicionUsuarios, rolesApi, type RolApi } from "@/app/admin/recursos"
import { useAuth } from "@/nucleo/auth/useAuth"

/*
 * Cuentas de acceso con el mismo encabezado, buscador, filtros y paginador que los demás
 * listados. «Ver» es de solo lectura; el estado y los roles se cambian en «Editar».
 */
export default function UsuariosScreen({ privilegios }: { privilegios?: string[] }) {
  const { usuario } = useAuth()
  const sedeFija = usuario?.idSede ?? null
  const [roles, setRoles] = useState<RolApi[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    rolesApi(true).then(setRoles).catch((e) => setError(mensajeError(e)))
  }, [])

  const definicion = useMemo(() => (roles ? definicionUsuarios(roles, sedeFija) : null), [roles, sedeFija])

  if (error) {
    return (
      <p role="alert" className="rounded-2xl border border-red-400/30 bg-red-400/10 p-4 font-body text-sm text-red-600 dark:text-red-300">
        {error}
      </p>
    )
  }
  if (!definicion) {
    return (
      <div className="flex flex-col gap-3" aria-label={tr("Cargando")}>
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="esqueleto h-11 rounded-xl" />)}
      </div>
    )
  }
  return (
    <PantallaRecurso
      definicion={definicion}
      privilegios={privilegios}
      antesDeLista={
        <p className="rounded-2xl border border-border bg-surface px-4 py-3 font-body text-xs text-text-soft">
          {tr("Las cuentas de instructores se crean en Gestión humana > Instructores con «Invitar»; las de estudiantes, al inscribirlos.")}
        </p>
      }
    />
  )
}
