export const revalidate = 60;

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { EstadoMiembro, Rol } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import TabsFicha from "@/components/modulos/miembros/TabsFicha";
import { darDeBajaMiembro } from "@/app/(dashboard)/miembros/actions";

const BADGE_ESTADO: Record<EstadoMiembro, string> = {
  ACTIVO: "bg-green-900/50 text-green-400 border-green-700/40",
  INACTIVO: "bg-zinc-800 text-zinc-400 border-zinc-700",
  EGRESADO: "bg-yellow-900/40 text-ruca-yellow border-yellow-700/40",
};
const LABEL_ESTADO: Record<EstadoMiembro, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  EGRESADO: "Egresado",
};

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_POR_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];
const ROLES_VER_OBSERVACIONES: Rol[] = [
  "JEFE_RUCA",
  "SECRETARIO",
  "JEFE_SECCION",
  "SUBJEFE_SECCION",
];

interface PageProps {
  params: { id: string };
}

export default async function FichaMiembroPage({ params }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "MIEMBROS", "ver")) redirect("/dashboard");

  // ── Filtro de acceso por rol ──────────────────────────────────────────────
  let whereExtra: Prisma.MiembroWhereInput = {};
  if (!ROLES_GLOBALES.includes(usuario.rol)) {
    if (ROLES_POR_AGRUPACION.includes(usuario.rol)) {
      const agrupacion_id = usuario.seccion?.agrupacion?.id;
      if (!agrupacion_id) redirect("/dashboard");
      whereExtra = { seccion: { agrupacion_id } };
    } else {
      if (!usuario.seccion_id) redirect("/dashboard");
      whereExtra = { seccion_id: usuario.seccion_id };
    }
  }

  const miembro = await prisma.miembro.findFirst({
    where: { id: params.id, ...whereExtra },
    include: {
      seccion: { select: { id: true, nombre: true } },
      asistencias: {
        include: {
          actividad: {
            select: { id: true, titulo: true, fecha_inicio: true, tipo: true },
          },
        },
        orderBy: { actividad: { fecha_inicio: "desc" } },
      },
      asistencias_fdoc: {
        include: {
          sesion: { select: { id: true, tema: true, fecha: true } },
        },
        orderBy: { sesion: { fecha: "desc" } },
      },
    },
  });

  if (!miembro) notFound();

  const puedeEditar = checkPermiso(usuario.rol, "MIEMBROS", "editar");
  const puedeEliminar = checkPermiso(usuario.rol, "MIEMBROS", "eliminar");
  const puedeVerObservaciones = ROLES_VER_OBSERVACIONES.includes(usuario.rol);

  // ── Serializar para el cliente ────────────────────────────────────────────
  const datosPersonales = {
    id: miembro.id,
    nombre: miembro.nombre,
    apellido: miembro.apellido,
    fecha_nacimiento: miembro.fecha_nacimiento.toISOString(),
    anio_ingreso: miembro.anio_ingreso,
    telefono: miembro.telefono,
    email: miembro.email,
    telefono_tutor: miembro.telefono_tutor,
    email_tutor: miembro.email_tutor,
    estado: miembro.estado,
    seccion: { nombre: miembro.seccion.nombre },
    seccion_id: miembro.seccion_id,
  };

  const asistenciasSerializadas = miembro.asistencias.map((a) => ({
    id: a.id,
    presente: a.presente,
    actividad: {
      id: a.actividad.id,
      titulo: a.actividad.titulo,
      fecha_inicio: a.actividad.fecha_inicio.toISOString(),
      tipo: a.actividad.tipo,
    },
  }));

  const fdocSerializado = miembro.asistencias_fdoc.map((r) => ({
    id: r.id,
    presente: r.presente,
    sesion: {
      id: r.sesion.id,
      tema: r.sesion.tema,
      fecha: r.sesion.fecha.toISOString(),
    },
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Volver */}
      <Link
        href="/miembros"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <ArrowLeft size={15} /> Volver a miembros
      </Link>

      {/* Header */}
      <div className="flex items-start gap-5 rounded-xl border border-ruca-gray-light bg-ruca-gray p-6">
        {miembro.foto_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={miembro.foto_url}
            alt=""
            className="h-20 w-20 shrink-0 rounded-full object-cover ring-2 ring-ruca-yellow/30"
          />
        ) : (
          <UserCircle2 size={80} className="shrink-0 text-zinc-600" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-white">
                {miembro.nombre} {miembro.apellido}
              </h1>
              <p className="mt-0.5 text-sm text-zinc-400">{miembro.seccion.nombre}</p>
            </div>
            <span
              className={[
                "shrink-0 rounded-full border px-3 py-1 text-xs font-medium",
                BADGE_ESTADO[miembro.estado],
              ].join(" ")}
            >
              {LABEL_ESTADO[miembro.estado]}
            </span>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Ingreso {miembro.anio_ingreso}
          </p>
        </div>
      </div>

      {/* Acciones */}
      {(puedeEditar || puedeEliminar) && (
        <div className="flex gap-3">
          {puedeEditar && (
            <Link
              href={`/miembros/${miembro.id}/editar`}
              className="rounded-lg border border-ruca-yellow/40 px-4 py-2 text-sm font-medium text-ruca-yellow hover:bg-ruca-gray transition-colors"
            >
              Editar
            </Link>
          )}
          {puedeEliminar && miembro.estado !== EstadoMiembro.EGRESADO && (
            <form
              action={async () => {
                "use server";
                await darDeBajaMiembro(params.id);
                redirect("/miembros");
              }}
            >
              <button
                type="submit"
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors"
              >
                Dar de baja
              </button>
            </form>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-6">
        <TabsFicha
          datos={datosPersonales}
          asistencias={asistenciasSerializadas}
          fdoc={fdocSerializado}
          puedeEditar={puedeEditar}
          puedeVerObservaciones={puedeVerObservaciones}
          observaciones={miembro.observaciones}
        />
      </div>
    </div>
  );
}
