"use client";

import { useState, useTransition } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import { crearCircular } from "@/app/(dashboard)/comunicacion/actions";
import { useRouter } from "next/navigation";

type Props = {
  esSub: boolean;
};

export default function FormularioCircular({ esSub }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [programar, setProgramar] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    setAbierto(false);
    setError(null);
    setProgramar(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    if (!programar) formData.delete("programada_para");
    setError(null);
    startTransition(async () => {
      const res = await crearCircular(formData);
      if (res.ok) {
        handleClose();
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light"
      >
        <Plus size={16} />
        Nueva circular
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                Nueva circular
              </h2>
              <button
                onClick={handleClose}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4 p-6">
              {/* Aviso para subjefe */}
              {esSub && (
                <div className="flex items-start gap-2.5 rounded-xl border border-yellow-700/50 bg-yellow-900/20 px-4 py-3 text-sm text-yellow-300">
                  <AlertCircle size={16} className="mt-0.5 flex-none" />
                  <span>
                    Como Subjefe de Comunicaciones, tu circular quedará{" "}
                    <strong>pendiente de aprobación</strong> hasta que el Jefe
                    la publique.
                  </span>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Título
                </label>
                <input
                  name="titulo"
                  type="text"
                  required
                  placeholder="Título de la circular"
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Contenido
                </label>
                <textarea
                  name="contenido"
                  required
                  rows={7}
                  placeholder="Redactá el contenido de la circular..."
                  className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              {/* Toggle programar envío */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={programar}
                  onClick={() => setProgramar((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ruca-yellow/50 ${
                    programar ? "bg-ruca-yellow" : "bg-ruca-gray-light"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      programar ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">Programar envío</span>
              </div>

              {programar && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Fecha y hora de envío
                  </label>
                  <input
                    name="programada_para"
                    type="datetime-local"
                    required
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  />
                </div>
              )}

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
                  {isPending
                    ? "Guardando..."
                    : esSub
                      ? "Enviar para aprobación"
                      : "Publicar circular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
