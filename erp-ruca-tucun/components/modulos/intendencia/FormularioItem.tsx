"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, Pencil, X } from "lucide-react";
import { crearItem, editarItem } from "@/app/(dashboard)/intendencia/actions";
import { useRouter } from "next/navigation";
import type { InventarioItem } from "@/app/(dashboard)/intendencia/actions";
import type { CategoriaInventario, EstadoConservacion } from "@prisma/client";

const CATEGORIAS: { value: CategoriaInventario; label: string }[] = [
  { value: "CAMPAMENTO", label: "Campamento" },
  { value: "FORMACION", label: "Formación" },
  { value: "MOBILIARIO", label: "Mobiliario" },
  { value: "INDUMENTARIA", label: "Indumentaria" },
  { value: "OTRO", label: "Otro" },
];

const CONSERVACIONES: { value: EstadoConservacion; label: string }[] = [
  { value: "BUENO", label: "Bueno" },
  { value: "REGULAR", label: "Regular" },
  { value: "MALO", label: "Malo" },
  { value: "FUERA_DE_USO", label: "Fuera de uso" },
];

type PropsCrear = { mode: "crear" };
type PropsEditar = { mode: "editar"; item: InventarioItem };
type Props = PropsCrear | PropsEditar;

export default function FormularioItem(props: Props) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const esEditar = props.mode === "editar";
  const item = esEditar ? props.item : null;

  function handleClose() {
    setAbierto(false);
    setError(null);
    formRef.current?.reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const nombre = (form.elements.namedItem("nombre") as HTMLInputElement).value.trim();
    const descripcion =
      (form.elements.namedItem("descripcion") as HTMLTextAreaElement).value.trim() || null;
    const categoria = (form.elements.namedItem("categoria") as HTMLSelectElement)
      .value as CategoriaInventario;
    const cantidad_total = parseInt(
      (form.elements.namedItem("cantidad_total") as HTMLInputElement).value,
      10,
    );
    const estado_conservacion = (
      form.elements.namedItem("estado_conservacion") as HTMLSelectElement
    ).value as EstadoConservacion;
    const ubicacion =
      (form.elements.namedItem("ubicacion") as HTMLInputElement).value.trim() || null;
    const stock_minimo = parseInt(
      (form.elements.namedItem("stock_minimo") as HTMLInputElement).value,
      10,
    );

    if (!nombre) {
      setError("El nombre es requerido.");
      return;
    }
    if (isNaN(cantidad_total) || cantidad_total < 0) {
      setError("La cantidad total debe ser un número mayor o igual a cero.");
      return;
    }
    if (isNaN(stock_minimo) || stock_minimo < 0) {
      setError("El stock mínimo debe ser un número mayor o igual a cero.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const data = {
        nombre,
        descripcion,
        categoria,
        cantidad_total,
        estado_conservacion,
        ubicacion,
        stock_minimo,
      };

      const res = esEditar
        ? await editarItem(item!.id, data)
        : await crearItem(data);

      if (res.ok) {
        router.refresh();
        handleClose();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      {esEditar ? (
        <button
          onClick={() => setAbierto(true)}
          className="rounded-lg border border-ruca-gray-light p-1.5 text-gray-400 hover:border-ruca-yellow/50 hover:text-ruca-yellow"
          title="Editar ítem"
        >
          <Pencil size={14} />
        </button>
      ) : (
        <button
          onClick={() => setAbierto(true)}
          className="flex items-center gap-2 rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light"
        >
          <Plus size={16} />
          Nuevo ítem
        </button>
      )}

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <h2 className="font-semibold text-white">
                {esEditar ? "Editar ítem" : "Nuevo ítem de inventario"}
              </h2>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* Nombre */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Nombre <span className="text-red-400">*</span>
                </label>
                <input
                  name="nombre"
                  type="text"
                  defaultValue={item?.nombre ?? ""}
                  placeholder="Ej: Carpa canadiense 4 personas"
                  required
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              {/* Descripción */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Descripción
                </label>
                <textarea
                  name="descripcion"
                  rows={2}
                  defaultValue={item?.descripcion ?? ""}
                  placeholder="Detalles adicionales del ítem..."
                  className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              {/* Categoría + Conservación */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Categoría <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="categoria"
                    defaultValue={item?.categoria ?? "OTRO"}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  >
                    {CATEGORIAS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Conservación <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="estado_conservacion"
                    defaultValue={item?.estado_conservacion ?? "BUENO"}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  >
                    {CONSERVACIONES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Cantidad total + Stock mínimo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Cantidad total <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="cantidad_total"
                    type="number"
                    min={0}
                    defaultValue={item?.cantidad_total ?? 1}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  />
                  {esEditar && (
                    <p className="mt-1 text-xs text-gray-600">
                      La cantidad disponible se ajusta automáticamente.
                    </p>
                  )}
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Stock mínimo
                  </label>
                  <input
                    name="stock_minimo"
                    type="number"
                    min={0}
                    defaultValue={item?.stock_minimo ?? 1}
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  />
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Ubicación
                </label>
                <input
                  name="ubicacion"
                  type="text"
                  defaultValue={item?.ubicacion ?? ""}
                  placeholder="Ej: Depósito, Estante 3"
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
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
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-ruca-yellow py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
                >
                  {isPending
                    ? esEditar
                      ? "Guardando..."
                      : "Creando..."
                    : esEditar
                      ? "Guardar cambios"
                      : "Crear ítem"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
