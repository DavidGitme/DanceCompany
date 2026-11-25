import type { Accion, UsuarioSesion } from "@/modulos/autenticacion/dtos/autenticacionDto"

const esAdministrador = (usuario: UsuarioSesion) => usuario.roles.includes("administrador")

// El rol tiene el módulo (al menos puede verlo)
export function requierePermiso(
  usuario: UsuarioSesion | null,
  permiso: string,
): boolean {
  return Boolean(
    usuario &&
      (esAdministrador(usuario) ||
        usuario.permisos.includes(permiso)),
  )
}

/*
 * Privilegio de un rol en un módulo (nivel 3): ver, crear, editar o eliminar.
 * Solo decide qué botones se muestran; el backend vuelve a validar cada acción.
 */
export function puede(usuario: UsuarioSesion | null, modulo: string, accion: Accion): boolean {
  if (!usuario) return false
  if (esAdministrador(usuario)) return true
  return usuario.privilegios[modulo]?.includes(accion) ?? false
}

// Módulos que la cuenta puede ver en el panel administrativo
export function tieneModulosDelPanel(usuario: UsuarioSesion | null): boolean {
  if (!usuario) return false
  return esAdministrador(usuario) || Object.values(usuario.privilegios).some((acciones) => acciones.includes("ver"))
}
