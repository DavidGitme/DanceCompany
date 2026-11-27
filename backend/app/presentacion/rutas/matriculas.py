from fastapi import APIRouter, Depends, Path, Query, status

from app.aplicacion.dtos.comun_dto import CambioEstadoSolicitud, ListaRespuesta
from app.aplicacion.dtos.matriculas_dto import (
    ConfiguracionMatricula,
    EstadoMatriculaRespuesta,
    EstudianteParaMatricula,
    GrupoParaMatricula,
    MarcarRequisitoSolicitud,
    MatriculaCreateDto,
    MatriculaDetalleRespuesta,
    MatriculaOpcion,
    MatriculaRespuesta,
    MatriculaUpdateDto,
    RequisitoMatriculaRespuesta,
)
from app.presentacion.dependencias.administrativos import gestor_matriculas
from app.presentacion.dependencias.auth import get_usuario_actual, requiere_permiso, requiere_rol
from app.presentacion.dependencias.sede import alcance_sede, filtro_sede

router = APIRouter(prefix="/matriculas", tags=["Matrículas"])
permiso = [Depends(requiere_permiso("matriculas")), Depends(alcance_sede("matriculas"))]


@router.get("", response_model=ListaRespuesta[MatriculaRespuesta], dependencies=permiso)
def listar_matriculas(
    estado: int | None = Query(None, gt=0, description="Filtra por idEstado"),
    estudiante: int | None = Query(None, gt=0),
    grupo: int | None = Query(None, gt=0),
    sede: int | None = Depends(filtro_sede),
    buscar: str | None = Query(
        None, max_length=60, description="Busca por estudiante, documento o grupo"
    ),
    pagina: int = Query(1, ge=1),
    tamano: int = Query(20, ge=1, le=100),
    gestor=Depends(gestor_matriculas),
):
    filtros = {"estudiante": estudiante, "grupo": grupo, "sede": sede}
    return gestor.listar(estado, buscar, pagina, tamano, filtros)


# Solo activas, para selectores (mensualidades, pagos)
@router.get("/disponibles", response_model=list[MatriculaOpcion], dependencies=permiso)
def matriculas_disponibles(sede: int | None = Depends(filtro_sede), gestor=Depends(gestor_matriculas)):
    return gestor.disponibles(sede)


# Precio único y si la base ya tiene el proceso de aprobación (bd/08)
@router.get("/configuracion", response_model=ConfiguracionMatricula, dependencies=permiso)
def configuracion_matricula(gestor=Depends(gestor_matriculas)):
    return gestor.configuracion()


# Pendiente, Activo e Inactivo, para el filtro de la lista
@router.get("/estados", response_model=list[EstadoMatriculaRespuesta], dependencies=permiso)
def estados_matricula(gestor=Depends(gestor_matriculas)):
    return gestor.estados()


@router.get("/requisitos", response_model=list[RequisitoMatriculaRespuesta], dependencies=permiso)
def requisitos_matricula(gestor=Depends(gestor_matriculas)):
    return gestor.catalogo_requisitos()


# Estudiantes activos con sede y fecha de nacimiento (para validar sede y edad al matricular)
@router.get("/opciones/estudiantes", response_model=list[EstudianteParaMatricula], dependencies=permiso)
def estudiantes_para_matricular(sede: int | None = Depends(filtro_sede), gestor=Depends(gestor_matriculas)):
    return gestor.estudiantes_para_matricular(sede)


# Grupos activos con el rango de edad del nivel y los cupos ocupados
@router.get("/opciones/grupos", response_model=list[GrupoParaMatricula], dependencies=permiso)
def grupos_para_matricular(sede: int | None = Depends(filtro_sede), gestor=Depends(gestor_matriculas)):
    return gestor.grupos_para_matricular(sede)


@router.get("/{identificador}", response_model=MatriculaRespuesta, dependencies=permiso)
def detalle_matricula(identificador: int, gestor=Depends(gestor_matriculas)):
    return gestor.obtener(identificador)


