import { clienteHttp } from "@/nucleo/http/clienteHttp"
import type {
  AcudienteDto,
  AcudienteSolicitudDto,
  InscripcionRespuestaDto,
  InscripcionSolicitudDto,
  PersonaEncontradaDto,
} from "../dtos/inscripcionDto"

export const inscripcionServicio = {
  inscribir: (solicitud: InscripcionSolicitudDto) =>
    clienteHttp.post<InscripcionRespuestaDto>("/inscripciones", solicitud),

  // 404 si no hay nadie con ese documento
  buscarPersona: (documento: string) =>
    clienteHttp.get<PersonaEncontradaDto>(
      `/inscripciones/personas?documento=${encodeURIComponent(documento.trim())}`,
    ),

  acudientes: (idEstudiante: number) =>
    clienteHttp.get<AcudienteDto[]>(`/estudiantes/${idEstudiante}/acudientes`),

  agregarAcudiente: (idEstudiante: number, acudiente: AcudienteSolicitudDto) =>
    clienteHttp.post<AcudienteDto[]>(`/estudiantes/${idEstudiante}/acudientes`, acudiente),

  quitarAcudiente: (idEstudiante: number, idAcudiente: number) =>
    clienteHttp.delete<AcudienteDto[]>(`/estudiantes/${idEstudiante}/acudientes/${idAcudiente}`),
}
