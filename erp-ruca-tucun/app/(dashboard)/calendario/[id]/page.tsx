export const revalidate = 60;

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, MapPin, Calendar, User, Pencil } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { puedeEditarActividad } from "@/lib/calendario-permisos";
import { EstadoActividad, TipoActividad, Rol } from "@prisma/client";
import RegistroAsistencia from "@/components/modulos/miembros/RegistroAsistencia";
import MarcarRealizadaBtn from "@/components/modulos/calendario/MarcarRealizadaBtn";
import EliminarActividadBtn from "./EliminarActividadBtn";

// ─── Mapas de etiquetas y colores ────────────────────────────────────────────

const LABEL_TIPO: Record<TipoActividad, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada de Formación",
  JORNADA_JEFES: "Jornada de Jefes",
  REUNION_JEFES: "Reunión de Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

const COLOR_TIPO: Record<TipoActividad, string> = {
  SABADO: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  CAMPAMENTO: "bg-green-500/20 text-green-300 border-green-500/30",
  JORNADA_FORMACION: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  JORNADA_JEFES: "bg-purple-500/20 text-purple-300 border-purple-500/30",
  REUNION_JEFES: "bg-purple-600/20 text-purple-400 border-purple-600/30",
  RETIRO: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  MISA: "bg-orange-500/20 text-orange-300 border-orange-500/30",
  EXTRAORDINARIA: "bg-red-500/20 text-red-300 border-red-500/30",
};

const LABEL_ESTADO: Record<EstadoActividad, string> = {
  PLANIFICADA: "Planificada",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

const COLOR_ESTADO: Record<EstadoActividad, string> = {
  PLANIFICADA: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  CONFIRMADA: "bg-green-500/20 text-green-300 border-green-500/30",
  REALIZADA: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  CANCELADA: "bg-red-500/20 text-red-300 border-red-500/30",
};

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_POR_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];

// ─── Formato de fecha en español ──────────────────────────────────────────────

const fmtFecha = new Intl.DateTimeFormat("es-AR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

// ─── Página ───────────────────────────────────────────────────────────────────

export default async function CalendarioDetallePage({
  params,
}: {
  params: { id: string };
}) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "CALENDARIO", "ver")) redirect("/dashboard");

  const actividad = await prisma.actividad.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      titulo: true,
      descripcion: true,
      tipo: true,
      estado: true,
      fecha_inicio: true,
      fecha_fin: true,
      lugar: true,
      seccion_id: true,
      agrupacion_id: true,
      creado_por_id: true,
      seccion: {
        select: {
          id: true,
          nombre: true,
          agrupacion: { select: { id: true, nombre: true } },
        },
      },
      creado_por: { select: { nombre: true, apellido: true } },
    },
  });

  if (!actividad) notFound();

  // ── Determinar permisos ────────────────────────────────────────────────────
  // usuario y actividad son non-null aquí (guardados por redirect/notFound arriba).
  // Se usan alias locales para que TypeScript los trate como non-null sin closures.
  const u = usuario;
  const act = actividad;

  const puedeEditar =
    checkPermiso(u.rol, "CALENDARIO", "editar") && puedeEditarActividad(u, act);
  const puedeEliminar =
    checkPermiso(u.rol, "CALENDARIO", "eliminar") && puedeEditarActividad(u, act);

  let puedeGestionarSeccion = false;
  if (act.seccion_id) {
    if (ROLES_GLOBALES.includes(u.rol)) {
      puedeGestionarSeccion = true;
    } else if (ROLES_POR_AGRUPACION.includes(u.rol)) {
      puedeGestionarSeccion =
        act.seccion?.agrupacion?.id === u.seccion?.agrupacion?.id;
    } else {
      puedeGestionarSeccion = u.seccion_id === act.seccion_id;
    }
  }

  const mostrarAsistencia =
    (act.estado === EstadoActividad.REALIZADA ||
      act.estado === EstadoActividad.CONFIRMADA) &&
    checkPermiso(u.rol, "MIEMBROS", "editar") &&
    puedeGestionarSeccion;

  const mostrarMarcarRealizada =
    act.estado === EstadoActividad.PLANIFICADA && puedeEditar;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Volver */}
      <Link
        href="/calendario"
        className="inline-flex items-center gap-1.5 text-sm text-zinc-500 transition-colors hover:text-white"
      >
        <ArrowLeft size={15} />
        Volver al calendario
      </Link>

      {/* Tarjeta principal */}
      <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-6 space-y-5">
        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${COLOR_TIPO[act.tipo]}`}
          >
            {LABEL_TIPO[act.tipo]}
          </span>
          <span
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${COLOR_ESTADO[act.estado]}`}
          >
            {LABEL_ESTADO[act.estado]}
          </span>
          {act.seccion && (
            <span className="rounded-full border border-ruca-gray-light bg-ruca-gray-light/50 px-3 py-1 text-xs text-zinc-300">
              {act.seccion.nombre}
            </span>
          )}
        </div>

        {/* Título + acciones */}
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold text-white">{act.titulo}</h1>
          {(puedeEditar || puedeEliminar) && (
            <div className="flex flex-none items-center gap-2">
              {puedeEditar && (
                <Link
                  href={`/calendario/${act.id}/editar`}
                  className="flex items-center gap-1.5 rounded-lg border border-ruca-gray-light px-3 py-1.5 text-xs font-medium text-ruca-yellow hover:bg-ruca-gray-light"
                >
                  <Pencil size={12} />
                  Editar
                </Link>
              )}
              {puedeEliminar && (
                <EliminarActividadBtn
                  actividadId={act.id}
                  titulo={act.titulo}
                />
              )}
            </div>
          )}
        </div>

        {/* Meta */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <Calendar size={14} className="flex-none text-zinc-600" />
            <div>
              <span className="capitalize text-white">
                {fmtFecha.format(act.fecha_inicio)}
              </span>
              {act.fecha_fin.toISOString() !==
                act.fecha_inicio.toISOString() && (
                <>
                  <span className="mx-1 text-zinc-600">→</span>
                  <span className="capitalize text-zinc-400">
                    {fmtFecha.format(act.fecha_fin)}
                  </span>
                </>
              )}
            </div>
          </div>

          {act.lugar && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <MapPin size={14} className="flex-none text-zinc-600" />
              <span className="text-white">{act.lugar}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-zinc-400">
            <User size={14} className="flex-none text-zinc-600" />
            <span>
              {act.creado_por.nombre} {act.creado_por.apellido}
            </span>
          </div>
        </div>

        {/* Descripción */}
        {act.descripcion && (
          <p className="border-t border-ruca-gray-light pt-4 text-sm leading-relaxed text-zinc-300">
            {act.descripcion}
          </p>
        )}

        {/* Botón marcar como realizada */}
        {mostrarMarcarRealizada && (
          <div className="border-t border-ruca-gray-light pt-4">
            <MarcarRealizadaBtn actividadId={act.id} />
          </div>
        )}
      </div>

      {/* Registro de asistencia */}
      {mostrarAsistencia && act.seccion_id && (
        <RegistroAsistencia
          actividadId={act.id}
          seccionId={act.seccion_id}
        />
      )}
    </div>
  );
}