# Nace Pendiente con el valor único; se activa al aprobarla
@router.post(
    "", response_model=MatriculaRespuesta, status_code=status.HTTP_201_CREATED, dependencies=permiso
)
def crear_matricula(solicitud: MatriculaCreateDto, gestor=Depends(gestor_matriculas)):
    return gestor.crear(solicitud.model_dump())


@router.put("/{identificador}", response_model=MatriculaRespuesta, dependencies=permiso)
def actualizar_matricula(
    identificador: int, solicitud: MatriculaUpdateDto, gestor=Depends(gestor_matriculas)
):
    return gestor.actualizar(identificador, solicitud.model_dump(exclude_none=True))


# Sin borrado físico: Inactivo conserva el historial (cambio de nivel o de grupo)
@router.patch("/{identificador}/estado", response_model=MatriculaRespuesta, dependencies=permiso)
def cambiar_estado_matricula(
    identificador: int, solicitud: CambioEstadoSolicitud, gestor=Depends(gestor_matriculas)
):
    return gestor.cambiar_estado(identificador, solicitud.idEstado)


# ---------- Requisitos y aprobación (privilegio de editar del módulo) ----------
@router.get("/{identificador}/requisitos", response_model=MatriculaDetalleRespuesta, dependencies=permiso)
def requisitos_de_matricula(identificador: int, gestor=Depends(gestor_matriculas)):
    return gestor.detalle(identificador)


@router.put(
    "/{identificador}/requisitos/{id_requisito}",
    response_model=MatriculaDetalleRespuesta,
    dependencies=permiso,
)
def marcar_requisito(
    identificador: int,
    solicitud: MarcarRequisitoSolicitud,
    id_requisito: int = Path(gt=0),
    usuario: dict = Depends(get_usuario_actual),
    gestor=Depends(gestor_matriculas),
):
    return gestor.marcar_requisito(
        identificador, id_requisito, solicitud.cumplido, usuario.get("sub"), solicitud.observacion
    )


@router.put("/{identificador}/aprobacion", response_model=MatriculaDetalleRespuesta, dependencies=permiso)
def aprobar_matricula(
    identificador: int, usuario: dict = Depends(get_usuario_actual), gestor=Depends(gestor_matriculas)
):
    return gestor.aprobar(identificador, usuario.get("sub"))


# ---------- Portal del instructor: visto bueno de las matrículas de sus grupos ----------
router_instructor = APIRouter(prefix="/portal-instructor/matriculas", tags=["Portal del instructor"])


@router_instructor.get("", response_model=list[MatriculaDetalleRespuesta])
def pendientes_del_instructor(
    usuario: dict = Depends(requiere_rol("instructor")), gestor=Depends(gestor_matriculas)
):
    return gestor.pendientes_de_instructor(usuario["sub"])


# El instructor marca los requisitos que le corresponden (examen de nivel)
@router_instructor.put(
    "/{identificador}/requisitos/{id_requisito}", response_model=MatriculaDetalleRespuesta
)
def marcar_requisito_instructor(
    identificador: int,
    solicitud: MarcarRequisitoSolicitud,
    id_requisito: int = Path(gt=0),
    usuario: dict = Depends(requiere_rol("instructor")),
    gestor=Depends(gestor_matriculas),
):
    gestor.exigir_instructor_del_grupo(identificador, usuario["sub"])
    return gestor.marcar_requisito(
        identificador, id_requisito, solicitud.cumplido, usuario["sub"], solicitud.observacion,
        solo_instructor=True,
    )


@router_instructor.put("/{identificador}/aprobacion", response_model=MatriculaDetalleRespuesta)
def aprobar_matricula_instructor(
    identificador: int,
    usuario: dict = Depends(requiere_rol("instructor")),
    gestor=Depends(gestor_matriculas),
):
    gestor.exigir_instructor_del_grupo(identificador, usuario["sub"])
    return gestor.aprobar(identificador, usuario["sub"])
