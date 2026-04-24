export const revalidate = 60;

import { redirect } from "next/navigation";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import { obtenerActividades } from "./actions";
import CalendarioCliente from "@/components/modulos/calendario/CalendarioCliente";

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_POR_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];

export default async function CalendarioPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "CALENDARIO", "ver")) redirect("/dashboard");

  // Actividades iniciales (SSR)
  const resultado = await obtenerActividades();
  const actividadesIniciales = resultado.ok ? resultado.data : [];

  // Secciones para el filtro (según rol)
  let secciones: { id: string; nombre: string }[] = [];
  if (ROLES_GLOBALES.includes(usuario.rol)) {
    secciones = await prisma.seccion.findMany({
      select: { id: true, nombre: true },
      orderBy: { nombre: "asc" },
    });
  } else if (ROLES_POR_AGRUPACION.includes(usuario.rol)) {
    const agrupacion_id = usuario.seccion?.agrupacion?.id;
    if (agrupacion_id) {
      secciones = await prisma.seccion.findMany({
        where: { agrupacion_id },
        select: { id: true, nombre: true },
        orderBy: { nombre: "asc" },
      });
    }
  }

  const puedCrear = checkPermiso(usuario.rol, "CALENDARIO", "crear");

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          {actividadesIniciales.length} actividad
          {actividadesIniciales.length !== 1 ? "es" : ""} en el período
        </p>
      </div>

      <CalendarioCliente
        actividadesIniciales={actividadesIniciales}
        secciones={secciones}
        puedCrear={puedCrear}
      />
    </div>
  );
}
