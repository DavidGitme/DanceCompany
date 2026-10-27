export interface Estado {
  idEstado: number
  nombre: string
  categoria: string
  descripcion: string
}

export interface Persona {
  idPersona: number
  nombre: string
  documento: string
  telefono: string
  email: string
  fecha_nacimiento: string
  idEstado: number
}

export interface Usuario {
  documento: string
  username: string
  idEstado: number
  roles: number[]
}

export interface Rol {
  idRol: number
  nombre: string
  idEstado: number
  permisos: number[]
}

export interface Permiso {
  idPermiso: number
  descripcion: string
}

export interface RespuestaLista<T> {
  datos: T[]
  total: number
  pagina: number
  tamano: number
}
