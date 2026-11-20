import { clienteHttp } from "@/nucleo/http/clienteHttp"
import {
  clasesAModelo,
  convocatoriasAModelo,
  finanzasAModelo,
  noticiaAModelo,
  talleresAModelo,
  type ClasesDto,
  type ConvocatoriasDto,
  type FinanzasDto,
  type NoticiaPublicaDto,
  type PerfilDto,
  type TalleresDto,
} from "../dtos/portalEstudianteDto"

const BASE = "/portal-estudiante"

export const portalEstudianteServicio = {
  perfil: () => clienteHttp.get<PerfilDto>(`${BASE}/perfil`),
  clases: async () => clasesAModelo(await clienteHttp.get<ClasesDto>(`${BASE}/clases`)),
  finanzas: async () => finanzasAModelo(await clienteHttp.get<FinanzasDto>(`${BASE}/finanzas`)),
  talleres: async () => talleresAModelo(await clienteHttp.get<TalleresDto>(`${BASE}/talleres`)),
  convocatorias: async () =>
    convocatoriasAModelo(await clienteHttp.get<ConvocatoriasDto>(`${BASE}/convocatorias`)),
  noticias: async () =>
    (await clienteHttp.get<NoticiaPublicaDto[]>("/noticias/publicas?limite=12")).map(noticiaAModelo),
  postularse: (idConvocatoria: number) =>
    clienteHttp.post<unknown>(`${BASE}/convocatorias/${idConvocatoria}/postulacion`),
}
