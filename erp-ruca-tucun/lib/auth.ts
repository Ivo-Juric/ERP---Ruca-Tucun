import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@/lib/supabase";
import { Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type Accion = "ver" | "crear" | "editar" | "eliminar" | "aprobar";

export type Modulo =
  | "DASHBOARD"
  | "COMUNICACION"
  | "CALENDARIO"
  | "FORMACION"
  | "MIEMBROS"
  | "INTENDENCIA"
  | "SECCIONES"
  | "REPORTES"
  | "ADMIN";

type MatrizPermisos = Record<Rol, Partial<Record<Modulo, Accion[]>>>;

// ─── Helpers de conjuntos de acciones ────────────────────────────────────────

const TODOS: Accion[] = ["ver", "crear", "editar", "eliminar", "aprobar"];
const LECTURA: Accion[] = ["ver"];
const EDICION: Accion[] = ["ver", "crear", "editar"];
const EDICION_Y_APROBAR: Accion[] = ["ver", "crear", "editar", "aprobar"];
const SIN_ELIMINAR: Accion[] = ["ver", "crear", "editar", "aprobar"];

// ─── Matriz de permisos ──────────────────────────────────────────────────────
//
// Nivel base por módulo. Las restricciones por sección/agrupación específica
// se validan en la capa de negocio con el campo seccion_id / agrupacion del usuario.

export const PERMISOS: MatrizPermisos = {
  // ── Jefe de Ruca: acceso total ───────────────────────────────────────────
  JEFE_RUCA: {
    DASHBOARD: TODOS,
    COMUNICACION: TODOS,
    CALENDARIO: TODOS,
    FORMACION: TODOS,
    MIEMBROS: TODOS,
    INTENDENCIA: TODOS,
    SECCIONES: TODOS,
    REPORTES: TODOS,
    ADMIN: TODOS,
  },

  // ── Secretario: gestión en COM/CAL/MIEMBROS/REPORTES, lectura en el resto ─
  SECRETARIO: {
    DASHBOARD: LECTURA,
    COMUNICACION: EDICION,
    CALENDARIO: EDICION,
    MIEMBROS: EDICION,
    REPORTES: EDICION,
    FORMACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    ADMIN: LECTURA,
  },

  // ── Intendencia ──────────────────────────────────────────────────────────
  JEFE_INTENDENCIA: {
    DASHBOARD: LECTURA,
    INTENDENCIA: TODOS,
    CALENDARIO: LECTURA,
    MIEMBROS: LECTURA,
    COMUNICACION: LECTURA,
    FORMACION: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  SUBJEFE_INTENDENCIA: {
    DASHBOARD: LECTURA,
    INTENDENCIA: SIN_ELIMINAR, // no puede eliminar ítems del inventario
    CALENDARIO: LECTURA,
    COMUNICACION: LECTURA,
    MIEMBROS: LECTURA,
    FORMACION: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  // ── Comunicaciones ───────────────────────────────────────────────────────
  JEFE_COMUNICACIONES: {
    DASHBOARD: LECTURA,
    COMUNICACION: TODOS,
    MIEMBROS: LECTURA,
    CALENDARIO: LECTURA,
    FORMACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  SUBJEFE_COMUNICACIONES: {
    DASHBOARD: LECTURA,
    // "aprobar" = publicar en el tablón → solo el jefe puede hacerlo
    COMUNICACION: EDICION,
    CALENDARIO: LECTURA,
    MIEMBROS: LECTURA,
    FORMACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  // ── Formación Doctrinal ──────────────────────────────────────────────────
  JEFE_FDOC: {
    DASHBOARD: LECTURA,
    FORMACION: TODOS,
    CALENDARIO: EDICION,
    MIEMBROS: LECTURA,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  SUBJEFE_FDOC: {
    DASHBOARD: LECTURA,
    // Sin "aprobar" = sin modificar el plan anual (PlanFDoc)
    FORMACION: EDICION,
    CALENDARIO: LECTURA,
    MIEMBROS: LECTURA,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  // ── Jefe de Milicianos: full sobre su agrupación ─────────────────────────
  JEFE_MILICIANOS: {
    DASHBOARD: LECTURA,
    MIEMBROS: TODOS,
    CALENDARIO: TODOS,
    SECCIONES: TODOS,
    FORMACION: EDICION_Y_APROBAR,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  // ── Jefes de agrupación: lectura de secciones, gestión parcial ───────────
  JEFE_AGRUP_MASCULINA: {
    DASHBOARD: LECTURA,
    SECCIONES: LECTURA,
    MIEMBROS: EDICION,
    CALENDARIO: EDICION,
    FORMACION: LECTURA,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  JEFE_AGRUP_FEMENINA: {
    DASHBOARD: LECTURA,
    SECCIONES: LECTURA,
    MIEMBROS: EDICION,
    CALENDARIO: EDICION,
    FORMACION: LECTURA,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  // ── Jefe de Sección: full sobre su sección ───────────────────────────────
  JEFE_SECCION: {
    DASHBOARD: LECTURA,
    MIEMBROS: TODOS,
    CALENDARIO: TODOS,
    FORMACION: TODOS,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

  // ── Subjefe de Sección: sin crear/eliminar miembros ni crear actividades ──
  SUBJEFE_SECCION: {
    DASHBOARD: LECTURA,
    MIEMBROS: ["ver", "editar"],
    CALENDARIO: ["ver", "editar"],
    FORMACION: ["ver", "editar"],
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },
};

// ─── Funciones de utilidad ───────────────────────────────────────────────────

export function checkPermiso(rol: Rol, modulo: Modulo, accion: Accion): boolean {
  const permisosRol = PERMISOS[rol];
  const permisosModulo = permisosRol[modulo];
  if (!permisosModulo) return false;
  return permisosModulo.includes(accion);
}

/**
 * Obtiene la sesión activa del servidor.
 * Usar en Server Components y Server Actions.
 */
export async function getSession() {
  const supabase = createServerComponentClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Obtiene el usuario completo desde la base de datos,
 * incluyendo su rol, sección y departamento.
 * Retorna null si no hay sesión o el usuario no existe en la DB.
 */
export async function getUsuarioActual() {
  const session = await getSession();
  if (!session?.user?.email) return null;

  return prisma.usuario.findUnique({
    where: { email: session.user.email },
    include: {
      seccion: {
        include: {
          agrupacion: true,
        },
      },
      departamento: true,
    },
  });
}
