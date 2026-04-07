"use server";

import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import type { Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type WidgetProximaActividad = {
  id: string;
  titulo: string;
  tipo: string;
  fecha: string;
  dias_restantes: number;
} | null;

export type WidgetAsistencia = {
  porcentaje: number;
  presentes: number;
  total: number;
  etiqueta: string;
} | null;

export type WidgetFDoc = {
  porcentaje: number;
  completados: number;
  total: number;
  seccion: string;
} | null;

export type WidgetSolicitudesPendientes = {
  cantidad: number;
} | null;

export type Alerta = {
  tipo: "stock" | "asistencia" | "fdoc";
  mensaje: string;
};

export type DashboardData = {
  proximaActividad: WidgetProximaActividad;
  asistencia: WidgetAsistencia;
  fdoc: WidgetFDoc;
  solicitudesPendientes: WidgetSolicitudesPendientes;
  alertas: Alerta[];
  esJefeSeccion: boolean;
};

const LABEL_TIPO: Record<string, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada FDoc",
  JORNADA_JEFES: "Jornada Jefes",
  REUNION_JEFES: "Reunión Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

const ROLES_GLOBAL: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_INTENDENCIA: Rol[] = ["JEFE_INTENDENCIA", "SUBJEFE_INTENDENCIA"];

export async function obtenerDashboardData(): Promise<DashboardData | null> {
  const usuario = await getUsuarioActual();
  if (!usuario) return null;

  const rol = usuario.rol;
  const esGlobal = ROLES_GLOBAL.includes(rol);
  const esJefeSeccion =
    rol === "JEFE_SECCION" || rol === "SUBJEFE_SECCION";
  const esIntendencia = ROLES_INTENDENCIA.includes(rol);
  const seccionId = usuario.seccion_id;
  const anio = new Date().getFullYear();
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // ── Próxima actividad ────────────────────────────────────────────────────

  const proximaActividadDB = await prisma.actividad.findFirst({
    where: {
      estado: { in: ["PLANIFICADA", "CONFIRMADA"] },
      fecha_inicio: { gte: hoy },
      ...(seccionId && !esGlobal ? { seccion_id: seccionId } : {}),
    },
    orderBy: { fecha_inicio: "asc" },
    select: { id: true, titulo: true, tipo: true, fecha_inicio: true },
  });

  const proximaActividad: WidgetProximaActividad = proximaActividadDB
    ? {
        id: proximaActividadDB.id,
        titulo: proximaActividadDB.titulo,
        tipo: LABEL_TIPO[proximaActividadDB.tipo] ?? proximaActividadDB.tipo,
        fecha: proximaActividadDB.fecha_inicio.toISOString(),
        dias_restantes: Math.ceil(
          (proximaActividadDB.fecha_inicio.getTime() - hoy.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      }
    : null;

  // ── Asistencia del mes ───────────────────────────────────────────────────

  const mesInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const mesFin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

  const asistenciasDelMes = await prisma.asistencia.findMany({
    where: {
      actividad: {
        estado: "REALIZADA",
        fecha_inicio: { gte: mesInicio, lte: mesFin },
        ...(seccionId && !esGlobal ? { seccion_id: seccionId } : {}),
      },
    },
    select: { presente: true },
  });

  const totalAsist = asistenciasDelMes.length;
  const presentesAsist = asistenciasDelMes.filter((a) => a.presente).length;

  const asistencia: WidgetAsistencia =
    totalAsist > 0
      ? {
          porcentaje: Math.round((presentesAsist / totalAsist) * 100),
          presentes: presentesAsist,
          total: totalAsist,
          etiqueta: esGlobal ? "Asistencia global este mes" : "Asistencia sección este mes",
        }
      : null;

  // ── FDoc del plan anual ──────────────────────────────────────────────────

  let fdoc: WidgetFDoc = null;

  if (seccionId || esGlobal) {
    // Para global, tomar la primera sección con plan; para sección, filtrar directo
    const plan = await prisma.planFDoc.findFirst({
      where: {
        anio,
        ...(seccionId && !esGlobal ? { seccion_id: seccionId } : {}),
      },
      include: {
        items: { select: { completado: true } },
        seccion: { select: { nombre: true } },
      },
    });

    if (plan) {
      const total = plan.items.length;
      const completados = plan.items.filter((i) => i.completado).length;
      fdoc = {
        porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0,
        completados,
        total,
        seccion: plan.seccion.nombre,
      };
    }
  }

  // ── Solicitudes pendientes (intendencia) ─────────────────────────────────

  let solicitudesPendientes: WidgetSolicitudesPendientes = null;

  if (esIntendencia || esGlobal) {
    const cantidad = await prisma.solicitudRecurso.count({
      where: { estado: "PENDIENTE_INTENDENCIA" },
    });
    solicitudesPendientes = { cantidad };
  }

  // ── Alertas del sistema ──────────────────────────────────────────────────

  const alertas: Alerta[] = [];

  if (esGlobal || esIntendencia) {
    // Stock bajo
    const itemsConStockBajo = await prisma.itemInventario.findMany({
      select: { nombre: true, cantidad_disponible: true, stock_minimo: true },
    });
    const stockBajo = itemsConStockBajo.filter(
      (i) => i.cantidad_disponible <= i.stock_minimo,
    );
    if (stockBajo.length > 0) {
      alertas.push({
        tipo: "stock",
        mensaje: `${stockBajo.length} ítem${stockBajo.length !== 1 ? "s" : ""} con stock bajo en inventario.`,
      });
    }
  }

  if (esGlobal) {
    // Secciones sin plan FDoc este año
    const [todasLasSecciones, seccionesConPlan] = await Promise.all([
      prisma.seccion.count(),
      prisma.planFDoc.count({ where: { anio } }),
    ]);
    if (seccionesConPlan < todasLasSecciones) {
      const faltantes = todasLasSecciones - seccionesConPlan;
      alertas.push({
        tipo: "fdoc",
        mensaje: `${faltantes} sección${faltantes !== 1 ? "es" : ""} sin plan FDoc ${anio}.`,
      });
    }

    // Asistencia global baja este mes (< 60%)
    if (asistencia && asistencia.porcentaje < 60) {
      alertas.push({
        tipo: "asistencia",
        mensaje: `Asistencia global este mes: ${asistencia.porcentaje}% (por debajo del 60%).`,
      });
    }
  }

  return {
    proximaActividad,
    asistencia,
    fdoc,
    solicitudesPendientes,
    alertas,
    esJefeSeccion,
  };
}
