"use client";

import { useState, useEffect, useTransition } from "react";
import { ClipboardList, X, AlertTriangle } from "lucide-react";
import {
  obtenerItemsDisponibles,
  obtenerActividadesParaSolicitud,
  crearSolicitud,
  consultarDisponibilidadItem,
} from "@/app/(dashboard)/intendencia/actions";
import { useRouter } from "next/navigation";
import type {
  ItemDisponible,
  ActividadOpcion,
} from "@/app/(dashboard)/intendencia/actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const LABEL_CATEGORIA: Record<string, string> = {
  CAMPAMENTO: "Campamento",
  FORMACION: "Formación",
  MOBILIARIO: "Mobiliario",
  INDUMENTARIA: "Indumentaria",
  OTRO: "Otro",
};

/** Retorna el lunes de la semana del Date dado (duplicado de lib/disponibilidad.ts). */
function getLunesLocal(fechaISO: string): string {
  const d = new Date(fechaISO);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function FormularioSolicitud() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<ItemDisponible[]>([]);
  const [actividades, setActividades] = useState<ActividadOpcion[]>([]);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemDisponible | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [fechaUso, setFechaUso] = useState("");
  const [dispSemana, setDispSemana] = useState<{
    total: number;
    ocupado: number;
    disponible: number;
  } | null>(null);
  const [consultandoDisp, setConsultandoDisp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  // ── Consulta de disponibilidad al cambiar ítem o fecha ────────────────────

  useEffect(() => {
    if (!itemSeleccionado || !fechaUso) {
      setDispSemana(null);
      return;
    }
    setConsultandoDisp(true);
    consultarDisponibilidadItem(itemSeleccionado.id, fechaUso).then((res) => {
      if (res.ok) setDispSemana(res.data);
      setConsultandoDisp(false);
    });
  }, [itemSeleccionado, fechaUso]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  async function handleOpen() {
    setAbierto(true);
    setError(null);
    setItemSeleccionado(null);
    setCantidad(1);
    setFechaUso("");
    setDispSemana(null);

    if (items.length === 0) {
      setCargando(true);
      const [itemsRes, actRes] = await Promise.all([
        obtenerItemsDisponibles(),
        obtenerActividadesParaSolicitud(),
      ]);
      if (itemsRes.ok) setItems(itemsRes.data);
      if (actRes.ok) setActividades(actRes.data);
      setCargando(false);
    }
  }

  function handleClose() {
    setAbierto(false);
    setError(null);
    setItemSeleccionado(null);
    setCantidad(1);
    setFechaUso("");
    setDispSemana(null);
  }

  function handleItemChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const found = items.find((i) => i.id === id) ?? null;
    setItemSeleccionado(found);
    setCantidad(1);
    setDispSemana(null);
  }

  function handleFechaUsoChange(e: React.ChangeEvent<HTMLInputElement>) {
    setFechaUso(e.target.value);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!itemSeleccionado) {
      setError("Seleccioná un ítem.");
      return;
    }

    const form = e.currentTarget;
    const actividad_id = (
      form.elements.namedItem("actividad_id") as HTMLSelectElement
    ).value;
    const fecha_devolucion_esperada =
      (form.elements.namedItem("fecha_devolucion_esperada") as HTMLInputElement)
        .value || null;

    if (!actividad_id) {
      setError("Seleccioná una actividad.");
      return;
    }
    if (!fechaUso) {
      setError("Ingresá la fecha de uso.");
      return;
    }
    if (cantidad <= 0) {
      setError("La cantidad debe ser mayor a cero.");
      return;
    }
    if (dispSemana && cantidad > dispSemana.disponible) {
      setError(`Solo hay ${dispSemana.disponible} unidades disponibles esa semana.`);
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await crearSolicitud({
        item_id: itemSeleccionado.id,
        cantidad,
        actividad_id,
        fecha_uso: fechaUso,
        fecha_devolucion_esperada,
      });

      if (res.ok) {
        router.refresh();
        handleClose();
      } else {
        setError(res.error);
      }
    });
  }

  // ── Disponibilidad máxima para el input ───────────────────────────────────

  const maxCantidad =
    dispSemana?.disponible ?? itemSeleccionado?.cantidad_disponible ?? 1;

  const submitDeshabilitado =
    isPending ||
    items.length === 0 ||
    actividades.length === 0 ||
    (dispSemana !== null && dispSemana.disponible === 0);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <button
        onClick={handleOpen}
        className="flex items-center gap-2 rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light"
      >
        <ClipboardList size={16} />
        Nueva solicitud
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <div className="flex items-center gap-2">
                <ClipboardList size={18} className="text-ruca-yellow" />
                <h2 className="font-semibold text-white">Solicitar recurso</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {cargando ? (
              <div className="flex items-center justify-center p-12">
                <p className="text-sm text-gray-500">Cargando recursos...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4 p-6">
                {/* Ítem */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Ítem <span className="text-red-400">*</span>
                  </label>
                  {items.length === 0 ? (
                    <p className="rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-gray-600">
                      No hay ítems disponibles en este momento.
                    </p>
                  ) : (
                    <select
                      name="item_id"
                      onChange={handleItemChange}
                      defaultValue=""
                      className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                    >
                      <option value="" disabled>
                        Seleccioná un ítem...
                      </option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.nombre} ({LABEL_CATEGORIA[item.categoria]}) —{" "}
                          {item.cantidad_disponible} disponibles
                        </option>
                      ))}
                    </select>
                  )}

                  {/* Disponibilidad dinámica */}
                  {itemSeleccionado && fechaUso && (
                    <div className="mt-2">
                      {consultandoDisp ? (
                        <p className="text-xs text-zinc-500">
                          Consultando disponibilidad...
                        </p>
                      ) : dispSemana ? (
                        dispSemana.disponible === 0 ? (
                          <p className="flex items-center gap-1.5 text-xs font-medium text-red-400">
                            <AlertTriangle size={12} />
                            Sin disponibilidad esa semana (semana del{" "}
                            {getLunesLocal(fechaUso)})
                          </p>
                        ) : dispSemana.disponible < dispSemana.total ? (
                          <p className="text-xs text-green-400">
                            Disponible esa semana:{" "}
                            <span className="font-semibold">
                              {dispSemana.disponible}
                            </span>{" "}
                            de {dispSemana.total} unidades
                          </p>
                        ) : (
                          <p className="text-xs text-green-400">
                            Disponible esa semana:{" "}
                            <span className="font-semibold">
                              {dispSemana.disponible}
                            </span>{" "}
                            unidades (stock completo)
                          </p>
                        )
                      ) : null}
                    </div>
                  )}
                </div>

                {/* Cantidad */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Cantidad <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="cantidad"
                    type="number"
                    min={1}
                    max={maxCantidad}
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
                    disabled={!itemSeleccionado}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none disabled:opacity-50"
                  />
                  {/* Warning si supera disponible */}
                  {dispSemana &&
                    dispSemana.disponible > 0 &&
                    cantidad > dispSemana.disponible && (
                      <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-yellow-400">
                        <AlertTriangle size={12} />
                        Solo hay {dispSemana.disponible} unidades disponibles esa
                        semana
                      </p>
                    )}
                </div>

                {/* Actividad */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Actividad <span className="text-red-400">*</span>
                  </label>
                  {actividades.length === 0 ? (
                    <p className="rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-gray-600">
                      No hay actividades próximas disponibles.
                    </p>
                  ) : (
                    <select
                      name="actividad_id"
                      defaultValue=""
                      className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                    >
                      <option value="" disabled>
                        Seleccioná una actividad...
                      </option>
                      {actividades.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.titulo} — {formatFecha(a.fecha_inicio)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Fecha de uso */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Fecha de uso <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="fecha_uso"
                    type="date"
                    value={fechaUso}
                    onChange={handleFechaUsoChange}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  />
                </div>

                {/* Fecha de devolución esperada */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Fecha de devolución esperada
                  </label>
                  <input
                    name="fecha_devolucion_esperada"
                    type="date"
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-gray-600">
                    Opcional. Dejá vacío si es sin devolución.
                  </p>
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
                    disabled={isPending}
                    className="flex-1 rounded-xl border border-ruca-gray-light py-2.5 text-sm font-medium text-gray-300 hover:bg-ruca-gray-light disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={submitDeshabilitado}
                    className="flex-1 rounded-xl bg-ruca-yellow py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
                  >
                    {isPending ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
