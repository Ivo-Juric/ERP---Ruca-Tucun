import type { Rol } from "@prisma/client";

export interface UsuarioParaPermiso {
  id: string;
  rol: Rol;
  seccion_id: string | null;
  seccion?: { agrupacion?: { id: string } | null } | null;
}

export interface ActividadParaPermiso {
  creado_por_id: string;
  seccion_id: string | null;
  agrupacion_id: string | null;
  seccion?: { agrupacion?: { id: string } | null } | null;
}

const ROLES_SUBJEFE: Rol[] = [
  "SUBJEFE_SECCION",
  "SUBJEFE_INTENDENCIA",
  "SUBJEFE_FDOC",
  "SUBJEFE_COMUNICACIONES",
];

const ROLES_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];

const ROLES_DEPARTAMENTO: Rol[] = [
  "JEFE_FDOC",
  "JEFE_INTENDENCIA",
  "JEFE_COMUNICACIONES",
];

export function puedeEditarActividad(
  usuario: UsuarioParaPermiso,
  actividad: ActividadParaPermiso,
): boolean {
  if (usuario.rol === "JEFE_RUCA") return true;
  if (usuario.rol === "SECRETARIO") return false;
  if (ROLES_SUBJEFE.includes(usuario.rol)) return false;

  if (usuario.rol === "JEFE_SECCION") {
    return actividad.seccion_id === usuario.seccion_id;
  }

  if (ROLES_AGRUPACION.includes(usuario.rol)) {
    const userAgrupId = usuario.seccion?.agrupacion?.id ?? null;
    if (!userAgrupId) return false;
    return (
      actividad.agrupacion_id === userAgrupId ||
      actividad.seccion?.agrupacion?.id === userAgrupId
    );
  }

  if (ROLES_DEPARTAMENTO.includes(usuario.rol)) {
    return actividad.creado_por_id === usuario.id;
  }

  return false;
}
