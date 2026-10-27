import type { UsuarioSesion } from "@/modulos/autenticacion/dtos/autenticacionDto"

export function requierePermiso(
  usuario: UsuarioSesion | null,
  permiso: string,
): boolean {
  return Boolean(
    usuario &&
      (usuario.roles.includes("administrador") ||
        usuario.permisos.includes(permiso)),
  )
}
