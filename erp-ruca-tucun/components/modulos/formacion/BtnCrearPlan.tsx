"use client";

import { useTransition } from "react";
import { BookOpen } from "lucide-react";
import { crearPlanFDoc } from "@/app/(dashboard)/formacion/actions";
import { useRouter } from "next/navigation";

type Props = {
  seccionId: string;
  anio: number;
};

export default function BtnCrearPlan({ seccionId, anio }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const res = await crearPlanFDoc(seccionId, anio);
      if (res.ok) {
        router.refresh();
      }
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-2 rounded-xl bg-ruca-yellow px-5 py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
    >
      <BookOpen size={16} />
      {isPending ? "Creando plan..." : `Crear plan ${anio}`}
    </button>
  );
}
