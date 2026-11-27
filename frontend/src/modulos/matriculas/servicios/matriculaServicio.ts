import { clienteHttp } from "@/nucleo/http/clienteHttp"
import type {
  EstadoMatriculaDto,
  EstudianteParaMatriculaDto,
  GrupoParaMatriculaDto,
  MatriculaDetalleDto,
  MatriculaDto,
  MatriculaSolicitudDto,
  RequisitoMatriculaDto,
} from "../dtos/matriculaDto"

const conSede = (ruta: string, sede?: number | string | null) =>
  sede ? `${ruta}?sede=${encodeURIComponent(String(sede))}` : ruta

// Panel del administrador (privilegios del módulo «matriculas»)
export const matriculaServicio = {
  estados: () => clienteHttp.get<EstadoMatriculaDto[]>("/matriculas/estados"),
  requisitos: () => clienteHttp.get<RequisitoMatriculaDto[]>("/matriculas/requisitos"),
  estudiantes: (sede?: number | string | null) =>
    clienteHttp.get<EstudianteParaMatriculaDto[]>(conSede("/matriculas/opciones/estudiantes", sede)),
  grupos: (sede?: number | string | null) =>
    clienteHttp.get<GrupoParaMatriculaDto[]>(conSede("/matriculas/opciones/grupos", sede)),
  crear: (solicitud: MatriculaSolicitudDto) => clienteHttp.post<MatriculaDto>("/matriculas", solicitud),
  cambiarEstado: (id: number, idEstado: number) =>
    clienteHttp.patch<MatriculaDto>(`/matriculas/${id}/estado`, { idEstado }),
  detalle: (id: number) => clienteHttp.get<MatriculaDetalleDto>(`/matriculas/${id}/requisitos`),
  marcarRequisito: (id: number, idRequisito: number, cumplido: boolean) =>
    clienteHttp.put<MatriculaDetalleDto>(`/matriculas/${id}/requisitos/${idRequisito}`, { cumplido }),
  aprobar: (id: number) => clienteHttp.put<MatriculaDetalleDto>(`/matriculas/${id}/aprobacion`, {}),
}

// Portal del instructor: solo las matrículas pendientes de sus grupos
export const matriculaInstructorServicio = {
  pendientes: () => clienteHttp.get<MatriculaDetalleDto[]>("/portal-instructor/matriculas"),
  marcarRequisito: (id: number, idRequisito: number, cumplido: boolean) =>
    clienteHttp.put<MatriculaDetalleDto>(`/portal-instructor/matriculas/${id}/requisitos/${idRequisito}`, { cumplido }),
  aprobar: (id: number) => clienteHttp.put<MatriculaDetalleDto>(`/portal-instructor/matriculas/${id}/aprobacion`, {}),
}
