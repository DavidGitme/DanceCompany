from app.aplicacion.casos_uso.seguridad.gestionar_seguridad import GestionarSeguridad
from app.infraestructura.repositorios.seguridad_memoria import RepositorioSeguridadMemoria


def test_lista_seguridad_respeta_formato_estandar():
    gestor = GestionarSeguridad(RepositorioSeguridadMemoria("hash-no-usado"))

    respuesta = gestor.listar("estados", pagina=1, tamano=20)

    assert respuesta["total"] == 3
    assert respuesta["pagina"] == 1
    assert respuesta["tamano"] == 20
    assert respuesta["datos"][0]["idEstado"] == 1
