"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { agregarItemPlan } from "@/app/(dashboard)/formacion/actions";
import { useRouter } from "next/navigation";

type Props = {
  planId: string;
  variant?: "default" | "outline";
};

export default function FormularioItemPlan({
  planId,
  variant = "default",
}: Props) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    setAbierto(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const tema = (form.elements.namedItem("tema") as HTMLInputElement).value.trim();
    const texto_referencia =
      (form.elements.namedItem("texto_referencia") as HTMLInputElement).value.trim() ||
      undefined;
    const objetivo =
      (form.elements.namedItem("objetivo") as HTMLTextAreaElement).value.trim() ||
      undefined;
    const semanaStr = (
      form.elements.namedItem("semana_estimada") as HTMLInputElement
    ).value;
    const semana_estimada =
      semanaStr ? parseInt(semanaStr, 10) : undefined;

    setError(null);
    startTransition(async () => {
      const res = await agregarItemPlan(planId, {
        tema,
        texto_referencia,
        objetivo,
        semana_estimada: semana_estimada && !isNaN(semana_estimada)
          ? semana_estimada
          : undefined,
      });
      if (res.ok) {
        form.reset();
        handleClose();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  const btnClass =
    variant === "outline"
      ? "flex items-center gap-2 rounded-xl border border-ruca-gray-light px-4 py-2 text-sm text-gray-400 hover:border-ruca-yellow/50 hover:text-ruca-yellow"
      : "flex items-center gap-2 rounded-xl border border-ruca-yellow/50 px-3 py-2 text-sm font-medium text-ruca-yellow hover:bg-ruca-yellow/10";

  return (
    <>
      <button onClick={() => setAbierto(true)} className={btnClass}>
        <Plus size={15} />
        Agregar tema
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <h2 className="font-semibold text-white">Agregar tema al plan</h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Tema <span className="text-ruca-yellow">*</span>
                </label>
                <input
                  name="tema"
                  type="text"
                  required
                  placeholder="Ej: La Promesa Scout y su significado"
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Texto de referencia
                </label>
                <input
                  name="texto_referencia"
                  type="text"
                  placeholder="Ej: Reglamento Cap. 3, p. 12"
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Objetivo
                </label>
                <textarea
                  name="objetivo"
                  rows={2}
                  placeholder="Objetivo de aprendizaje de esta sesión..."
                  className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Semana estimada
                </label>
                <input
                  name="semana_estimada"
                  type="number"
                  min={1}
                  max={52}
                  placeholder="Ej: 12"
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
                  className="flex-1 rounded-xl border border-ruca-gray-light py-2.5 text-sm font-medium text-gray-300 hover:bg-ruca-gray-light"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-ruca-yellow py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
                >
                  {isPending ? "Agregando..." : "Agregar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
