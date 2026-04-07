"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ItemPlan = {
  id: string;
  tema: string;
  texto_referencia: string | null;
  objetivo: string | null;
  semana_estimada: number | null;
  orden: number;
  completado: boolean;
};

export type PlanConItems = {
  id: string;
  anio: number;
  seccion_id: string;
  seccion: { nombre: string };
  items: ItemPlan[];
};

export type SesionItem = {
  id: string;
  fecha: string;
  tema: string;
  observaciones: string | null;
  es_extra: boolean;
  seccion_id: string;
  plan_item_id: string | null;
  plan_item: { tema: string } | null;
  registrado_por: { nombre: string; apellido: string };
  total_asistencias: number;
  presentes: number;
};

export type SesionConSeccion = SesionItem & {
  seccion: { nombre: string };
};

export type ProgresoSeccion = {
  seccion_id: string;
  seccion_nombre: string;
  total_items: number;
  completados: number;
  porcentaje: number;
  plan_id: string | null;
};

export type MaterialItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  url_archivo: string;
  tipo_archivo: string;
  seccion_id: string | null;
  seccion: { nombre: string } | null;
  creado_en: string;
  subido_por: { nombre: string; apellido: string };
};

export type MiembroFDoc = {
  id: string;
  nombre: string;
  apellido: string;
};

export type SeccionBasica = {
  id: string;
  nombre: string;
};

// ─── Helpers de rol ───────────────────────────────────────────────────────────

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "JEFE_FDOC", "SECRETARIO"];
const ROLES_CREAR_PLAN: Rol[] = ["JEFE_RUCA", "JEFE_FDOC"];
const ROLES_SUBIR_MATERIAL: Rol[] = ["JEFE_RUCA", "JEFE_FDOC", "SUBJEFE_FDOC"];

type UsuarioConSeccion = NonNullable<Awaited<ReturnType<typeof getUsuarioActual>>>;

function getSeccionesWhereId(
  usuario: UsuarioConSeccion,
): { id?: string } | null {
  if (ROLES_GLOBALES.includes(usuario.rol)) return {}; // todas las secciones
  if (usuario.seccion_id) return { id: usuario.seccion_id };
  return null;
}

// ─── Secciones ────────────────────────────────────────────────────────────────

export async function obtenerSecciones(): Promise<ActionResult<SeccionBasica[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  const where = getSeccionesWhereId(usuario);
  if (!where) return { ok: false, error: "Sin sección asignada." };

  try {
    const secciones = await prisma.seccion.findMany({
      where,
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
    return { ok: true, data: secciones };
  } catch {
    return { ok: false, error: "Error al obtener secciones." };
  }
}

// ─── Progreso ─────────────────────────────────────────────────────────────────

export async function obtenerProgresoPorSeccion(): Promise<
  ActionResult<ProgresoSeccion[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  const seccionesWhere = getSeccionesWhereId(usuario);
  if (!seccionesWhere) return { ok: false, error: "Sin sección asignada." };

  try {
    const anioActual = new Date().getFullYear();
    const secciones = await prisma.seccion.findMany({
      where: seccionesWhere,
      select: {
        id: true,
        nombre: true,
        planes_fdoc: {
          where: { anio: anioActual },
          take: 1,
          include: {
            items: { select: { id: true, completado: true } },
          },
        },
      },
      orderBy: { nombre: "asc" },
    });

    return {
      ok: true,
      data: secciones.map((s) => {
        const plan = s.planes_fdoc[0] ?? null;
        const items = plan?.items ?? [];
        const completados = items.filter((i) => i.completado).length;
        const total = items.length;
        return {
          seccion_id: s.id,
          seccion_nombre: s.nombre,
          total_items: total,
          completados,
          porcentaje: total > 0 ? Math.round((completados / total) * 100) : 0,
          plan_id: plan?.id ?? null,
        };
      }),
    };
  } catch {
    return { ok: false, error: "Error al obtener el progreso." };
  }
}

// ─── Plan ─────────────────────────────────────────────────────────────────────

export async function obtenerPlanSeccion(
  seccion_id: string,
): Promise<ActionResult<PlanConItems | null>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  const seccionesWhere = getSeccionesWhereId(usuario);
  if (!seccionesWhere) return { ok: false, error: "Sin acceso." };
  if (seccionesWhere.id && seccionesWhere.id !== seccion_id)
    return { ok: false, error: "Sin acceso a esa sección." };

  try {
    const anioActual = new Date().getFullYear();
    const plan = await prisma.planFDoc.findFirst({
      where: { seccion_id, anio: anioActual },
      include: {
        seccion: { select: { nombre: true } },
        items: {
          orderBy: { orden: "asc" },
          select: {
            id: true,
            tema: true,
            texto_referencia: true,
            objetivo: true,
            semana_estimada: true,
            orden: true,
            completado: true,
          },
        },
      },
    });
    return { ok: true, data: plan };
  } catch {
    return { ok: false, error: "Error al obtener el plan." };
  }
}

export async function crearPlanFDoc(
  seccion_id: string,
  anio: number,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_CREAR_PLAN.includes(usuario.rol))
    return { ok: false, error: "Solo el Jefe de FDoc puede crear planes." };

  if (!seccion_id) return { ok: false, error: "Sección requerida." };
  if (isNaN(anio) || anio < 2020 || anio > 2100)
    return { ok: false, error: "Año inválido." };

  try {
    const plan = await prisma.planFDoc.create({
      data: { anio, seccion_id, creado_por_id: usuario.id },
      select: { id: true },
    });
    revalidatePath("/formacion");
    revalidatePath(`/formacion/plan/${seccion_id}`);
    return { ok: true, data: { id: plan.id } };
  } catch {
    return {
      ok: false,
      error: "Error al crear el plan. ¿Ya existe uno para ese año?",
    };
  }
}

