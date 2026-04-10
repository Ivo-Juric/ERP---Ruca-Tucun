"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import {
  CategoriaInventario,
  EstadoConservacion,
  EstadoSolicitud,
  Rol,
} from "@prisma/client";
import type { Prisma } from "@prisma/client";
import {
  getDisponibilidadItem,
  getDisponibilidadSemana,
  getLunesDeSemana,
} from "@/lib/disponibilidad";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type InventarioItem = {
  id: string;
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaInventario;
  cantidad_total: number;
  cantidad_disponible: number;
  estado_conservacion: EstadoConservacion;
  ubicacion: string | null;
  stock_minimo: number;
  stock_bajo: boolean;
};

export type SolicitudItem = {
  id: string;
  cantidad: number;
  estado: EstadoSolicitud;
  cantidad_aprobada: number | null;
  comentario_respuesta: string | null;
  fecha_uso: string;
  fecha_devolucion_esperada: string | null;
  devuelto: boolean;
  confirmado_por_jefe: boolean;
  creado_en: string;
  item: { id: string; nombre: string; categoria: CategoriaInventario };
  actividad: { titulo: string; fecha_inicio: string };
  solicitado_por: {
    id: string;
    nombre: string;
    apellido: string;
    seccion_id: string | null;
    seccion: { nombre: string } | null;
  };
};

export type PrestamoActivo = SolicitudItem & {
  vencido: boolean;
  dias_restantes: number | null;
};

export type ItemDisponible = {
  id: string;
  nombre: string;
  categoria: CategoriaInventario;
  cantidad_disponible: number;
};

export type ActividadOpcion = {
  id: string;
  titulo: string;
  fecha_inicio: string;
};

export type SolicitudActivaRow = {
  id: string;
  cantidad: number;
  cantidad_aprobada: number | null;
  fecha_uso: string;
  fecha_devolucion_esperada: string | null;
  actividad: { titulo: string };
  solicitado_por: {
    nombre: string;
    apellido: string;
    seccion: { nombre: string } | null;
  };
};

