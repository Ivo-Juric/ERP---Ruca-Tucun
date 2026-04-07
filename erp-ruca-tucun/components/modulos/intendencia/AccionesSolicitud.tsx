"use client";

import { useState, useTransition } from "react";
import { CheckCircle, XCircle, ThumbsUp, RotateCcw, ChevronDown } from "lucide-react";
import {
  confirmarSolicitudJefe,
  aprobarSolicitud,
  rechazarSolicitud,
  registrarDevolucion,
} from "@/app/(dashboard)/intendencia/actions";
import { useRouter } from "next/navigation";
import type { SolicitudItem } from "@/app/(dashboard)/intendencia/actions";
import type { Rol } from "@prisma/client";

type Props = {
  solicitud: SolicitudItem;
  rol: Rol;
  seccionId: string | null;
};

type Accion = "aprobar" | "rechazar" | null;

export default function AccionesSolicitud({ solicitud, rol, seccionId }: Props) {
  const [accionAbierta, setAccionAbierta] = useState<Accion>(null);
  const [cantidadAprobada, setCantidadAprobada] = useState(solicitud.cantidad);
  const [comentarioRechazo, setComentarioRechazo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const { estado, id } = solicitud;

  // ── Permisos por acción ────────────────────────────────────────────────────

  const esJefeSeccion = rol === "JEFE_SECCION" || rol === "JEFE_RUCA";
  const esIntendencia =
    rol === "JEFE_INTENDENCIA" ||
    rol === "SUBJEFE_INTENDENCIA" ||
    rol === "JEFE_RUCA";

  // JEFE_SECCION puede confirmar si la solicitud es de su sección y está PENDIENTE_JEFE
  const puedeConfirmar =
    esJefeSeccion &&
    estado === "PENDIENTE_JEFE" &&
    (rol === "JEFE_RUCA" ||
      solicitud.solicitado_por.seccion_id === seccionId);

  const puedeAprobar = esIntendencia && estado === "PENDIENTE_INTENDENCIA";
  const puedeRechazar = esIntendencia && estado === "PENDIENTE_INTENDENCIA";
  const puedeDevolver =
    esIntendencia &&
    (estado === "APROBADA" || estado === "APROBADA_PARCIAL") &&
    !solicitud.devuelto;

  const hayAcciones = puedeConfirmar || puedeAprobar || puedeRechazar || puedeDevolver;

  if (!hayAcciones) return null;

  function handleClose() {
    setAccionAbierta(null);
    setError(null);
    setCantidadAprobada(solicitud.cantidad);
    setComentarioRechazo("");
  }

  function ejecutar(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        router.refresh();
        handleClose();
      } else {
        setError(res.error ?? "Error inesperado.");
      }
    });
  }

  return (
    <div className="relative flex items-center justify-end gap-1">
      {/* Confirmar (JEFE_SECCION) */}
      {puedeConfirmar && (
        <button
          onClick={() =>
            ejecutar(() =>
              confirmarSolicitudJefe(id).then((r) => ({
                ok: r.ok,
                error: r.ok ? undefined : r.error,
              })),
            )
          }
          disabled={isPending}
          title="Confirmar solicitud"
          className="flex items-center gap-1 rounded-lg border border-blue-700/50 px-2.5 py-1.5 text-xs font-medium text-blue-400 hover:bg-blue-900/20 disabled:opacity-50"
        >
          <ThumbsUp size={12} />
          Confirmar
        </button>
      )}

      {/* Devolver */}
      {puedeDevolver && (
        <button
          onClick={() =>
            ejecutar(() =>
              registrarDevolucion(id).then((r) => ({
                ok: r.ok,
                error: r.ok ? undefined : r.error,
              })),
            )
          }
          disabled={isPending}
          title="Registrar devolución"
          className="flex items-center gap-1 rounded-lg border border-green-700/50 px-2.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/20 disabled:opacity-50"
        >
          <RotateCcw size={12} />
          Devolver
        </button>
      )}

      {/* Aprobar / Rechazar */}
      {(puedeAprobar || puedeRechazar) && (
        <div className="flex items-center gap-1">
          {puedeAprobar && (
            <button
              onClick={() => setAccionAbierta("aprobar")}
              disabled={isPending}
              title="Aprobar solicitud"
              className="flex items-center gap-1 rounded-lg border border-green-700/50 px-2.5 py-1.5 text-xs font-medium text-green-400 hover:bg-green-900/20 disabled:opacity-50"
            >
              <CheckCircle size={12} />
              Aprobar
            </button>
          )}
          {puedeRechazar && (
            <button
              onClick={() => setAccionAbierta("rechazar")}
              disabled={isPending}
              title="Rechazar solicitud"
              className="flex items-center gap-1 rounded-lg border border-red-700/50 px-2.5 py-1.5 text-xs font-medium text-red-400 hover:bg-red-900/20 disabled:opacity-50"
            >
              <XCircle size={12} />
              Rechazar
            </button>
          )}
        </div>
      )}

      {/* Panel inline: Aprobar */}
      {accionAbierta === "aprobar" && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4 shadow-xl">
          <p className="mb-3 text-sm font-medium text-white">Aprobar solicitud</p>

          <label className="mb-1 block text-xs font-medium text-gray-400">
            Cantidad a aprobar (solicitó {solicitud.cantidad})
          </label>
          <input
            type="number"
            min={1}
            max={solicitud.cantidad}
            value={cantidadAprobada}
            onChange={(e) =>
              setCantidadAprobada(parseInt(e.target.value, 10) || 1)
            }
            className="mb-3 w-full rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white focus:border-ruca-yellow focus:outline-none"
          />

          {error && (
            <p className="mb-3 text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-ruca-gray-light py-2 text-xs font-medium text-gray-300 hover:bg-ruca-gray-light disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                ejecutar(() =>
                  aprobarSolicitud(id, cantidadAprobada).then((r) => ({
                    ok: r.ok,
                    error: r.ok ? undefined : r.error,
                  })),
                )
              }
              disabled={isPending}
              className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-semibold text-white hover:bg-green-600 disabled:opacity-50"
            >
              {isPending ? "Aprobando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}

      {/* Panel inline: Rechazar */}
      {accionAbierta === "rechazar" && (
        <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4 shadow-xl">
          <p className="mb-3 text-sm font-medium text-white">Rechazar solicitud</p>

          <label className="mb-1 block text-xs font-medium text-gray-400">
            Motivo del rechazo
          </label>
          <textarea
            rows={3}
            value={comentarioRechazo}
            onChange={(e) => setComentarioRechazo(e.target.value)}
            placeholder="Explicá el motivo..."
            className="mb-3 w-full resize-none rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
          />

          {error && (
            <p className="mb-3 text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleClose}
              disabled={isPending}
              className="flex-1 rounded-lg border border-ruca-gray-light py-2 text-xs font-medium text-gray-300 hover:bg-ruca-gray-light disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={() =>
                ejecutar(() =>
                  rechazarSolicitud(id, comentarioRechazo).then((r) => ({
                    ok: r.ok,
                    error: r.ok ? undefined : r.error,
                  })),
                )
              }
              disabled={isPending}
              className="flex-1 rounded-lg bg-red-700 py-2 text-xs font-semibold text-white hover:bg-red-600 disabled:opacity-50"
            >
              {isPending ? "Rechazando..." : "Confirmar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
