"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { marcarRealizada } from "@/app/(dashboard)/calendario/actions";

interface Props {
  actividadId: string;
}

export default function MarcarRealizadaBtn({ actividadId }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await marcarRealizada(actividadId);
      if (res.ok) router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="rounded-lg bg-green-600 px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-500 disabled:opacity-50"
    >
      {pending ? "Guardando..." : "Marcar como realizada"}
    </button>
  );
}
