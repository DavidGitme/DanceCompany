import { clienteHttp } from "@/nucleo/http/clienteHttp"
import { env } from "@/nucleo/config/env"
import {
  estudiantesInstructorMock,
  gruposInstructorMock,
  instructorMock,
  type EstudianteInstructor,
  type GrupoInstructor,
  type PerfilInstructor,
} from "../datos/instructorMock"

export interface DatosPortalInstructor {
  instructor: PerfilInstructor
  grupos: GrupoInstructor[]
  estudiantes: EstudianteInstructor[]
}

// El backend identifica al instructor por el token; no se envía ningún id
export const portalInstructorServicio = {
  async cargar(): Promise<DatosPortalInstructor> {
    if (env.usarMock) {
      return {
        instructor: instructorMock,
        grupos: gruposInstructorMock,
        estudiantes: estudiantesInstructorMock,
      }
    }
    const [instructor, grupos, estudiantes] = await Promise.all([
      clienteHttp.get<PerfilInstructor>("/portal-instructor/perfil"),
      clienteHttp.get<GrupoInstructor[]>("/portal-instructor/grupos"),
      clienteHttp.get<EstudianteInstructor[]>("/portal-instructor/estudiantes"),
    ])
    return { instructor, grupos, estudiantes }
  },

  /** Guarda el correo y el teléfono del instructor que inició sesión (persona.email y persona.telefono). */
  async actualizarContacto(correo: string, telefono: string): Promise<PerfilInstructor> {
    if (env.usarMock) {
      return { ...instructorMock, correo, telefono }
    }
    return clienteHttp.put<PerfilInstructor>("/portal-instructor/perfil", { correo, telefono })
  },

  /** Cambia la contraseña; el backend verifica la actual antes de guardar la nueva. */
  async cambiarClave(actual: string, nueva: string): Promise<void> {
    if (env.usarMock) return
    await clienteHttp.put<void>("/portal-instructor/clave", { actual, nueva })
  },
}
