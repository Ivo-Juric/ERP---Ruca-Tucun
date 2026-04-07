"use server";

import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import type { Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type DatoMensual = {
  mes: string;
  mesNum: number;
  presentes: number;
  total: number;
  porcentaje: number;
};

export type ProgresoFDocSeccion = {
  seccion_id: string;
  seccion_nombre: string;
  total_items: number;
  completados: number;
  porcentaje: number;
  sesiones: number;
};

export type FilaInventario = {
  nombre: string;
  categoria: string;
  cantidad_total: number;
  cantidad_disponible: number;
  estado_conservacion: string;
  stock_bajo: boolean;
};

export type FilaActividad = {
  titulo: string;
  tipo: string;
  fecha: string;
  seccion: string;
  asistencia_pct: number | null;
};

export type FilaMiembro = {
  nombre: string;
  apellido: string;
  seccion: string;
  estado: string;
  anio_ingreso: number;
  asistencia_pct: number | null;
};

const MESES = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLES_GLOBAL: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_AGRUPACION: Rol[] = ["JEFE_AGRUP_MASCULINA", "JEFE_AGRUP_FEMENINA", "JEFE_MILICIANOS"];

function tipoAgrupacionDeRol(rol: Rol): string | null {
  if (rol === "JEFE_AGRUP_MASCULINA") return "MASCULINA";
  if (rol === "JEFE_AGRUP_FEMENINA") return "FEMENINA";
  if (rol === "JEFE_MILICIANOS") return "MILICIANOS";
  return null;
}

function agruparPorMes(
  asistencias: { presente: boolean; fecha: Date }[],
  anio: number,
): DatoMensual[] {
  const porMes: Record<number, { presentes: number; total: number }> = {};
  for (let i = 0; i < 12; i++) porMes[i] = { presentes: 0, total: 0 };

  for (const a of asistencias) {
    if (a.fecha.getFullYear() !== anio) continue;
    const m = a.fecha.getMonth();
    porMes[m]!.total++;
    if (a.presente) porMes[m]!.presentes++;
  }

  return Object.entries(porMes).map(([mesStr, v]) => {
    const mesNum = parseInt(mesStr, 10);
    return {
      mes: MESES[mesNum] ?? String(mesNum + 1),
      mesNum,
      presentes: v.presentes,
      total: v.total,
      porcentaje: v.total > 0 ? Math.round((v.presentes / v.total) * 100) : 0,
    };
  });
}

// ─── Asistencia ───────────────────────────────────────────────────────────────

export async function obtenerAsistenciaMensual(filtros?: {
  seccion_id?: string;
  agrupacion_tipo?: string;
}): Promise<{ ok: true; data: DatoMensual[] } | { ok: false; error: string }> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const anio = new Date().getFullYear();

  try {
    // Construir filtro de actividades según el scope
    let seccionIds: string[] | undefined;

    if (filtros?.seccion_id) {
      seccionIds = [filtros.seccion_id];
    } else if (filtros?.agrupacion_tipo) {
      const secciones = await prisma.seccion.findMany({
        where: { agrupacion: { tipo: filtros.agrupacion_tipo as "MASCULINA" | "FEMENINA" | "MILICIANOS" } },
        select: { id: true },
      });
      seccionIds = secciones.map((s) => s.id);
    }

    const asistencias = await prisma.asistencia.findMany({
      where: {
        actividad: {
          estado: "REALIZADA",
          fecha_inicio: {
            gte: new Date(`${anio}-01-01`),
            lte: new Date(`${anio}-12-31`),
          },
          ...(seccionIds ? { seccion_id: { in: seccionIds } } : {}),
        },
      },
      select: {
        presente: true,
        actividad: { select: { fecha_inicio: true } },
      },
    });

    const flat = asistencias.map((a) => ({
      presente: a.presente,
      fecha: a.actividad.fecha_inicio,
    }));

    return { ok: true, data: agruparPorMes(flat, anio) };
  } catch {
    return { ok: false, error: "Error al obtener datos de asistencia." };
  }
}

// ─── FDoc ─────────────────────────────────────────────────────────────────────

export async function obtenerProgresoFDoc(filtros?: {
  seccion_id?: string;
  agrupacion_tipo?: string;
}): Promise<{ ok: true; data: ProgresoFDocSeccion[] } | { ok: false; error: string }> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const anio = new Date().getFullYear();

  try {
    let wherePlan: { seccion_id?: string | { in: string[] }; anio: number } = { anio };

    if (filtros?.seccion_id) {
      wherePlan.seccion_id = filtros.seccion_id;
    } else if (filtros?.agrupacion_tipo) {
      const secciones = await prisma.seccion.findMany({
        where: { agrupacion: { tipo: filtros.agrupacion_tipo as "MASCULINA" | "FEMENINA" | "MILICIANOS" } },
        select: { id: true },
      });
      wherePlan.seccion_id = { in: secciones.map((s) => s.id) };
    }

    const planes = await prisma.planFDoc.findMany({
      where: wherePlan,
      include: {
        seccion: { select: { nombre: true } },
        items: { select: { completado: true } },
      },
    });

    const [, sesionesData] = await Promise.all([
      Promise.resolve(planes),
      prisma.sesionFDoc.groupBy({
        by: ["seccion_id"],
        where: {
          fecha: {
            gte: new Date(`${anio}-01-01`),
            lte: new Date(`${anio}-12-31`),
          },
          ...(filtros?.seccion_id ? { seccion_id: filtros.seccion_id } : {}),
        },
        _count: { id: true },
      }),
    ]);

    const sesionesPorSeccion = new Map(
      sesionesData.map((s) => [s.seccion_id, s._count.id]),
    );

    return {
      ok: true,
      data: planes.map((plan) => {
        const total = plan.items.length;
        const completados = plan.items.filter((i) => i.completado).length;
        return {
          seccion_id: plan.seccion_id,
          seccion_nombre: plan.seccion.nombre,
          total_items: total,
          completados,
          porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0,
          sesiones: sesionesPorSeccion.get(plan.seccion_id) ?? 0,
        };
      }),
    };
  } catch {
    return { ok: false, error: "Error al obtener progreso FDoc." };
  }
}