export async function agregarItemPlan(
  plan_id: string,
  item: {
    tema: string;
    texto_referencia?: string;
    objetivo?: string;
    semana_estimada?: number;
  },
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_CREAR_PLAN.includes(usuario.rol))
    return { ok: false, error: "Solo el Jefe de FDoc puede agregar ítems." };

  const tema = item.tema.trim();
  if (!tema) return { ok: false, error: "El tema es requerido." };

  try {
    const ultimo = await prisma.planFDocItem.findFirst({
      where: { plan_id },
      orderBy: { orden: "desc" },
      select: { orden: true },
    });
    const siguienteOrden = (ultimo?.orden ?? 0) + 1;

    const nuevoItem = await prisma.planFDocItem.create({
      data: {
        plan_id,
        tema,
        texto_referencia: item.texto_referencia?.trim() || null,
        objetivo: item.objetivo?.trim() || null,
        semana_estimada: item.semana_estimada ?? null,
        orden: siguienteOrden,
      },
      select: { id: true },
    });

    revalidatePath("/formacion");
    return { ok: true, data: { id: nuevoItem.id } };
  } catch {
    return { ok: false, error: "Error al agregar el ítem." };
  }
}

export async function marcarItemCompletado(
  item_id: string,
  completado: boolean,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "editar"))
    return { ok: false, error: "Sin permiso." };

  try {
    await prisma.planFDocItem.update({
      where: { id: item_id },
      data: { completado },
    });
    revalidatePath("/formacion");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al actualizar el ítem." };
  }
}

// ─── Sesiones ─────────────────────────────────────────────────────────────────

