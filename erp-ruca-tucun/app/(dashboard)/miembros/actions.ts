"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { EstadoMiembro, Rol } from "@prisma/client";
import type { Prisma } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type MiembroBasico = {
  id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  estado: EstadoMiembro;
  anio_ingreso: number;
  seccion_id: string;
  seccion: { nombre: string };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function calcularEdad(fechaNac: Date): number {
  const hoy = new Date();
  let edad = hoy.getFullYear() - fechaNac.getFullYear();
  const m = hoy.getMonth() - fechaNac.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fechaNac.getDate())) edad--;
  return edad;
}

type UsuarioConSeccion = NonNullable<Awaited<ReturnType<typeof getUsuarioActual>>>;

/** Construye el filtro de Prisma según el rol del usuario. */
function getMiembrosWhere(
  usuario: UsuarioConSeccion,
): Prisma.MiembroWhereInput | null {
  const rolesGlobales: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
  if (rolesGlobales.includes(usuario.rol)) return {};

  const rolesPorAgrupacion: Rol[] = [
    "JEFE_AGRUP_MASCULINA",
    "JEFE_AGRUP_FEMENINA",
    "JEFE_MILICIANOS",
  ];
  if (rolesPorAgrupacion.includes(usuario.rol)) {
    const agrupacion_id = usuario.seccion?.agrupacion?.id;
    if (!agrupacion_id) return null;
    return { seccion: { agrupacion_id } };
  }

  // JEFE_SECCION, SUBJEFE_SECCION y resto con seccion asignada
  if (!usuario.seccion_id) return null;
  return { seccion_id: usuario.seccion_id };
}

/** Verifica que el usuario puede acceder a un miembro concreto. */
async function puedeAccederMiembro(
  usuario: UsuarioConSeccion,
  miembro_id: string,
): Promise<boolean> {
  const where = getMiembrosWhere(usuario);
  if (!where) return false;
  const count = await prisma.miembro.count({
    where: { id: miembro_id, ...where },
  });
  return count > 0;
}

function parsearFormData(formData: FormData) {
  return {
    nombre: (formData.get("nombre") as string | null)?.trim() ?? "",
    apellido: (formData.get("apellido") as string | null)?.trim() ?? "",
    fecha_nacimiento: (formData.get("fecha_nacimiento") as string | null) ?? "",
    seccion_id: (formData.get("seccion_id") as string | null) ?? "",
    anio_ingreso: parseInt(formData.get("anio_ingreso") as string, 10),
    telefono: (formData.get("telefono") as string | null)?.trim() || null,
    email: (formData.get("email") as string | null)?.trim() || null,
    telefono_tutor: (formData.get("telefono_tutor") as string | null)?.trim() || null,
    email_tutor: (formData.get("email_tutor") as string | null)?.trim() || null,
    observaciones: (formData.get("observaciones") as string | null)?.trim() || null,
  };
}

function validarCampos(datos: ReturnType<typeof parsearFormData>): string | null {
  if (!datos.nombre) return "El nombre es requerido.";
  if (!datos.apellido) return "El apellido es requerido.";
  if (!datos.fecha_nacimiento || isNaN(Date.parse(datos.fecha_nacimiento)))
    return "La fecha de nacimiento es inválida.";
  if (!datos.seccion_id) return "La sección es requerida.";
  if (isNaN(datos.anio_ingreso) || datos.anio_ingreso < 1990)
    return "El año de ingreso es inválido.";
  return null;
}

// ─── Server Actions ───────────────────────────────────────────────────────────

