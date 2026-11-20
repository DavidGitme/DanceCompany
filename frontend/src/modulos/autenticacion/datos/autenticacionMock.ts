import type { TokenRespuestaDto } from "../dtos/autenticacionDto"

export const sesionAdministradorMock: TokenRespuestaDto = {
  accessToken: "token-mock-en-memoria",
  tipo: "bearer",
  expiraEn: 1800,
  usuario: {
    documento: "1234567890",
    nombre: "Andrea Salazar",
    roles: ["administrador"],
    permisos: [
      "dashboard",
      "estudiantes",
      "instructores",
      "grupos",
      "matriculas",
      "pagos",
      "talleres",
      "sedes",
      "reportes",
      "landing",
      "seguridad",
    ],
  },
}

// Con VITE_USAR_MOCK=true, iniciar sesión con este documento abre el portal del instructor
export const sesionInstructorMock: TokenRespuestaDto = {
  accessToken: "token-mock-instructor",
  tipo: "bearer",
  expiraEn: 1800,
  usuario: {
    documento: "1122334455",
    nombre: "Carlos Vélez",
    roles: ["instructor"],
    permisos: [],
  },
}
