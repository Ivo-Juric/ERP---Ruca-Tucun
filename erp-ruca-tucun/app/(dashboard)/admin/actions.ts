"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import { supabaseAdmin } from "@/lib/supabase";
import type { Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type UsuarioAdmin = {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  estado: "ACTIVO" | "INACTIVO" | "SUSPENDIDO";
  seccion: { id: string; nombre: string } | null;
  departamento: { id: string; nombre: string } | null;
  creado_en: string;
};

export type SeccionOpcion = { id: string; nombre: string };
export type DepartamentoOpcion = { id: string; nombre: string };

// ─── Guard ───────────────────────────────────────────────────────────────────

async function soloJefeRuca() {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false as const, error: "No autenticado." };
  if (usuario.rol !== "JEFE_RUCA")
    return { ok: false as const, error: "Solo el Jefe de Ruca puede realizar esta acción." };
  return { ok: true as const, usuario };
}

// ─── Listar ──────────────────────────────────────────────────────────────────

export async function obtenerUsuarios(): Promise<ActionResult<UsuarioAdmin[]>> {
  const guard = await soloJefeRuca();
  if (!guard.ok) return guard;

  try {
    const usuarios = await prisma.usuario.findMany({
      include: {
        seccion: { select: { id: true, nombre: true } },
        departamento: { select: { id: true, nombre: true } },
      },
      orderBy: [{ estado: "asc" }, { apellido: "asc" }],
    });

    return {
      ok: true,
      data: usuarios.map((u) => ({
        id: u.id,
        email: u.email,
        nombre: u.nombre,
        apellido: u.apellido,
        rol: u.rol,
        estado: u.estado,
        seccion: u.seccion,
        departamento: u.departamento,
        creado_en: u.creado_en.toISOString(),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener usuarios." };
  }
}

export async function obtenerOpcionesFormulario(): Promise<{
  secciones: SeccionOpcion[];
  departamentos: DepartamentoOpcion[];
}> {
  const [secciones, departamentos] = await Promise.all([
    prisma.seccion.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.departamento.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    }),
  ]);
  return { secciones, departamentos };
}

// ─── Crear ───────────────────────────────────────────────────────────────────

export async function crearUsuario(data: {
  email: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  seccion_id: string | null;
  departamento_id: string | null;
  password_temporal: string;
}): Promise<ActionResult<{ id: string }>> {
  const guard = await soloJefeRuca();
  if (!guard.ok) return guard;

  const email = data.email.trim().toLowerCase();
  const nombre = data.nombre.trim();
  const apellido = data.apellido.trim();

  if (!email || !nombre || !apellido)
    return { ok: false, error: "Email, nombre y apellido son requeridos." };
  if (!data.password_temporal || data.password_temporal.length < 8)
    return { ok: false, error: "La contraseña temporal debe tener al menos 8 caracteres." };

  // Validar que ya no exista
  const existente = await prisma.usuario.findUnique({ where: { email } });
  if (existente) return { ok: false, error: "Ya existe un usuario con ese email." };

  try {
    // 1. Crear en Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password_temporal,
        email_confirm: true, // No requiere verificación de email
      });

    if (authError || !authData.user) {
      return {
        ok: false,
        error: authError?.message ?? "Error al crear el usuario en Auth.",
      };
    }

    // 2. Insertar en tabla Usuario
    const usuario = await prisma.usuario.create({
      data: {
        id: authData.user.id,
        email,
        nombre,
        apellido,
        rol: data.rol,
        estado: "ACTIVO",
        seccion_id: data.seccion_id,
        departamento_id: data.departamento_id,
      },
      select: { id: true },
    });

    revalidatePath("/admin");
    return { ok: true, data: { id: usuario.id } };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Error al crear el usuario.",
    };
  }
}

// ─── Suspender / Reactivar ───────────────────────────────────────────────────

export async function suspenderUsuario(
  id: string,
): Promise<ActionResult<undefined>> {
  const guard = await soloJefeRuca();
  if (!guard.ok) return guard;

  if (id === guard.usuario.id)
    return { ok: false, error: "No podés suspender tu propia cuenta." };

  try {
    // Deshabilitar en Supabase Auth
    await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "876000h" });

    await prisma.usuario.update({
      where: { id },
      data: { estado: "SUSPENDIDO" },
    });

    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al suspender el usuario." };
  }
}

export async function reactivarUsuario(
  id: string,
): Promise<ActionResult<undefined>> {
  const guard = await soloJefeRuca();
  if (!guard.ok) return guard;

  try {
    // Rehabilitar en Supabase Auth (ban_duration = "none" lo reactiva)
    await supabaseAdmin.auth.admin.updateUserById(id, { ban_duration: "none" });

    await prisma.usuario.update({
      where: { id },
      data: { estado: "ACTIVO" },
    });

    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al reactivar el usuario." };
  }
}

// ─── Restablecer contraseña ───────────────────────────────────────────────────

export async function restablecerContrasena(
  email: string,
): Promise<ActionResult<undefined>> {
  const guard = await soloJefeRuca();
  if (!guard.ok) return guard;

  try {
    const { error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: email.trim().toLowerCase(),
    });

    if (error)
      return {
        ok: false,
        error: error.message ?? "Error al generar el link de recuperación.",
      };

    // En producción el link se envía por email automáticamente.
    // En dev podés acceder al link desde el resultado si necesitás.

    revalidatePath("/admin");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al restablecer la contraseña." };
  }
}