export async function crearMiembro(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "MIEMBROS", "crear"))
    return { ok: false, error: "Sin permiso para crear miembros." };

  const datos = parsearFormData(formData);
  const errorValidacion = validarCampos(datos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  // El jefe de sección solo puede crear en su propia sección
  const where = getMiembrosWhere(usuario);
  if (!where) return { ok: false, error: "Sin acceso a esa sección." };

  const fechaNac = new Date(datos.fecha_nacimiento);
  const esmenor = calcularEdad(fechaNac) < 18;

  if (esmenor && !datos.telefono_tutor && !datos.email_tutor) {
    return {
      ok: false,
      error: "El miembro es menor de edad: se requiere al menos un contacto del tutor.",
    };
  }

  try {
    const miembro = await prisma.miembro.create({
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        fecha_nacimiento: fechaNac,
        seccion_id: datos.seccion_id,
        anio_ingreso: datos.anio_ingreso,
        telefono: datos.telefono,
        email: datos.email,
        telefono_tutor: datos.telefono_tutor,
        email_tutor: datos.email_tutor,
        observaciones: datos.observaciones,
        estado: EstadoMiembro.ACTIVO,
      },
      select: { id: true },
    });

    revalidatePath("/miembros");
    return { ok: true, data: { id: miembro.id } };
  } catch {
    return { ok: false, error: "Error al guardar el miembro. Intente nuevamente." };
  }
}

export async function editarMiembro(
  id: string,
  formData: FormData,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "MIEMBROS", "editar"))
    return { ok: false, error: "Sin permiso para editar miembros." };
  if (!(await puedeAccederMiembro(usuario, id)))
    return { ok: false, error: "Sin acceso a ese miembro." };

  const datos = parsearFormData(formData);
  const errorValidacion = validarCampos(datos);
  if (errorValidacion) return { ok: false, error: errorValidacion };

  const fechaNac = new Date(datos.fecha_nacimiento);

  try {
    await prisma.miembro.update({
      where: { id },
      data: {
        nombre: datos.nombre,
        apellido: datos.apellido,
        fecha_nacimiento: fechaNac,
        anio_ingreso: datos.anio_ingreso,
        telefono: datos.telefono,
        email: datos.email,
        telefono_tutor: datos.telefono_tutor,
        email_tutor: datos.email_tutor,
        observaciones: datos.observaciones,
      },
    });

    revalidatePath(`/miembros/${id}`);
    revalidatePath("/miembros");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al actualizar el miembro." };
  }
}

export async function darDeBajaMiembro(id: string): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "MIEMBROS", "eliminar"))
    return { ok: false, error: "Sin permiso para dar de baja miembros." };
  if (!(await puedeAccederMiembro(usuario, id)))
    return { ok: false, error: "Sin acceso a ese miembro." };

  try {
    await prisma.miembro.update({
      where: { id },
      data: { estado: EstadoMiembro.EGRESADO },
    });

    revalidatePath(`/miembros/${id}`);
    revalidatePath("/miembros");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al dar de baja al miembro." };
  }
}

export async function registrarAsistencia(
  actividad_id: string,
  registros: { miembro_id: string; presente: boolean }[],
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "MIEMBROS", "editar"))
    return { ok: false, error: "Sin permiso para registrar asistencia." };

  try {
    await prisma.$transaction(
      registros.map((r) =>
        prisma.asistencia.upsert({
          where: {
            miembro_id_actividad_id: {
              miembro_id: r.miembro_id,
              actividad_id,
            },
          },
          update: { presente: r.presente, registrado_por_id: usuario.id },
          create: {
            miembro_id: r.miembro_id,
            actividad_id,
            presente: r.presente,
            registrado_por_id: usuario.id,
          },
        }),
      ),
    );

    revalidatePath("/miembros");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al guardar la asistencia." };
  }
}

export async function obtenerMiembrosPorSeccion(
  seccion_id: string,
): Promise<ActionResult<MiembroBasico[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "MIEMBROS", "ver"))
    return { ok: false, error: "Sin permiso." };

  const where = getMiembrosWhere(usuario);
  if (!where) return { ok: false, error: "Sin acceso." };

  try {
    const miembros = await prisma.miembro.findMany({
      where: { ...where, seccion_id, estado: EstadoMiembro.ACTIVO },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        foto_url: true,
        estado: true,
        anio_ingreso: true,
        seccion_id: true,
        seccion: { select: { nombre: true } },
      },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });
    return { ok: true, data: miembros };
  } catch {
    return { ok: false, error: "Error al obtener los miembros." };
  }
}
