export interface InicioSesionSolicitudDto {
  documento: string
  clave: string
}

export interface UsuarioSesionDto {
  documento: string
  nombre: string
  roles: string[]
  permisos: string[]
  // Sede que administra la cuenta (un administrador por sede); null sin restricción
  idSede?: number | null
  sede?: string | null
}

export interface TokenRespuestaDto {
  accessToken: string
  tipo: "bearer"
  expiraEn: number
  usuario: UsuarioSesionDto
}

export interface UsuarioSesion {
  documento: string
  nombre: string
  roles: string[]
  permisos: string[]
  idSede: number | null
  sede: string | null
}

export interface Sesion {
  tokenAcceso: string
  expiraEn: number
  usuario: UsuarioSesion
}

export const dtoAModelo = (dto: TokenRespuestaDto): Sesion => ({
  tokenAcceso: dto.accessToken,
  expiraEn: dto.expiraEn,
  usuario: {
    documento: dto.usuario.documento,
    nombre: dto.usuario.nombre,
    roles: [...dto.usuario.roles],
    permisos: [...dto.usuario.permisos],
    idSede: dto.usuario.idSede ?? null,
    sede: dto.usuario.sede ?? null,
  },
})
