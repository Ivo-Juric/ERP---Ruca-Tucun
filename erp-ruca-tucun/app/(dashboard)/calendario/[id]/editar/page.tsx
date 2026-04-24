import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { puedeEditarActividad } from "@/lib/calendario-permisos";
import FormularioEdicion from "./FormularioEdicion";

interface PageProps {
  params: { id: string };
}

export default async function EditarActividadPage({ params }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "CALENDARIO", "editar")) redirect("/dashboard");

  const actividad = await prisma.actividad.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      titulo: true,
      tipo: true,
      estado: true,
      fecha_inicio: true,
      fecha_fin: true,
      lugar: true,
      descripcion: true,
      creado_por_id: true,
      seccion_id: true,
      agrupacion_id: true,
      seccion: { select: { agrupacion: { select: { id: true } } } },
    },
  });

  if (!actividad) notFound();
  if (!puedeEditarActividad(usuario, actividad)) redirect(`/calendario/${params.id}`);

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-bold text-white">Editar actividad</h1>
      <FormularioEdicion
        actividadId={actividad.id}
        defaultValues={{
          titulo: actividad.titulo,
          tipo: actividad.tipo,
          estado: actividad.estado,
          fecha_inicio: actividad.fecha_inicio.toISOString().slice(0, 16),
          fecha_fin: actividad.fecha_fin.toISOString().slice(0, 16),
          lugar: actividad.lugar ?? "",
          descripcion: actividad.descripcion ?? "",
        }}
      />
    </div>
  );
}
