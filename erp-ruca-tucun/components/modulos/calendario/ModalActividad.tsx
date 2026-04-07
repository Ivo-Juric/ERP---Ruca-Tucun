"use client";

import { useState, useEffect } from "react";
import {
  X,
  MapPin,
  Calendar,
  Clock,
  Users,
  FileText,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { useUsuario } from "@/components/layout/UserContext";
import { checkPermiso } from "@/lib/auth";
import {
  aprobarActividad,
  cancelarActividad,
  marcarRealizada,
} from "@/app/(dashboard)/calendario/actions";
import type { ActividadCalendario } from "@/app/(dashboard)/calendario/actions";
import { EstadoActividad, TipoActividad } from "@prisma/client";

// ─── Mapas de label / estilo ──────────────────────────────────────────────────

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

const LABEL_ESTADO: Record<EstadoActividad, string> = {
  PLANIFICADA: "Planificada",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

const BADGE_ESTADO: Record<EstadoActividad, string> = {
  PLANIFICADA: "bg-blue-900/50 text-blue-400 border-blue-700/40",
  CONFIRMADA: "bg-green-900/50 text-green-400 border-green-700/40",
  REALIZADA: "bg-zinc-800 text-zinc-400 border-zinc-700",
  CANCELADA: "bg-red-900/40 text-red-400 border-red-700/40",
};

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface ModalActividadProps {
  actividad: ActividadCalendario | null;
  onClose: () => void;
  onAccionRealizada: () => void;
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function ModalActividad({
  actividad,
  onClose,
  onAccionRealizada,
}: ModalActividadProps) {
  const usuario = useUsuario();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cerrar con Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!actividad) return null;

  const puedeEditar = checkPermiso(usuario.rol, "CALENDARIO", "editar");
  const puedeAprobar = usuario.rol === "JEFE_RUCA";
  const esRealizada = actividad.estado === EstadoActividad.REALIZADA;
  const esCancelada = actividad.estado === EstadoActividad.CANCELADA;
  const esPlanificada = actividad.estado === EstadoActividad.PLANIFICADA;
  const esConfirmada = actividad.estado === EstadoActividad.CONFIRMADA;
  const esReunionJefes = actividad.tipo === TipoActividad.REUNION_JEFES;

  async function ejecutar(
    accion: string,
    fn: () => Promise<{ ok: boolean; error?: string }>,
  ) {
    setCargando(accion);
    setError(null);
    const res = await fn();
    setCargando(null);
    if (!res.ok && res.error) {
      setError(res.error);
    } else {
      onAccionRealizada();
      onClose();
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ruca-gray-light p-5">
          <div className="min-w-0 pr-4">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-zinc-500">
                {LABEL_TIPO[actividad.tipo]}
              </span>
              <span
                className={[
                  "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                  BADGE_ESTADO[actividad.estado],
                ].join(" ")}
              >
                {LABEL_ESTADO[actividad.estado]}
              </span>
              {actividad.requiere_aprobacion && esPlanificada && (
                <span className="flex items-center gap-1 rounded-full border border-ruca-yellow/40 bg-ruca-yellow/10 px-2.5 py-0.5 text-xs text-ruca-yellow">
                  <AlertTriangle size={10} />
                  Pendiente aprobación
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-white leading-tight">
              {actividad.titulo}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-ruca-gray-light hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cuerpo */}
        <div className="space-y-4 p-5">
          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-start gap-2 rounded-lg bg-ruca-black/60 p-3">
              <Calendar size={15} className="mt-0.5 shrink-0 text-ruca-yellow" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Inicio
                </p>
                <p className="mt-0.5 text-xs text-white capitalize">
                  {formatFechaHora(actividad.fecha_inicio)}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2 rounded-lg bg-ruca-black/60 p-3">
              <Clock size={15} className="mt-0.5 shrink-0 text-ruca-yellow" />
              <div>
                <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">
                  Fin
                </p>
                <p className="mt-0.5 text-xs text-white capitalize">
                  {formatFechaHora(actividad.fecha_fin)}
                </p>
              </div>
            </div>
          </div>

          {/* Lugar */}
          {actividad.lugar && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin size={14} className="shrink-0 text-zinc-500" />
              <span className="text-zinc-300">{actividad.lugar}</span>
            </div>
          )}

          {/* Sección */}
          {actividad.seccion && (
            <div className="flex items-center gap-2 text-sm">
              <Users size={14} className="shrink-0 text-zinc-500" />
              <span className="text-zinc-300">{actividad.seccion.nombre}</span>
            </div>
          )}

          {/* Descripción */}
          {actividad.descripcion && (
            <div className="flex items-start gap-2 text-sm">
              <FileText size={14} className="mt-0.5 shrink-0 text-zinc-500" />
              <p className="text-zinc-300 whitespace-pre-line">{actividad.descripcion}</p>
            </div>
          )}

          {/* Sección especial para Reunión de Jefes */}
          {esReunionJefes && (
            <div className="rounded-lg border border-ruca-yellow/20 bg-ruca-yellow/5 p-3">
              <p className="text-xs font-semibold text-ruca-yellow">Reunión de Jefes</p>
              <p className="mt-1 text-xs text-zinc-500">
                La agenda y el acta pueden adjuntarse desde el módulo de Comunicación.
              </p>
            </div>
          )}

          {/* Creado por */}
          <p className="text-xs text-zinc-600">
            Creado por {actividad.creado_por.nombre} {actividad.creado_por.apellido}
          </p>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
              {error}
            </div>
          )}
        </div>

        {/* Acciones */}
        {!esCancelada && (
          <div className="flex flex-wrap gap-2 border-t border-ruca-gray-light p-5 pt-4">
            {/* Registrar asistencia */}
            {esRealizada && checkPermiso(usuario.rol, "MIEMBROS", "editar") && (
              <a
                href={`/miembros?actividad=${actividad.id}`}
                className="flex items-center gap-1.5 rounded-lg border border-ruca-yellow/40 px-3 py-2 text-xs font-medium text-ruca-yellow hover:bg-ruca-gray-light transition-colors"
              >
                <CheckCircle size={13} />
                Registrar asistencia
              </a>
            )}

            {/* Aprobar */}
            {puedeAprobar && actividad.requiere_aprobacion && esPlanificada && (
              <button
                onClick={() =>
                  ejecutar("aprobar", () => aprobarActividad(actividad.id))
                }
                disabled={cargando !== null}
                className="rounded-lg bg-ruca-yellow px-3 py-2 text-xs font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors disabled:opacity-60"
              >
                {cargando === "aprobar" ? "Aprobando..." : "Aprobar"}
              </button>
            )}

            {/* Marcar realizada */}
            {puedeEditar && esConfirmada && (
              <button
                onClick={() =>
                  ejecutar("realizada", () => marcarRealizada(actividad.id))
                }
                disabled={cargando !== null}
                className="rounded-lg border border-green-700/40 bg-green-900/20 px-3 py-2 text-xs font-medium text-green-400 hover:bg-green-900/40 transition-colors disabled:opacity-60"
              >
                {cargando === "realizada" ? "Guardando..." : "Marcar realizada"}
              </button>
            )}

            {/* Editar */}
            {puedeEditar && !esRealizada && (
              <a
                href={`/calendario/${actividad.id}/editar`}
                className="rounded-lg border border-ruca-gray-light px-3 py-2 text-xs font-medium text-zinc-400 hover:bg-ruca-gray-light hover:text-white transition-colors"
              >
                Editar
              </a>
            )}

            {/* Cancelar */}
            {puedeEditar && !esCancelada && !esRealizada && (
              <button
                onClick={() =>
                  ejecutar("cancelar", () => cancelarActividad(actividad.id))
                }
                disabled={cargando !== null}
                className="ml-auto rounded-lg border border-red-500/30 px-3 py-2 text-xs font-medium text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-60"
              >
                {cargando === "cancelar" ? "Cancelando..." : "Cancelar actividad"}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
