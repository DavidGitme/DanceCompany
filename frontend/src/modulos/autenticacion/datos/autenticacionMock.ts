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
