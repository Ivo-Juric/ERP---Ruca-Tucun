"use server";

import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import type { TipoNotificacion } from "@prisma/client";
export type { TipoNotificacion };

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type NotificacionPublica = {
  id: string;
  titulo: string;
  contenido: string;
  tipo: TipoNotificacion;
  leida: boolean;
  url_destino: string | null;
  creado_en: string;
};

// ─── Crear (sin autenticación — se llama desde otras server actions) ──────────

export async function crearNotificacion(
  usuario_id: string,
  data: {
    titulo: string;
    contenido: string;
    tipo?: TipoNotificacion;
    url_destino?: string;
  },
): Promise<void> {
  try {
    await prisma.notificacion.create({
      data: {
        usuario_id,
        titulo: data.titulo,
        contenido: data.contenido,
        tipo: data.tipo ?? "INFO",
        url_destino: data.url_destino ?? null,
      },
    });
  } catch {
    // Silenciamos errores para que no interrumpan la acción principal
    console.error("[crearNotificacion] Error al crear notificación:", {
      usuario_id,
      titulo: data.titulo,
    });
  }
}

// ─── Obtener (autenticado) ────────────────────────────────────────────────────

export async function obtenerNotificaciones(): Promise<{
  ok: true;
  data: NotificacionPublica[];
  sinLeer: number;
} | { ok: false; error: string }> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const notificaciones = await prisma.notificacion.findMany({
      where: { usuario_id: usuario.id },
      orderBy: { creado_en: "desc" },
      take: 10,
    });

    const sinLeer = await prisma.notificacion.count({
      where: { usuario_id: usuario.id, leida: false },
    });

    return {
      ok: true,
      data: notificaciones.map((n) => ({
        id: n.id,
        titulo: n.titulo,
        contenido: n.contenido,
        tipo: n.tipo,
        leida: n.leida,
        url_destino: n.url_destino,
        creado_en: n.creado_en.toISOString(),
      })),
      sinLeer,
    };
  } catch {
    return { ok: false, error: "Error al obtener notificaciones." };
  }
}

// ─── Marcar leída ─────────────────────────────────────────────────────────────

export async function marcarLeida(id: string): Promise<void> {
  const usuario = await getUsuarioActual();
  if (!usuario) return;

  try {
    await prisma.notificacion.updateMany({
      where: { id, usuario_id: usuario.id },
      data: { leida: true },
    });
  } catch {
    // silencioso
  }
}

export async function marcarTodasLeidas(): Promise<void> {
  const usuario = await getUsuarioActual();
  if (!usuario) return;

  try {
    await prisma.notificacion.updateMany({
      where: { usuario_id: usuario.id, leida: false },
      data: { leida: true },
    });
  } catch {
    // silencioso
  }
}
