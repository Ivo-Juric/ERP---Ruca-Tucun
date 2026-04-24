// Server-only: imports next/headers via supabase-server.
// Client Components deben importar checkPermiso desde "@/lib/permissions".

import { prisma } from "@/lib/prisma";
import { createServerComponentClient } from "@/lib/supabase-server";

// Re-exportar todo lo cliente-safe desde permissions para compatibilidad
export type { Accion, Modulo } from "@/lib/permissions";
export { PERMISOS, checkPermiso } from "@/lib/permissions";

/**
 * Obtiene el usuario completo desde la base de datos,
 * incluyendo su rol, sección y departamento.
 * Retorna null si no hay sesión o el usuario no existe en la DB.
 */
export async function getUsuarioActual() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user?.email) return null;

  return prisma.usuario.findUnique({
    where: { email: user.email },
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
