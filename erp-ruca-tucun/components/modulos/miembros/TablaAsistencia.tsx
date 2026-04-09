"use client";

import { useState } from "react";
import { UserCircle2 } from "lucide-react";
import { registrarAsistencia } from "@/app/(dashboard)/miembros/actions";
import type { MiembroBasico } from "@/app/(dashboard)/miembros/actions";

interface TablaAsistenciaProps {
  actividad_id: string;
  miembros: MiembroBasico[];
  // Map de miembro_id → presente (asistencias ya registradas para esta actividad)
  asistenciasExistentes: Record<string, boolean>;
}

export default function TablaAsistencia({
  actividad_id,
  miembros,
  asistenciasExistentes,
}: TablaAsistenciaProps) {
  const [presentes, setPresentes] = useState<Record<string, boolean>>(
    () => ({ ...asistenciasExistentes }),
  );
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  function toggleMiembro(id: string) {
    setPresentes((prev) => ({ ...prev, [id]: !prev[id] }));
    setExito(false);
  }

  function marcarTodos(valor: boolean) {
    const nuevo: Record<string, boolean> = {};
    for (const m of miembros) {
      nuevo[m.id] = valor;
    }
    setPresentes(nuevo);
    setExito(false);
  }

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    setExito(false);

    const registros = miembros.map((m) => ({
      miembro_id: m.id,
      presente: presentes[m.id] ?? false,
      pago_sabado: false,
    }));

    const res = await registrarAsistencia(actividad_id, registros);
    setGuardando(false);

    if (res.ok) {
      setExito(true);
    } else {
      setError(res.error);
    }
  }

  const totalPresentes = Object.values(presentes).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Resumen + controles bulk */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          <span className="font-semibold text-ruca-yellow">{totalPresentes}</span> /{" "}
          {miembros.length} presentes
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => marcarTodos(true)}
            className="rounded-md px-3 py-1 text-xs font-medium text-green-400 hover:bg-ruca-gray transition-colors"
          >
            Marcar todos
          </button>
          <button
            onClick={() => marcarTodos(false)}
            className="rounded-md px-3 py-1 text-xs font-medium text-zinc-500 hover:bg-ruca-gray transition-colors"
          >
            Limpiar
          </button>
        </div>
      </div>

      {/* Lista */}
      {miembros.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-600">
          No hay miembros activos en esta sección.
        </p>
      ) : (
        <div className="space-y-1">
          {miembros.map((miembro) => {
            const estaPresente = presentes[miembro.id] ?? false;
            return (
              <button
                key={miembro.id}
                type="button"
                onClick={() => toggleMiembro(miembro.id)}
                className={[
                  "flex w-full items-center justify-between rounded-lg border px-4 py-3 transition-colors",
                  estaPresente
                    ? "border-green-700/40 bg-green-900/20"
                    : "border-ruca-gray-light bg-ruca-black hover:bg-ruca-gray/40",
                ].join(" ")}
              >
                <div className="flex items-center gap-3">
                  {miembro.foto_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={miembro.foto_url}
                      alt=""
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <UserCircle2 size={32} className="shrink-0 text-zinc-600" />
                  )}
                  <span className="text-sm font-medium text-white">
                    {miembro.apellido}, {miembro.nombre}
                  </span>
                </div>

                {/* Toggle visual */}
                <div
                  className={[
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                    estaPresente
                      ? "border-green-500 bg-green-500"
                      : "border-zinc-600 bg-transparent",
                  ].join(" ")}
                >
                  {estaPresente && (
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 12 12"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M2 6L5 9L10 3"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Feedback */}
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}
      {exito && (
        <div className="rounded-lg border border-green-700/40 bg-green-900/30 px-4 py-2.5 text-sm text-green-400">
          Asistencia guardada correctamente.
        </div>
      )}

      {/* Guardar */}
      <button
        onClick={handleGuardar}
        disabled={guardando || miembros.length === 0}
        className="w-full rounded-lg bg-ruca-yellow py-2.5 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors disabled:opacity-60"
      >
        {guardando ? "Guardando..." : "Guardar asistencia"}
      </button>
    </div>
  );
}
