"use client";

import { useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import { publicarAnuncio } from "@/app/(dashboard)/comunicacion/actions";
import { useRouter } from "next/navigation";

export default function FormularioAnuncio() {
  const [abierto, setAbierto] = useState(false);
  const [fijado, setFijado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClose() {
    setAbierto(false);
    setError(null);
    setFijado(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("fijado", fijado ? "true" : "false");
    setError(null);
    startTransition(async () => {
      const res = await publicarAnuncio(formData);
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
        Publicar anuncio
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <h2 className="text-lg font-semibold text-white">
                Publicar anuncio
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
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Título
                </label>
                <input
                  name="titulo"
                  type="text"
                  required
                  placeholder="Título del anuncio"
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
                  rows={5}
                  placeholder="Escribí el contenido del anuncio..."
                  className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Categoría
                </label>
                <select
                  name="categoria"
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                >
                  <option value="INFORMATIVO">Informativo</option>
                  <option value="URGENTE">Urgente</option>
                  <option value="RECORDATORIO">Recordatorio</option>
                </select>
              </div>

              {/* Toggle fijar */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={fijado}
                  onClick={() => setFijado((v) => !v)}
                  className={`relative h-6 w-11 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ruca-yellow/50 ${
                    fijado ? "bg-ruca-yellow" : "bg-ruca-gray-light"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      fijado ? "translate-x-5" : "translate-x-0.5"
                    }`}
                  />
                </button>
                <span className="text-sm text-gray-300">Fijar en el tablón</span>
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
                  {isPending ? "Publicando..." : "Publicar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
