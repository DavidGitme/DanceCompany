class ListarEstudiantes:
    """Punto de extensión del módulo estudiantes."""

    def ejecutar(self):
        # TODO: inyectar el repositorio del módulo y devolver su DTO de lista.
        return {"datos": [], "total": 0, "pagina": 1, "tamano": 20}
