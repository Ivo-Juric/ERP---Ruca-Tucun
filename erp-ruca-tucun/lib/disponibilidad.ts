// Server-only: imports Prisma. No importar en Client Components.

import { prisma } from "@/lib/prisma";
import { EstadoSolicitud } from "@prisma/client";

// ─── Helpers de fecha ────────────────────────────────────────────────────────

/** Dado cualquier Date, retorna el lunes de esa semana a las 00:00:00.000. */
export function getLunesDeSemana(fecha: Date): Date {
  const d = new Date(fecha);
  const day = d.getDay(); // 0 = domingo, 1 = lunes, ...
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getDomingoSemana(lunes: Date): Date {
  const d = new Date(lunes);
  d.setDate(d.getDate() + 6);
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Lógica de disponibilidad ─────────────────────────────────────────────────

/**
 * Calcula la disponibilidad de un ítem para la semana que inicia en `semanaInicio`
 * (debe ser un lunes). Excluye opcionalmente una solicitud (ej. la que se está editando).
 *
 * "Ocupado" = suma de cantidad_aprobada de solicitudes APROBADA/APROBADA_PARCIAL
 * no devueltas cuyo rango [fecha_uso, fecha_devolucion_esperada] se superpone
 * con [semanaInicio, domingoSemana].
 */
export async function getDisponibilidadItem(
  itemId: string,
  semanaInicio: Date,
  excluirSolicitudId?: string,
): Promise<{ total: number; ocupado: number; disponible: number }> {
  const semaneFin = getDomingoSemana(semanaInicio);

  const [item, solicitudes] = await Promise.all([
    prisma.itemInventario.findUnique({
      where: { id: itemId },
      select: { cantidad_total: true },
    }),
    prisma.solicitudRecurso.findMany({
      where: {
        item_id: itemId,
        estado: {
          in: [EstadoSolicitud.APROBADA, EstadoSolicitud.APROBADA_PARCIAL],
        },
        devuelto: false,
        // Superpone: empieza antes del fin de semana...
        fecha_uso: { lte: semaneFin },
        // ...y termina después del inicio (o sin fecha = indefinido)
        OR: [
          { fecha_devolucion_esperada: null },
          { fecha_devolucion_esperada: { gte: semanaInicio } },
        ],
        ...(excluirSolicitudId ? { id: { not: excluirSolicitudId } } : {}),
      },
      select: { cantidad_aprobada: true, cantidad: true },
    }),
  ]);

  if (!item) return { total: 0, ocupado: 0, disponible: 0 };

  const ocupado = solicitudes.reduce(
    (sum, s) => sum + (s.cantidad_aprobada ?? s.cantidad),
    0,
  );
  const total = item.cantidad_total;
  const disponible = Math.max(0, total - ocupado);

  return { total, ocupado, disponible };
}

/**
 * Retorna la disponibilidad de todos los ítems del inventario para una semana,
 * junto con las solicitudes activas que la afectan.
 * Usa dos queries (items + solicitudes) para evitar N+1.
 */
export async function getDisponibilidadSemana(semanaInicio: Date) {
  const semaneFin = getDomingoSemana(semanaInicio);

  const [items, solicitudes] = await Promise.all([
    prisma.itemInventario.findMany({
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    }),
    prisma.solicitudRecurso.findMany({
      where: {
        estado: {
          in: [EstadoSolicitud.APROBADA, EstadoSolicitud.APROBADA_PARCIAL],
        },
        devuelto: false,
        fecha_uso: { lte: semaneFin },
        OR: [
          { fecha_devolucion_esperada: null },
          { fecha_devolucion_esperada: { gte: semanaInicio } },
        ],
      },
      select: {
        id: true,
        item_id: true,
        cantidad: true,
        cantidad_aprobada: true,
        fecha_uso: true,
        fecha_devolucion_esperada: true,
        actividad: { select: { titulo: true } },
        solicitado_por: {
          select: {
            nombre: true,
            apellido: true,
            seccion: { select: { nombre: true } },
          },
        },
      },
    }),
  ]);

  return items.map((item) => {
    const solicitudesItem = solicitudes.filter((s) => s.item_id === item.id);
    const ocupado = solicitudesItem.reduce(
      (sum, s) => sum + (s.cantidad_aprobada ?? s.cantidad),
      0,
    );
    return {
      item,
      total: item.cantidad_total,
      ocupado,
      disponible: Math.max(0, item.cantidad_total - ocupado),
      solicitudesActivas: solicitudesItem,
    };
  });
}
