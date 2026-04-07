// Cliente-safe: sin imports de next/headers ni supabase-server.
// Importá desde aquí en Client Components.

import type { Rol } from "@prisma/client";

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

export const PERMISOS: MatrizPermisos = {
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
    INTENDENCIA: SIN_ELIMINAR,
    CALENDARIO: LECTURA,
    COMUNICACION: LECTURA,
    MIEMBROS: LECTURA,
    FORMACION: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

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
    COMUNICACION: EDICION,
    CALENDARIO: LECTURA,
    MIEMBROS: LECTURA,
    FORMACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

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
    FORMACION: EDICION,
    CALENDARIO: LECTURA,
    MIEMBROS: LECTURA,
    COMUNICACION: LECTURA,
    INTENDENCIA: LECTURA,
    SECCIONES: LECTURA,
    REPORTES: LECTURA,
    ADMIN: [],
  },

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

// ─── checkPermiso ─────────────────────────────────────────────────────────────

export function checkPermiso(rol: Rol, modulo: Modulo, accion: Accion): boolean {
  const permisosRol = PERMISOS[rol];
  const permisosModulo = permisosRol[modulo];
  if (!permisosModulo) return false;
  return permisosModulo.includes(accion);
}
