"use client";

import { useTransition } from "react";
import { Check, RotateCcw } from "lucide-react";
import { marcarItemCompletado } from "@/app/(dashboard)/formacion/actions";
import { useRouter } from "next/navigation";

type Props = {
  itemId: string;
  completado: boolean;
};

export default function BtnCompletarItem({ itemId, completado }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await marcarItemCompletado(itemId, !completado);
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      title={completado ? "Desmarcar como completado" : "Marcar como completado"}
      className={`flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
        completado
          ? "border border-zinc-700 text-zinc-500 hover:text-white"
          : "border border-green-700/50 text-green-400 hover:bg-green-900/20"
      }`}
    >
      {completado ? (
        <>
          <RotateCcw size={11} />
          Reabrir
        </>
      ) : (
        <>
          <Check size={11} />
          Completar
        </>
      )}
    </button>
  );
}