export type DisponibilidadSemanaRow = {
  item: {
    id: string;
    nombre: string;
    descripcion: string | null;
    categoria: CategoriaInventario;
    cantidad_total: number;
  };
  total: number;
  ocupado: number;
  disponible: number;
  solicitudesActivas: SolicitudActivaRow[];
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ROLES_VER_INVENTARIO: Rol[] = [
  "JEFE_RUCA",
  "JEFE_INTENDENCIA",
  "SUBJEFE_INTENDENCIA",
  "SECRETARIO",
];
const ROLES_CREAR_ITEM: Rol[] = ["JEFE_RUCA", "JEFE_INTENDENCIA"];
const ROLES_EDITAR_ITEM: Rol[] = [
  "JEFE_RUCA",
  "JEFE_INTENDENCIA",
  "SUBJEFE_INTENDENCIA",
];
const ROLES_GESTIONAR_SOLICITUDES: Rol[] = [
  "JEFE_RUCA",
  "JEFE_INTENDENCIA",
  "SUBJEFE_INTENDENCIA",
];
// Roles que pueden crear solicitudes (jefes y subjefes de sección)
const ROLES_SOLICITAR: Rol[] = [
  "JEFE_RUCA",
  "JEFE_SECCION",
  "SUBJEFE_SECCION",
  "JEFE_MILICIANOS",
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
];

function solidarFecha(d: Date): string {
  return d.toISOString();
}

// ─── Inventario ───────────────────────────────────────────────────────────────

export async function obtenerInventario(filtros?: {
  categoria?: CategoriaInventario;
  estado_conservacion?: EstadoConservacion;
}): Promise<ActionResult<InventarioItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_VER_INVENTARIO.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para ver el inventario." };

  const where: Prisma.ItemInventarioWhereInput = {
    ...(filtros?.categoria && { categoria: filtros.categoria }),
    ...(filtros?.estado_conservacion && {
      estado_conservacion: filtros.estado_conservacion,
    }),
  };

  try {
    const items = await prisma.itemInventario.findMany({
      where,
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });

    return {
      ok: true,
      data: items.map((i) => ({
        ...i,
        stock_bajo: i.cantidad_disponible <= i.stock_minimo,
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener el inventario." };
  }
}

export async function obtenerInventarioConAlertas(): Promise<
  ActionResult<InventarioItem[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_VER_INVENTARIO.includes(usuario.rol))
    return { ok: false, error: "Sin permiso." };

  try {
    // Prisma no puede comparar dos campos en el where directamente,
    // así que traemos todos y filtramos en JS:
    const todos = await prisma.itemInventario.findMany({
      orderBy: { nombre: "asc" },
    });

    const conAlerta = todos.filter((i) => i.cantidad_disponible <= i.stock_minimo);
    return {
      ok: true,
      data: conAlerta.map((i) => ({
        ...i,
        stock_bajo: true,
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener alertas." };
  }
}

export async function obtenerItemsDisponibles(): Promise<
  ActionResult<ItemDisponible[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const items = await prisma.itemInventario.findMany({
      where: { cantidad_disponible: { gt: 0 } },
      select: {
        id: true,
        nombre: true,
        categoria: true,
        cantidad_disponible: true,
      },
      orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
    });
    return { ok: true, data: items };
  } catch {
    return { ok: false, error: "Error al obtener ítems." };
  }
}

export async function crearItem(data: {
  nombre: string;
  descripcion: string | null;
  categoria: CategoriaInventario;
  cantidad_total: number;
  estado_conservacion: EstadoConservacion;
  ubicacion: string | null;
  stock_minimo: number;
}): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_CREAR_ITEM.includes(usuario.rol))
    return { ok: false, error: "Solo el Jefe de Intendencia puede crear ítems." };

  const nombre = data.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es requerido." };
  if (data.cantidad_total < 0)
    return { ok: false, error: "La cantidad no puede ser negativa." };

  try {
    const item = await prisma.itemInventario.create({
      data: {
        nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        cantidad_total: data.cantidad_total,
        cantidad_disponible: data.cantidad_total, // inicia igual a total
        estado_conservacion: data.estado_conservacion,
        ubicacion: data.ubicacion,
        stock_minimo: data.stock_minimo,
      },
      select: { id: true },
    });
    revalidatePath("/intendencia");
    return { ok: true, data: { id: item.id } };
  } catch {
    return { ok: false, error: "Error al crear el ítem." };
  }
}

export async function editarItem(
  id: string,
  data: {
    nombre: string;
    descripcion: string | null;
    categoria: CategoriaInventario;
    cantidad_total: number;
    estado_conservacion: EstadoConservacion;
    ubicacion: string | null;
    stock_minimo: number;
  },
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_EDITAR_ITEM.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para editar ítems." };

  const nombre = data.nombre.trim();
  if (!nombre) return { ok: false, error: "El nombre es requerido." };

  try {
    // Calcular diferencia para ajustar disponible
    const actual = await prisma.itemInventario.findUnique({
      where: { id },
      select: { cantidad_total: true, cantidad_disponible: true },
    });
    if (!actual) return { ok: false, error: "Ítem no encontrado." };

    const diferencia = data.cantidad_total - actual.cantidad_total;
    const nuevaDisponible = Math.max(0, actual.cantidad_disponible + diferencia);

    await prisma.itemInventario.update({
      where: { id },
      data: {
        nombre,
        descripcion: data.descripcion,
        categoria: data.categoria,
        cantidad_total: data.cantidad_total,
        cantidad_disponible: nuevaDisponible,
        estado_conservacion: data.estado_conservacion,
        ubicacion: data.ubicacion,
        stock_minimo: data.stock_minimo,
      },
    });
    revalidatePath("/intendencia");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al editar el ítem." };
  }
}

// ─── Solicitudes ──────────────────────────────────────────────────────────────

export async function obtenerActividadesParaSolicitud(): Promise<
  ActionResult<ActividadOpcion[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const where: Prisma.ActividadWhereInput = {
      estado: { in: ["PLANIFICADA", "CONFIRMADA"] },
      fecha_inicio: { gte: new Date() },
      ...(usuario.seccion_id ? { seccion_id: usuario.seccion_id } : {}),
    };

    const actividades = await prisma.actividad.findMany({
      where,
      select: { id: true, titulo: true, fecha_inicio: true },
      orderBy: { fecha_inicio: "asc" },
      take: 30,
    });

    return {
      ok: true,
      data: actividades.map((a) => ({
        ...a,
        fecha_inicio: solidarFecha(a.fecha_inicio),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener actividades." };
  }
}

function mapearSolicitud(
  s: Awaited<
    ReturnType<typeof prisma.solicitudRecurso.findMany>
  >[number] & {
    item: { id: string; nombre: string; categoria: CategoriaInventario };
    actividad: { titulo: string; fecha_inicio: Date };
    solicitado_por: {
      id: string;
      nombre: string;
      apellido: string;
      seccion_id: string | null;
      seccion: { nombre: string } | null;
    };
  },
): SolicitudItem {
  return {
    id: s.id,
    cantidad: s.cantidad,
    estado: s.estado,
    cantidad_aprobada: s.cantidad_aprobada,
    comentario_respuesta: s.comentario_respuesta,
    fecha_uso: solidarFecha(s.fecha_uso),
    fecha_devolucion_esperada: s.fecha_devolucion_esperada
      ? solidarFecha(s.fecha_devolucion_esperada)
      : null,
    devuelto: s.devuelto,
    confirmado_por_jefe: s.confirmado_por_jefe,
    creado_en: solidarFecha(s.creado_en),
    item: s.item,
    actividad: {
      titulo: s.actividad.titulo,
      fecha_inicio: solidarFecha(s.actividad.fecha_inicio),
    },
    solicitado_por: s.solicitado_por,
  };
}

const INCLUDE_SOLICITUD = {
  item: { select: { id: true, nombre: true, categoria: true } },
  actividad: { select: { titulo: true, fecha_inicio: true } },
  solicitado_por: {
    select: {
      id: true,
      nombre: true,
      apellido: true,
      seccion_id: true,
      seccion: { select: { nombre: true } },
    },
  },
} as const;

export async function obtenerSolicitudes(): Promise<
  ActionResult<SolicitudItem[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  let where: Prisma.SolicitudRecursoWhereInput = {};

  if (
    usuario.rol === "JEFE_INTENDENCIA" ||
    usuario.rol === "SUBJEFE_INTENDENCIA"
  ) {
    where = { estado: EstadoSolicitud.PENDIENTE_INTENDENCIA };
  } else if (
    usuario.rol === "JEFE_RUCA" ||
    usuario.rol === "SECRETARIO"
  ) {
    where = {}; // todas
  } else if (usuario.rol === "JEFE_SECCION") {
    // Ve las de su sección (suyas y las de su subjefe)
    where = {
      solicitado_por: { seccion_id: usuario.seccion_id ?? "__none__" },
    };
  } else if (usuario.rol === "SUBJEFE_SECCION") {
    where = { solicitado_por_id: usuario.id };
  } else {
    return { ok: false, error: "Sin permiso." };
  }

  try {
    const solicitudes = await prisma.solicitudRecurso.findMany({
      where,
      include: INCLUDE_SOLICITUD,
      orderBy: { creado_en: "desc" },
      take: 100,
    });

    return { ok: true, data: solicitudes.map(mapearSolicitud) };
  } catch {
    return { ok: false, error: "Error al obtener solicitudes." };
  }
}

export async function obtenerPrestamosActivos(): Promise<
  ActionResult<PrestamoActivo[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_GESTIONAR_SOLICITUDES.includes(usuario.rol))
    return { ok: false, error: "Sin permiso." };

  try {
    const solicitudes = await prisma.solicitudRecurso.findMany({
      where: {
        estado: { in: [EstadoSolicitud.APROBADA, EstadoSolicitud.APROBADA_PARCIAL] },
        devuelto: false,
      },
      include: INCLUDE_SOLICITUD,
      orderBy: { fecha_devolucion_esperada: "asc" },
    });

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    return {
      ok: true,
      data: solicitudes.map((s) => {
        const base = mapearSolicitud(s);
        const fechaDev = s.fecha_devolucion_esperada;
        let vencido = false;
        let dias_restantes: number | null = null;

        if (fechaDev) {
          const diff = Math.floor(
            (fechaDev.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24),
          );
          dias_restantes = diff;
          vencido = diff < 0;
        }

        return { ...base, vencido, dias_restantes };
      }),
    };
  } catch {
    return { ok: false, error: "Error al obtener préstamos." };
  }
}

export async function crearSolicitud(data: {
  item_id: string;
  cantidad: number;
  actividad_id: string;
  fecha_uso: string;
  fecha_devolucion_esperada: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_SOLICITAR.includes(usuario.rol))
    return {
      ok: false,
      error: "Solo los jefes de sección pueden solicitar recursos.",
    };

  if (data.cantidad <= 0)
    return { ok: false, error: "La cantidad debe ser mayor a cero." };
  if (!data.fecha_uso || isNaN(Date.parse(data.fecha_uso)))
    return { ok: false, error: "Fecha de uso inválida." };

  // Verificar disponibilidad dinámica para la semana de uso
  const item = await prisma.itemInventario.findUnique({
    where: { id: data.item_id },
    select: { id: true, nombre: true },
  });
  if (!item) return { ok: false, error: "Ítem no encontrado." };

  const semanaInicio = getLunesDeSemana(new Date(data.fecha_uso));
  const disp = await getDisponibilidadItem(data.item_id, semanaInicio);
  if (data.cantidad > disp.disponible)
    return {
      ok: false,
      error: `Solo hay ${disp.disponible} unidades disponibles esa semana para "${item.nombre}".`,
    };

  // SUBJEFE_SECCION: queda en PENDIENTE_JEFE; el resto va directo a PENDIENTE_INTENDENCIA
  const estado =
    usuario.rol === "SUBJEFE_SECCION"
      ? EstadoSolicitud.PENDIENTE_JEFE
      : EstadoSolicitud.PENDIENTE_INTENDENCIA;

  try {
    const solicitud = await prisma.solicitudRecurso.create({
      data: {
        item_id: data.item_id,
        cantidad: data.cantidad,
        actividad_id: data.actividad_id,
        solicitado_por_id: usuario.id,
        fecha_uso: new Date(data.fecha_uso),
        fecha_devolucion_esperada: data.fecha_devolucion_esperada
          ? new Date(data.fecha_devolucion_esperada)
          : null,
        estado,
        confirmado_por_jefe: false,
      },
      select: { id: true },
    });
    revalidatePath("/intendencia");
    return { ok: true, data: { id: solicitud.id } };
  } catch {
    return { ok: false, error: "Error al crear la solicitud." };
  }
}

export async function confirmarSolicitudJefe(
  id: string,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (usuario.rol !== "JEFE_SECCION" && usuario.rol !== "JEFE_RUCA")
    return { ok: false, error: "Solo el Jefe de Sección puede confirmar." };

  const solicitud = await prisma.solicitudRecurso.findUnique({
    where: { id },
    include: {
      solicitado_por: { select: { seccion_id: true } },
    },
  });
  if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };
  if (solicitud.estado !== EstadoSolicitud.PENDIENTE_JEFE)
    return { ok: false, error: "Esta solicitud no está pendiente de confirmación." };

  // JEFE_SECCION solo puede confirmar solicitudes de su sección
  if (
    usuario.rol === "JEFE_SECCION" &&
    solicitud.solicitado_por.seccion_id !== usuario.seccion_id
  ) {
    return { ok: false, error: "Sin acceso a esa solicitud." };
  }

  try {
    await prisma.solicitudRecurso.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.PENDIENTE_INTENDENCIA,
        confirmado_por_jefe: true,
      },
    });
    revalidatePath("/intendencia");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al confirmar la solicitud." };
  }
}

export async function aprobarSolicitud(
  id: string,
  cantidad_aprobada: number,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_GESTIONAR_SOLICITUDES.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para aprobar solicitudes." };

  if (cantidad_aprobada <= 0)
    return { ok: false, error: "La cantidad aprobada debe ser mayor a cero." };

  const solicitud = await prisma.solicitudRecurso.findUnique({
    where: { id },
    select: {
      estado: true,
      cantidad: true,
      item_id: true,
      fecha_uso: true,
    },
  });
  if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };
  if (solicitud.estado !== EstadoSolicitud.PENDIENTE_INTENDENCIA)
    return { ok: false, error: "Solo se pueden aprobar solicitudes pendientes de intendencia." };

  // Verificar disponibilidad dinámica para la semana de uso,
  // excluyendo esta misma solicitud del cálculo.
  const semanaInicio = getLunesDeSemana(solicitud.fecha_uso);
  const disp = await getDisponibilidadItem(solicitud.item_id, semanaInicio, id);
  if (cantidad_aprobada > disp.disponible)
    return {
      ok: false,
      error: `Cantidad supera la disponibilidad de esa semana (${disp.disponible} disponibles).`,
    };

  const nuevoEstado =
    cantidad_aprobada < solicitud.cantidad
      ? EstadoSolicitud.APROBADA_PARCIAL
      : EstadoSolicitud.APROBADA;

  try {
    // cantidad_disponible en items_inventario no se toca al aprobar;
    // la disponibilidad real se calcula siempre dinámicamente.
    await prisma.solicitudRecurso.update({
      where: { id },
      data: { estado: nuevoEstado, cantidad_aprobada },
    });
    revalidatePath("/intendencia");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al aprobar la solicitud." };
  }
}

export async function rechazarSolicitud(
  id: string,
  comentario: string,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_GESTIONAR_SOLICITUDES.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para rechazar solicitudes." };

  const solicitud = await prisma.solicitudRecurso.findUnique({
    where: { id },
    select: { estado: true },
  });
  if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };
  if (solicitud.estado !== EstadoSolicitud.PENDIENTE_INTENDENCIA)
    return {
      ok: false,
      error: "Solo se pueden rechazar solicitudes pendientes de intendencia.",
    };

  try {
    await prisma.solicitudRecurso.update({
      where: { id },
      data: {
        estado: EstadoSolicitud.RECHAZADA,
        comentario_respuesta: comentario.trim() || "Sin comentario.",
      },
    });
    revalidatePath("/intendencia");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al rechazar la solicitud." };
  }
}

