"use client";

import { useState, useTransition } from "react";
import { ClipboardList, X } from "lucide-react";
import {
  obtenerItemsDisponibles,
  obtenerActividadesParaSolicitud,
  crearSolicitud,
} from "@/app/(dashboard)/intendencia/actions";
import { useRouter } from "next/navigation";
import type {
  ItemDisponible,
  ActividadOpcion,
} from "@/app/(dashboard)/intendencia/actions";

const LABEL_CATEGORIA: Record<string, string> = {
  CAMPAMENTO: "Campamento",
  FORMACION: "Formación",
  MOBILIARIO: "Mobiliario",
  INDUMENTARIA: "Indumentaria",
  OTRO: "Otro",
};

export default function FormularioSolicitud() {
  const [abierto, setAbierto] = useState(false);
  const [items, setItems] = useState<ItemDisponible[]>([]);
  const [actividades, setActividades] = useState<ActividadOpcion[]>([]);
  const [itemSeleccionado, setItemSeleccionado] = useState<ItemDisponible | null>(null);
  const [cantidad, setCantidad] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  async function handleOpen() {
    setAbierto(true);
    setError(null);
    setItemSeleccionado(null);
    setCantidad(1);

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
  }

  function handleItemChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    const found = items.find((i) => i.id === id) ?? null;
    setItemSeleccionado(found);
    setCantidad(1);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!itemSeleccionado) {
      setError("Seleccioná un ítem.");
      return;
    }

    const form = e.currentTarget;
    const actividad_id = (form.elements.namedItem("actividad_id") as HTMLSelectElement)
      .value;
    const fecha_uso = (form.elements.namedItem("fecha_uso") as HTMLInputElement).value;
    const fecha_devolucion_esperada =
      (form.elements.namedItem("fecha_devolucion_esperada") as HTMLInputElement).value ||
      null;

    if (!actividad_id) {
      setError("Seleccioná una actividad.");
      return;
    }
    if (!fecha_uso) {
      setError("Ingresá la fecha de uso.");
      return;
    }
    if (cantidad <= 0 || cantidad > itemSeleccionado.cantidad_disponible) {
      setError(
        `La cantidad debe estar entre 1 y ${itemSeleccionado.cantidad_disponible}.`,
      );
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await crearSolicitud({
        item_id: itemSeleccionado.id,
        cantidad,
        actividad_id,
        fecha_uso,
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

  function formatFecha(iso: string): string {
    return new Date(iso).toLocaleDateString("es-AR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

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
                  {itemSeleccionado && (
                    <p className="mt-1 text-xs text-gray-500">
                      Disponibles:{" "}
                      <span className="font-semibold text-green-400">
                        {itemSeleccionado.cantidad_disponible}
                      </span>
                    </p>
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
                    max={itemSeleccionado?.cantidad_disponible ?? 1}
                    value={cantidad}
                    onChange={(e) => setCantidad(parseInt(e.target.value, 10) || 1)}
                    disabled={!itemSeleccionado}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none disabled:opacity-50"
                  />
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
                    disabled={isPending || items.length === 0 || actividades.length === 0}
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