export async function obtenerSesionesPorSeccion(
  seccion_id: string,
): Promise<ActionResult<SesionItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  const seccionesWhere = getSeccionesWhereId(usuario);
  if (!seccionesWhere) return { ok: false, error: "Sin acceso." };
  if (seccionesWhere.id && seccionesWhere.id !== seccion_id)
    return { ok: false, error: "Sin acceso a esa sección." };

  try {
    const sesiones = await prisma.sesionFDoc.findMany({
      where: { seccion_id },
      include: {
        plan_item: { select: { tema: true } },
        registrado_por: { select: { nombre: true, apellido: true } },
        asistencias: { select: { presente: true } },
      },
      orderBy: { fecha: "desc" },
      take: 50,
    });

    return {
      ok: true,
      data: sesiones.map((s) => ({
        id: s.id,
        fecha: s.fecha.toISOString(),
        tema: s.tema,
        observaciones: s.observaciones,
        es_extra: s.es_extra,
        seccion_id: s.seccion_id,
        plan_item_id: s.plan_item_id,
        plan_item: s.plan_item,
        registrado_por: s.registrado_por,
        total_asistencias: s.asistencias.length,
        presentes: s.asistencias.filter((a) => a.presente).length,
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener las sesiones." };
  }
}

export async function obtenerSesionesGlobal(
  seccion_id?: string,
): Promise<ActionResult<SesionConSeccion[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  const seccionesWhere = getSeccionesWhereId(usuario);
  if (!seccionesWhere) return { ok: false, error: "Sin acceso." };

  try {
    const where = {
      ...(seccionesWhere.id ? { seccion_id: seccionesWhere.id } : {}),
      ...(seccion_id ? { seccion_id } : {}),
    };

    const sesiones = await prisma.sesionFDoc.findMany({
      where,
      include: {
        seccion: { select: { nombre: true } },
        plan_item: { select: { tema: true } },
        registrado_por: { select: { nombre: true, apellido: true } },
        asistencias: { select: { presente: true } },
      },
      orderBy: { fecha: "desc" },
      take: 60,
    });

    return {
      ok: true,
      data: sesiones.map((s) => ({
        id: s.id,
        fecha: s.fecha.toISOString(),
        tema: s.tema,
        observaciones: s.observaciones,
        es_extra: s.es_extra,
        seccion_id: s.seccion_id,
        seccion: s.seccion,
        plan_item_id: s.plan_item_id,
        plan_item: s.plan_item,
        registrado_por: s.registrado_por,
        total_asistencias: s.asistencias.length,
        presentes: s.asistencias.filter((a) => a.presente).length,
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener las sesiones." };
  }
}

export async function obtenerMiembrosPorSeccionFDoc(
  seccion_id: string,
): Promise<ActionResult<MiembroFDoc[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const miembros = await prisma.miembro.findMany({
      where: { seccion_id, estado: "ACTIVO" },
      select: { id: true, nombre: true, apellido: true },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });
    return { ok: true, data: miembros };
  } catch {
    return { ok: false, error: "Error al obtener miembros." };
  }
}

export async function registrarSesion(data: {
  seccion_id: string;
  fecha: string;
  es_extra: boolean;
  tema: string;
  observaciones: string | null;
  plan_item_id: string | null;
  asistencias: { miembro_id: string; presente: boolean }[];
}): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "crear"))
    return { ok: false, error: "Sin permiso para registrar sesiones." };

  const seccionesWhere = getSeccionesWhereId(usuario);
  if (!seccionesWhere) return { ok: false, error: "Sin acceso." };
  if (seccionesWhere.id && seccionesWhere.id !== data.seccion_id)
    return { ok: false, error: "Sin acceso a esa sección." };

  const tema = data.tema.trim();
  if (!tema) return { ok: false, error: "El tema es requerido." };
  if (!data.fecha || isNaN(Date.parse(data.fecha)))
    return { ok: false, error: "Fecha inválida." };

  try {
    const sesion = await prisma.$transaction(async (tx) => {
      const nueva = await tx.sesionFDoc.create({
        data: {
          fecha: new Date(data.fecha),
          tema,
          observaciones: data.observaciones,
          es_extra: data.es_extra,
          seccion_id: data.seccion_id,
          registrado_por_id: usuario.id,
          plan_item_id: data.plan_item_id,
        },
        select: { id: true },
      });

      if (data.asistencias.length > 0) {
        await tx.asistenciaFDoc.createMany({
          data: data.asistencias.map((a) => ({
            sesion_id: nueva.id,
            miembro_id: a.miembro_id,
            presente: a.presente,
          })),
          skipDuplicates: true,
        });
      }

      // Marcar el ítem del plan como completado si la sesión está vinculada a él
      if (data.plan_item_id && !data.es_extra) {
        await tx.planFDocItem.update({
          where: { id: data.plan_item_id },
          data: { completado: true },
        });
      }

      return nueva;
    });

    revalidatePath("/formacion");
    revalidatePath(`/formacion/plan/${data.seccion_id}`);
    return { ok: true, data: { id: sesion.id } };
  } catch {
    return { ok: false, error: "Error al registrar la sesión." };
  }
}

// ─── Materiales ───────────────────────────────────────────────────────────────

export async function obtenerMateriales(
  seccion_id?: string,
): Promise<ActionResult<MaterialItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "FORMACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  try {
    const materiales = await prisma.material.findMany({
      where: seccion_id ? { seccion_id } : {},
      include: {
        seccion: { select: { nombre: true } },
        subido_por: { select: { nombre: true, apellido: true } },
      },
      orderBy: { creado_en: "desc" },
    });

    return {
      ok: true,
      data: materiales.map((m) => ({
        ...m,
        creado_en: m.creado_en.toISOString(),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener los materiales." };
  }
}

export async function guardarMaterial(data: {
  nombre: string;
  descripcion: string | null;
  url_archivo: string;
  tipo_archivo: string;
  seccion_id: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_SUBIR_MATERIAL.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para subir materiales." };

  const nombre = data.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es requerido." };
  if (!data.url_archivo)
    return { ok: false, error: "La URL del archivo es requerida." };

  try {
    const material = await prisma.material.create({
      data: {
        nombre,
        descripcion: data.descripcion,
        url_archivo: data.url_archivo,
        tipo_archivo: data.tipo_archivo,
        seccion_id: data.seccion_id,
        subido_por_id: usuario.id,
      },
      select: { id: true },
    });
    revalidatePath("/formacion");
    revalidatePath("/formacion/materiales");
    return { ok: true, data: { id: material.id } };
  } catch {
    return { ok: false, error: "Error al guardar el material." };
  }
}
