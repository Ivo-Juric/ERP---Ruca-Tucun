"use client";

import { useState, useTransition } from "react";
import { Calendar, X, Users } from "lucide-react";
import { registrarSesion, obtenerMiembrosPorSeccionFDoc } from "@/app/(dashboard)/formacion/actions";
import { useRouter } from "next/navigation";
import type { ItemPlan, MiembroFDoc } from "@/app/(dashboard)/formacion/actions";

type Props = {
  seccionId: string;
  planId: string | null;
  itemsPlan: ItemPlan[];
  preseleccionadoId?: string;
  trigger: "global" | "item";
};

function hoy(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function FormularioSesion({
  seccionId,
  planId,
  itemsPlan,
  preseleccionadoId,
  trigger,
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [esExtra, setEsExtra] = useState(false);
  const [itemSeleccionado, setItemSeleccionado] = useState(
    preseleccionadoId ?? (itemsPlan[0]?.id ?? ""),
  );
  const [asistencias, setAsistencias] = useState<Map<string, boolean>>(
    new Map(),
  );
  const [miembros, setMiembros] = useState<MiembroFDoc[]>([]);
  const [cargandoMiembros, setCargandoMiembros] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleAbrir() {
    setAbierto(true);
    if (miembros.length === 0) {
      setCargandoMiembros(true);
      const res = await obtenerMiembrosPorSeccionFDoc(seccionId);
      if (res.ok) {
        setMiembros(res.data);
        // Inicializar todos presentes por defecto
        setAsistencias(new Map(res.data.map((m) => [m.id, true])));
      }
      setCargandoMiembros(false);
    }
  }

  function handleClose() {
    setAbierto(false);
    setError(null);
  }

  function toggleAsistencia(miembroId: string) {
    setAsistencias((prev) => {
      const next = new Map(prev);
      next.set(miembroId, !prev.get(miembroId));
      return next;
    });
  }

  function toggleTodos(valor: boolean) {
    setAsistencias(new Map(miembros.map((m) => [m.id, valor])));
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fecha = (form.elements.namedItem("fecha") as HTMLInputElement).value;
    const tema = (form.elements.namedItem("tema") as HTMLInputElement).value.trim();
    const observaciones =
      (
        form.elements.namedItem("observaciones") as HTMLTextAreaElement
      ).value.trim() || null;

    setError(null);

    startTransition(async () => {
      const res = await registrarSesion({
        seccion_id: seccionId,
        fecha,
        es_extra: esExtra,
        tema: esExtra
          ? tema
          : (itemsPlan.find((i) => i.id === itemSeleccionado)?.tema ?? tema),
        observaciones,
        plan_item_id: !esExtra && itemSeleccionado ? itemSeleccionado : null,
        asistencias: miembros.map((m) => ({
          miembro_id: m.id,
          presente: asistencias.get(m.id) ?? false,
        })),
      });

      if (res.ok) {
        handleClose();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const btnLabel =
    trigger === "item" ? "Registrar sesión" : "Nueva sesión";

  const presentes = miembros.filter((m) => asistencias.get(m.id)).length;

  return (
    <>
      <button
        onClick={handleAbrir}
        className={
          trigger === "global"
            ? "flex items-center gap-2 rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light"
            : "flex items-center gap-1.5 rounded-lg border border-ruca-yellow/50 px-2.5 py-1.5 text-xs font-medium text-ruca-yellow hover:bg-ruca-yellow/10"
        }
      >
        <Calendar size={trigger === "global" ? 16 : 13} />
        {btnLabel}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <div className="flex items-center gap-2">
                <Calendar size={18} className="text-ruca-yellow" />
                <h2 className="font-semibold text-white">
                  Registrar sesión de FDoc
                </h2>
              </div>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5 p-6">
              {/* Fecha */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Fecha
                </label>
                <input
                  name="fecha"
                  type="date"
                  defaultValue={hoy()}
                  required
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              {/* Tipo: del plan o extra */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={esExtra}
                  onClick={() => setEsExtra((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none ${
                    esExtra ? "bg-ruca-yellow" : "bg-ruca-gray-light"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      esExtra ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">
                  Sesión extra (no está en el plan anual)
                </span>
              </div>

              {/* Selector de ítem del plan o campo libre */}
              {!esExtra && planId && itemsPlan.length > 0 ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Tema del plan
                  </label>
                  <select
                    value={itemSeleccionado}
                    onChange={(e) => setItemSeleccionado(e.target.value)}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  >
                    {itemsPlan.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.semana_estimada
                          ? `Sem. ${item.semana_estimada} — `
                          : ""}
                        {item.tema}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Al guardar, este ítem se marcará como completado.
                  </p>
                </div>
              ) : (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Tema de la sesión
                    {esExtra && (
                      <span className="ml-2 text-xs text-gray-500">
                        (sesión extra)
                      </span>
                    )}
                  </label>
                  <input
                    name="tema"
                    type="text"
                    required
                    placeholder="Ej: Historia de Ruca Tucún..."
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                  />
                </div>
              )}

              {/* Hidden tema field when using plan item */}
              {!esExtra && itemSeleccionado && (
                <input
                  name="tema"
                  type="hidden"
                  value={
                    itemsPlan.find((i) => i.id === itemSeleccionado)?.tema ?? ""
                  }
                />
              )}

              {/* Observaciones */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Observaciones
                </label>
                <textarea
                  name="observaciones"
                  rows={2}
                  placeholder="Notas sobre el desarrollo de la sesión..."
                  className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              {/* Asistencia */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="flex items-center gap-1.5 text-sm font-medium text-gray-300">
                    <Users size={14} />
                    Asistencia
                    {miembros.length > 0 && (
                      <span className="text-gray-500">
                        ({presentes}/{miembros.length})
                      </span>
                    )}
                  </label>
                  {miembros.length > 0 && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTodos(true)}
                        className="text-xs text-ruca-yellow hover:underline"
                      >
                        Todos
                      </button>
                      <span className="text-gray-600">·</span>
                      <button
                        type="button"
                        onClick={() => toggleTodos(false)}
                        className="text-xs text-gray-500 hover:text-white"
                      >
                        Ninguno
                      </button>
                    </div>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-ruca-gray-light bg-ruca-black/50">
                  {cargandoMiembros ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      Cargando miembros...
                    </div>
                  ) : miembros.length === 0 ? (
                    <div className="py-6 text-center text-sm text-gray-500">
                      No hay miembros activos en esta sección.
                    </div>
                  ) : (
                    miembros.map((m) => {
                      const presente = asistencias.get(m.id) ?? false;
                      return (
                        <label
                          key={m.id}
                          className="flex cursor-pointer items-center gap-3 border-b border-ruca-gray-light/30 px-4 py-2.5 last:border-0 hover:bg-ruca-gray-light/20"
                        >
                          <input
                            type="checkbox"
                            checked={presente}
                            onChange={() => toggleAsistencia(m.id)}
                            className="h-4 w-4 accent-ruca-yellow"
                          />
                          <span
                            className={`text-sm ${presente ? "text-white" : "text-gray-500"}`}
                          >
                            {m.apellido}, {m.nombre}
                          </span>
                          {presente && (
                            <span className="ml-auto text-xs text-green-400">
                              Presente
                            </span>
                          )}
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              {error && (
                <p className="rounded-xl bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-ruca-gray-light py-2.5 text-sm font-medium text-gray-300 hover:bg-ruca-gray-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-ruca-yellow py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
                >
                  {isPending ? "Guardando..." : "Registrar sesión"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
