"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { EstadoActividad, TipoActividad, Rol } from "@prisma/client";
import type { Prisma } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export interface FiltrosActividades {
  tipo?: TipoActividad;
  seccion_id?: string;
  agrupacion_id?: string;
  desde?: Date;
  hasta?: Date;
}

export type ActividadCalendario = {
  id: string;
  titulo: string;
  tipo: TipoActividad;
  estado: EstadoActividad;
  fecha_inicio: string;
  fecha_fin: string;
  lugar: string | null;
  descripcion: string | null;
  requiere_aprobacion: boolean;
  seccion_id: string | null;
  agrupacion_id: string | null;
  seccion: { id: string; nombre: string } | null;
  creado_por: { nombre: string; apellido: string };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_POR_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];

type UsuarioConSeccion = NonNullable<Awaited<ReturnType<typeof getUsuarioActual>>>;

function getActividadesWhere(
  usuario: UsuarioConSeccion,
  filtros: FiltrosActividades = {},
): Prisma.ActividadWhereInput {
  let scope: Prisma.ActividadWhereInput = {};

  if (!ROLES_GLOBALES.includes(usuario.rol)) {
    if (ROLES_POR_AGRUPACION.includes(usuario.rol)) {
      const agrupacion_id = usuario.seccion?.agrupacion?.id;
      scope = {
        OR: [
          { seccion_id: null, agrupacion_id: null }, // generales del Ruca
          { agrupacion_id: agrupacion_id ?? "__none__" },
          { seccion: { agrupacion_id: agrupacion_id ?? "__none__" } },
        ],
      };
    } else {
      // JEFE_SECCION, SUBJEFE_SECCION y similares
      scope = {
        OR: [
          { seccion_id: null, agrupacion_id: null }, // generales
          { seccion_id: usuario.seccion_id ?? "__none__" },
        ],
      };
    }
  }

  return {
    ...scope,
    ...(filtros.tipo && { tipo: filtros.tipo }),
    ...(filtros.seccion_id && { seccion_id: filtros.seccion_id }),
    ...(filtros.agrupacion_id && { agrupacion_id: filtros.agrupacion_id }),
    ...(filtros.desde && { fecha_inicio: { gte: filtros.desde } }),
    ...(filtros.hasta && { fecha_inicio: { lte: filtros.hasta } }),
  };
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function obtenerActividades(
  filtros: FiltrosActividades = {},
): Promise<ActionResult<ActividadCalendario[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "CALENDARIO", "ver"))
    return { ok: false, error: "Sin permiso." };

  try {
    const actividades = await prisma.actividad.findMany({
      where: getActividadesWhere(usuario, filtros),
      select: {
        id: true,
        titulo: true,
        tipo: true,
        estado: true,
        fecha_inicio: true,
        fecha_fin: true,
        lugar: true,
        descripcion: true,
        requiere_aprobacion: true,
        seccion_id: true,
        agrupacion_id: true,
        seccion: { select: { id: true, nombre: true } },
        creado_por: { select: { nombre: true, apellido: true } },
      },
      orderBy: { fecha_inicio: "asc" },
    });

    return {
      ok: true,
      data: actividades.map((a) => ({
        ...a,
        fecha_inicio: a.fecha_inicio.toISOString(),
        fecha_fin: a.fecha_fin.toISOString(),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener actividades." };
  }
}

export async function crearActividad(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "CALENDARIO", "crear"))
    return { ok: false, error: "Sin permiso para crear actividades." };

  const titulo = (formData.get("titulo") as string | null)?.trim() ?? "";
  const tipo = (formData.get("tipo") as TipoActividad | null) ?? null;
  const fechaInicioStr = (formData.get("fecha_inicio") as string | null) ?? "";
  const fechaFinStr = (formData.get("fecha_fin") as string | null) ?? "";
  const lugar = (formData.get("lugar") as string | null)?.trim() || null;
  const descripcion = (formData.get("descripcion") as string | null)?.trim() || null;
  const seccion_id = (formData.get("seccion_id") as string | null) || null;
  const requiere_aprobacion = formData.get("requiere_aprobacion") === "true";

  if (!titulo) return { ok: false, error: "El título es requerido." };
  if (!tipo || !Object.values(TipoActividad).includes(tipo))
    return { ok: false, error: "El tipo de actividad es inválido." };
  if (!fechaInicioStr || isNaN(Date.parse(fechaInicioStr)))
    return { ok: false, error: "La fecha de inicio es inválida." };
  if (!fechaFinStr || isNaN(Date.parse(fechaFinStr)))
    return { ok: false, error: "La fecha de fin es inválida." };

  const fechaInicio = new Date(fechaInicioStr);
  const fechaFin = new Date(fechaFinStr);

  if (fechaFin < fechaInicio)
    return { ok: false, error: "La fecha de fin no puede ser anterior al inicio." };

  // Las actividades con requiere_aprobacion arrancan siempre como PLANIFICADA
  const estado =
    requiere_aprobacion ? EstadoActividad.PLANIFICADA : EstadoActividad.CONFIRMADA;

  try {
    const actividad = await prisma.actividad.create({
      data: {
        titulo,
        tipo,
        estado,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        lugar,
        descripcion,
        seccion_id,
        requiere_aprobacion,
        creado_por_id: usuario.id,
      },
      select: { id: true },
    });

    revalidatePath("/calendario");
    return { ok: true, data: { id: actividad.id } };
  } catch {
    return { ok: false, error: "Error al crear la actividad." };
  }
}

export async function aprobarActividad(id: string): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (usuario.rol !== "JEFE_RUCA")
    return { ok: false, error: "Solo el Jefe de Ruca puede aprobar actividades." };

  const actividad = await prisma.actividad.findUnique({
    where: { id },
    select: { estado: true, requiere_aprobacion: true },
  });
  if (!actividad) return { ok: false, error: "Actividad no encontrada." };
  if (!actividad.requiere_aprobacion)
    return { ok: false, error: "Esta actividad no requiere aprobación." };
  if (actividad.estado !== EstadoActividad.PLANIFICADA)
    return { ok: false, error: "Solo se pueden aprobar actividades en estado Planificada." };

  try {
    await prisma.actividad.update({
      where: { id },
      data: { estado: EstadoActividad.CONFIRMADA },
    });
    revalidatePath("/calendario");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al aprobar la actividad." };
  }
}

