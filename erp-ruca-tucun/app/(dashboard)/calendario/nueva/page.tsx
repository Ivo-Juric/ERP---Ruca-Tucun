import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Rol } from "@prisma/client";
import FormularioActividad from "./FormularioActividad";

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_POR_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];

export default async function NuevaActividadPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "CALENDARIO", "crear")) redirect("/calendario");

  // Secciones disponibles según rol
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
  } else if (usuario.seccion_id) {
    secciones = await prisma.seccion.findMany({
      where: { id: usuario.seccion_id },
      select: { id: true, nombre: true },
    });
  }

  const esSoloSeccion = !ROLES_GLOBALES.includes(usuario.rol) &&
    !ROLES_POR_AGRUPACION.includes(usuario.rol);
  const seccionPreseleccionada = usuario.seccion_id ?? secciones[0]?.id ?? "";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/calendario"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={15} /> Volver al calendario
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Nueva actividad</h1>
        <p className="mt-0.5 text-sm text-zinc-500">
          Completá los datos de la actividad a agendar.
        </p>
      </div>

      <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-6">
        <FormularioActividad
          secciones={secciones}
          seccionPreseleccionada={seccionPreseleccionada}
          esSoloSeccion={esSoloSeccion}
        />
      </div>
    </div>
  );
}
