import type {
  Estado,
  Permiso,
  Persona,
  Rol,
  Usuario,
} from "@/compartido/tipos/entities"

export type EstadoRespuestaDto = Estado
export type PersonaRespuestaDto = Persona
export type RolRespuestaDto = Rol
export type PermisoRespuestaDto = Permiso
export type UsuarioRespuestaDto = Usuario

export type PersonaCrearSolicitudDto = Omit<Persona, "idPersona">
export type RolCrearSolicitudDto = Omit<Rol, "idRol">
export type PermisoCrearSolicitudDto = Omit<Permiso, "idPermiso">
export type UsuarioCrearSolicitudDto = Usuario & { clave: string }

export const dtoAModelo = <T extends object>(dto: T): T => ({ ...dto })
export const modeloADto = <T extends object>(modelo: T): T => ({ ...modelo })
