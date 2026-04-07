"use client";

import Link from "next/link";
import { CheckCircle, AlertTriangle, CalendarPlus } from "lucide-react";

interface PlanSabadoProps {
  // El servidor calcula si el plan ya fue cargado para el próximo sábado
  planCargado: boolean;
  fechaSabado: string; // "DD/MM/YYYY"
  actividadId?: string; // si existe, para poder verla
}

export default function PlanSabado({
  planCargado,
  fechaSabado,
  actividadId,
}: PlanSabadoProps) {
  return (
    <div
      className={[
        "flex flex-col justify-between rounded-xl border p-5 min-h-36",
        planCargado
          ? "border-green-700/40 bg-green-900/10"
          : "border-ruca-yellow/40 bg-ruca-yellow/5",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Plan del sábado
          </p>
          <p className="mt-0.5 text-sm font-medium text-white">{fechaSabado}</p>
        </div>
        {planCargado ? (
          <CheckCircle size={20} className="shrink-0 text-green-400" />
        ) : (
          <AlertTriangle size={20} className="shrink-0 text-ruca-yellow" />
        )}
      </div>

      <div className="mt-4">
        {planCargado ? (
          <div className="flex items-center justify-between">
            <p className="text-xs text-green-400">Plan cargado correctamente.</p>
            {actividadId && (
              <Link
                href={`/calendario`}
                className="text-xs text-green-400 underline underline-offset-2 hover:text-green-300 transition-colors"
              >
                Ver actividad
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-ruca-yellow/80">
              El plan aún no fue cargado. Fecha límite: jueves.
            </p>
            <Link
              href="/calendario/nueva?tipo=SABADO"
              className="inline-flex items-center gap-1.5 rounded-lg bg-ruca-yellow px-3 py-1.5 text-xs font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors"
            >
              <CalendarPlus size={13} />
              Cargar plan
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
