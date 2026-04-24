"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { eliminarActividad } from "../actions";

interface Props {
  actividadId: string;
  titulo: string;
}

export default function EliminarActividadBtn({ actividadId, titulo }: Props) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleConfirmar() {
    setError(null);
    startTransition(async () => {
      const res = await eliminarActividad(actividadId);
      if (res.ok) {
        router.push("/calendario");
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 rounded-lg border border-red-800/50 px-3 py-1.5 text-xs font-medium text-red-400 hover:bg-red-950/30"
      >
        <Trash2 size={12} />
        Eliminar
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-ruca-gray-light bg-ruca-gray p-6 shadow-2xl">
            <h2 className="text-base font-semibold text-white">
              ¿Eliminar actividad?
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Esta acción no se puede deshacer. Se eliminará permanentemente:
            </p>
            <p className="mt-1 text-sm font-medium text-white">&ldquo;{titulo}&rdquo;</p>

            {error && (
              <p className="mt-3 rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-400">
                {error}
              </p>
            )}

            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setAbierto(false); setError(null); }}
                disabled={isPending}
                className="rounded-lg border border-ruca-gray-light px-4 py-2 text-sm text-zinc-300 hover:bg-ruca-gray-light disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmar}
                disabled={isPending}
                className="rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50"
              >
                {isPending ? "Eliminando…" : "Sí, eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
