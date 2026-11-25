/*
 * BORRADOR PARA REVISIÓN — no es un texto legal aprobado.
 * Lo redactó el equipo de desarrollo como punto de partida a partir de la Ley 1581 de 2012
 * (protección de datos personales) y el Decreto 1377 de 2013 de Colombia. Antes de publicarlo
 * como definitivo debe revisarlo y aprobarlo la academia (y, si es posible, un abogado).
 *
 * Al cambiar el texto hay que subir TERMINOS_VERSION aquí y en backend/app/dominio/reglas.py:
 * así cada cuenta vuelve a aceptarlo en su siguiente inicio de sesión.
 */

export const TERMINOS_VERSION = "2026-11"
export const ES_BORRADOR = true

export interface SeccionLegal {
  titulo: string
  parrafos: string[]
}

export const TERMINOS: SeccionLegal[] = [
  {
    titulo: "1. Quiénes somos",
    parrafos: [
      "F&A Dance Company es una academia de baile con sedes en Bello y Copacabana (Antioquia). Esta plataforma sirve para gestionar inscripciones, grupos, horarios, pagos y la comunicación con estudiantes, acudientes e instructores.",
    ],
  },
  {
    titulo: "2. Uso de la cuenta",
    parrafos: [
      "Tu usuario es tu número de documento. La contraseña es personal: no la compartas. Si crees que alguien más la conoce, cámbiala con \"¿Olvidaste tu contraseña?\".",
      "Solo puedes usar la plataforma para lo que corresponde a tu rol (administración, instructor, estudiante o acudiente).",
    ],
  },
  {
    titulo: "3. Datos personales que tratamos",
    parrafos: [
      "Nombre, tipo y número de documento, fecha de nacimiento, teléfono, correo electrónico, sede, grupos, matrículas, pagos y, en el caso de menores de edad, los datos de su acudiente.",
      "Los usamos para inscribir, organizar las clases, registrar pagos, enviar comunicaciones de la academia y cumplir obligaciones legales. No los vendemos ni los compartimos con terceros con fines comerciales.",
    ],
  },
  {
    titulo: "4. Menores de edad",
    parrafos: [
      "Los datos de menores se tratan respetando su interés superior. La inscripción la hace la sede de forma presencial con el acudiente.",
    ],
  },
  {
    titulo: "5. Tus derechos",
    parrafos: [
      "Puedes conocer, actualizar y rectificar tus datos, pedir prueba de esta autorización, solicitar que se eliminen cuando no exista un deber legal de conservarlos y revocar la autorización. Para hacerlo, comunícate con la sede donde estás inscrito.",
    ],
  },
  {
    titulo: "6. Seguridad",
    parrafos: [
      "Las contraseñas se guardan cifradas (Argon2) y la información viaja cifrada (HTTPS). Cada rol solo ve los módulos y la sede que le corresponden.",
    ],
  },
  {
    titulo: "7. Cambios",
    parrafos: [
      "Si estos términos cambian, te pediremos aceptarlos de nuevo al iniciar sesión.",
    ],
  },
]

export const COOKIES: SeccionLegal[] = [
  {
    titulo: "Cookies que usamos",
    parrafos: [
      "Solo usamos una cookie técnica necesaria: refresh_token, que mantiene tu sesión abierta de forma segura (HttpOnly, sin acceso desde JavaScript) y dura como máximo 7 días.",
      "También guardamos en tu navegador que ya viste este aviso. No usamos cookies de publicidad ni de analítica.",
    ],
  },
]