// ─── Disponibilidad dinámica ──────────────────────────────────────────────────

export async function obtenerDisponibilidadSemana(
  semanaInicioISO: string,
): Promise<ActionResult<DisponibilidadSemanaRow[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_VER_INVENTARIO.includes(usuario.rol))
    return { ok: false, error: "Sin permiso." };

  try {
    const semanaInicio = new Date(semanaInicioISO);
    const datos = await getDisponibilidadSemana(semanaInicio);

    return {
      ok: true,
      data: datos.map((d) => ({
        item: {
          id: d.item.id,
          nombre: d.item.nombre,
          descripcion: d.item.descripcion,
          categoria: d.item.categoria,
          cantidad_total: d.item.cantidad_total,
        },
        total: d.total,
        ocupado: d.ocupado,
        disponible: d.disponible,
        solicitudesActivas: d.solicitudesActivas.map((s) => ({
          id: s.id,
          cantidad: s.cantidad,
          cantidad_aprobada: s.cantidad_aprobada,
          fecha_uso: s.fecha_uso.toISOString(),
          fecha_devolucion_esperada: s.fecha_devolucion_esperada
            ? s.fecha_devolucion_esperada.toISOString()
            : null,
          actividad: s.actividad,
          solicitado_por: s.solicitado_por,
        })),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener disponibilidad." };
  }
}

export async function consultarDisponibilidadItem(
  itemId: string,
  fechaUsoISO: string,
): Promise<ActionResult<{ total: number; ocupado: number; disponible: number }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const semanaInicio = getLunesDeSemana(new Date(fechaUsoISO));
    const disp = await getDisponibilidadItem(itemId, semanaInicio);
    return { ok: true, data: disp };
  } catch {
    return { ok: false, error: "Error al consultar disponibilidad." };
  }
}

export async function registrarDevolucion(
  solicitud_id: string,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_GESTIONAR_SOLICITUDES.includes(usuario.rol))
    return { ok: false, error: "Sin permiso." };

  const solicitud = await prisma.solicitudRecurso.findUnique({
    where: { id: solicitud_id },
    select: {
      estado: true,
      devuelto: true,
      cantidad_aprobada: true,
      cantidad: true,
      item_id: true,
    },
  });
  if (!solicitud) return { ok: false, error: "Solicitud no encontrada." };
  if (solicitud.devuelto) return { ok: false, error: "Ya fue registrada la devolución." };
  if (
    solicitud.estado !== EstadoSolicitud.APROBADA &&
    solicitud.estado !== EstadoSolicitud.APROBADA_PARCIAL
  ) {
    return { ok: false, error: "Solo se pueden devolver recursos aprobados." };
  }

  const cantidadADevolver = solicitud.cantidad_aprobada ?? solicitud.cantidad;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.solicitudRecurso.update({
        where: { id: solicitud_id },
        data: { devuelto: true },
      });
      await tx.itemInventario.update({
        where: { id: solicitud.item_id },
        data: { cantidad_disponible: { increment: cantidadADevolver } },
      });
    });
    revalidatePath("/intendencia");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al registrar la devolución." };
  }
}