export async function cancelarActividad(id: string): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "CALENDARIO", "editar"))
    return { ok: false, error: "Sin permiso para cancelar actividades." };

  const actividad = await prisma.actividad.findUnique({
    where: { id },
    select: { estado: true, titulo: true, seccion_id: true, agrupacion_id: true },
  });
  if (!actividad) return { ok: false, error: "Actividad no encontrada." };
  if (actividad.estado === EstadoActividad.REALIZADA)
    return { ok: false, error: "No se puede cancelar una actividad ya realizada." };
  if (actividad.estado === EstadoActividad.CANCELADA)
    return { ok: false, error: "La actividad ya está cancelada." };

  try {
    await prisma.$transaction(async (tx) => {
      await tx.actividad.update({
        where: { id },
        data: { estado: EstadoActividad.CANCELADA },
      });

      // Insertar anuncio de cancelación visible para todos
      await tx.anuncio.create({
        data: {
          titulo: `Actividad cancelada: ${actividad.titulo}`,
          contenido: `La actividad "${actividad.titulo}" ha sido cancelada.`,
          categoria: "URGENTE",
          autor_id: usuario.id,
          activo: true,
        },
      });
    });

    revalidatePath("/calendario");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al cancelar la actividad." };
  }
}

export async function marcarRealizada(id: string): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "CALENDARIO", "editar"))
    return { ok: false, error: "Sin permiso." };

  const actividad = await prisma.actividad.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!actividad) return { ok: false, error: "Actividad no encontrada." };
  if (actividad.estado !== EstadoActividad.CONFIRMADA)
    return {
      ok: false,
      error: "Solo se pueden marcar como realizadas las actividades confirmadas.",
    };

  try {
    await prisma.actividad.update({
      where: { id },
      data: { estado: EstadoActividad.REALIZADA },
    });
    revalidatePath("/calendario");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al actualizar el estado." };
  }
}
