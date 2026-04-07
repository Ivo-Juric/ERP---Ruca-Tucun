"use client";

import { useTransition } from "react";
import { BookOpen } from "lucide-react";
import { marcarCircularLeida } from "@/app/(dashboard)/comunicacion/actions";
import { useRouter } from "next/navigation";

export default function BtnMarcarLeida({ circularId }: { circularId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      await marcarCircularLeida(circularId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="flex items-center gap-1.5 rounded-lg border border-ruca-yellow/50 px-3 py-1.5 text-xs font-medium text-ruca-yellow hover:bg-ruca-yellow/10 disabled:opacity-50"
    >
      <BookOpen size={12} />
      {isPending ? "Marcando..." : "Marcar como leída"}
    </button>
  );
}
