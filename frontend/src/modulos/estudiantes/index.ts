export { default as InscripcionEstudiante } from "./componentes/InscripcionEstudiante"
export { default as FichaEstudiante, type EstudianteFicha } from "./componentes/FichaEstudiante"
export { default as EdicionEstudiante, type EstudianteEdicion } from "./componentes/EdicionEstudiante"
export type { InscripcionRespuestaDto } from "./dtos/inscripcionDto"
// Piezas de formulario que reutiliza el módulo de matrículas (mismo estilo del panel)
export {
  Campo,
  Dialogo,
  MensajeError,
  Seccion,
  edadEn,
  VALOR_MATRICULA,
  textoValorMatricula,
} from "./componentes/formulario"