// ─── Inventario ───────────────────────────────────────────────────────────────

export async function obtenerResumenInventario(): Promise<
  { ok: true; data: FilaInventario[] } | { ok: false; error: string }
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!["JEFE_RUCA", "SECRETARIO", "JEFE_INTENDENCIA", "SUBJEFE_INTENDENCIA"].includes(usuario.rol)) {
    return { ok: false, error: "Sin permiso." };
  }

  try {
    const items = await prisma.itemInventario.findMany({
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });
    return {
      ok: true,
      data: items.map((i) => ({
        nombre: i.nombre,
        categoria: i.categoria,
        cantidad_total: i.cantidad_total,
        cantidad_disponible: i.cantidad_disponible,
        estado_conservacion: i.estado_conservacion,
        stock_bajo: i.cantidad_disponible <= i.stock_minimo,
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener inventario." };
  }
}

// ─── Actividades ──────────────────────────────────────────────────────────────

export async function obtenerActividadGeneral(): Promise<
  { ok: true; data: FilaActividad[] } | { ok: false; error: string }
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const anio = new Date().getFullYear();

  try {
    const actividades = await prisma.actividad.findMany({
      where: {
        estado: "REALIZADA",
        fecha_inicio: {
          gte: new Date(`${anio}-01-01`),
          lte: new Date(`${anio}-12-31`),
        },
      },
      include: {
        seccion: { select: { nombre: true } },
        asistencias: { select: { presente: true } },
      },
      orderBy: { fecha_inicio: "desc" },
      take: 200,
    });

    return {
      ok: true,
      data: actividades.map((a) => {
        const total = a.asistencias.length;
        const presentes = a.asistencias.filter((x) => x.presente).length;
        return {
          titulo: a.titulo,
          tipo: a.tipo,
          fecha: a.fecha_inicio.toISOString(),
          seccion: a.seccion?.nombre ?? "Global",
          asistencia_pct: total > 0 ? Math.round((presentes / total) * 100) : null,
        };
      }),
    };
  } catch {
    return { ok: false, error: "Error al obtener actividades." };
  }
}

// ─── Miembros (reporte de sección) ───────────────────────────────────────────

export async function obtenerMiembrosConAsistencia(seccionId: string): Promise<
  { ok: true; data: FilaMiembro[] } | { ok: false; error: string }
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const anio = new Date().getFullYear();

  try {
    const miembros = await prisma.miembro.findMany({
      where: { seccion_id: seccionId },
      include: {
        seccion: { select: { nombre: true } },
        asistencias: {
          where: {
            actividad: {
              fecha_inicio: {
                gte: new Date(`${anio}-01-01`),
                lte: new Date(`${anio}-12-31`),
              },
            },
          },
          select: { presente: true },
        },
      },
      orderBy: [{ estado: "asc" }, { apellido: "asc" }],
    });

    return {
      ok: true,
      data: miembros.map((m) => {
        const total = m.asistencias.length;
        const presentes = m.asistencias.filter((a) => a.presente).length;
        return {
          nombre: m.nombre,
          apellido: m.apellido,
          seccion: m.seccion.nombre,
          estado: m.estado,
          anio_ingreso: m.anio_ingreso,
          asistencia_pct: total > 0 ? Math.round((presentes / total) * 100) : null,
        };
      }),
    };
  } catch {
    return { ok: false, error: "Error al obtener miembros." };
  }
}

// ─── Meta: determinar tabs disponibles para el rol ──────────────────────────

export type TabReporte = {
  id: string;
  label: string;
  seccion_id?: string;
  agrupacion_tipo?: string;
};

export async function obtenerTabsReporte(): Promise<TabReporte[]> {
  const usuario = await getUsuarioActual();
  if (!usuario) return [];

  const rol = usuario.rol;

  if (ROLES_GLOBAL.includes(rol)) {
    return [
      { id: "asistencia-global", label: "Asistencia Global" },
      { id: "fdoc-global", label: "FDoc Global" },
      { id: "inventario", label: "Inventario" },
      { id: "actividades", label: "Actividad General" },
    ];
  }

  if (ROLES_AGRUPACION.includes(rol)) {
    const tipo = tipoAgrupacionDeRol(rol);
    return [
      { id: "asistencia-agrup", label: "Asistencia Agrupación", agrupacion_tipo: tipo ?? undefined },
      { id: "fdoc-agrup", label: "FDoc Agrupación", agrupacion_tipo: tipo ?? undefined },
    ];
  }

  if (rol === "JEFE_SECCION" || rol === "SUBJEFE_SECCION") {
    const seccionId = usuario.seccion_id ?? undefined;
    return [
      { id: "asistencia-seccion", label: "Asistencia Sección", seccion_id: seccionId },
      { id: "fdoc-seccion", label: "FDoc Sección", seccion_id: seccionId },
      { id: "miembros", label: "Miembros", seccion_id: seccionId },
    ];
  }

  return [];
}
