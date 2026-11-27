from datetime import date
from decimal import Decimal

CERO = Decimal("0")


def _mes(fecha: date, atras: int = 0) -> str:
    total = fecha.year * 12 + fecha.month - 1 - atras
    return f"{total // 12:04d}-{total % 12 + 1:02d}"


class ResumenFinanciero:
    """Cifras del Dashboard: solo salen de mensualidades y pagos registrados."""

    def __init__(self, repositorio):
        self.repositorio = repositorio

    def ejecutar(self, sede: int | None, periodo: str | None, meses: int, hoy: date):
        periodo = periodo or _mes(hoy)
        anio, mes = (int(p) for p in periodo.split("-"))
        referencia = date(anio, mes, 1)
        desde = _mes(referencia, meses - 1)
        cobros = {f["periodo"]: f for f in self.repositorio.mensualidades_por_mes(sede, desde, periodo, hoy)}
        recibido = {f["periodo"]: f for f in self.repositorio.recibido_por_mes(sede, desde, periodo)}
        serie = []
        for atras in range(meses - 1, -1, -1):
            clave = _mes(referencia, atras)
            c, r = cobros.get(clave, {}), recibido.get(clave, {})
            serie.append({
                "periodo": clave,
                "esperado": c.get("esperado", CERO),
                "recaudado": c.get("recaudado", CERO),
                "pendiente": c.get("pendiente", CERO),
                "recibido": r.get("total", CERO),
            })
        actual_c, actual_r = cobros.get(periodo, {}), recibido.get(periodo, {})
        vencidas = self.repositorio.vencidas(sede, hoy)
        estudiantes = self.repositorio.estudiantes(sede, hoy)
        return {
            "periodo": periodo,
            "corte": hoy,
            "mensualidades": {
                "esperado": actual_c.get("esperado", CERO),
                "recaudado": actual_c.get("recaudado", CERO),
                "pendiente": actual_c.get("pendiente", CERO),
                "cantidad": actual_c.get("cantidad", 0),
                "pagadas": actual_c.get("pagadas", 0),
            },
            "recibido": {
                "total": actual_r.get("total", CERO),
                "mensualidad": actual_r.get("mensualidad", CERO),
                "matricula": actual_r.get("matricula", CERO),
                "taller": actual_r.get("taller", CERO),
                "cantidad": actual_r.get("cantidad", 0),
            },
            "vencidas": {**vencidas, "detalle": self.repositorio.detalle_vencidas(sede, hoy)},
            "estudiantes": {
                "matriculados": estudiantes["matriculados"],
                "conVencidas": estudiantes["con_vencidas"],
                "alDia": estudiantes["matriculados"] - estudiantes["con_vencidas"],
            },
            "serie": serie,
        }
