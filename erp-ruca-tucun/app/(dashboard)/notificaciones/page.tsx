"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, BellOff, Info, AlertTriangle, CheckCircle } from "lucide-react";
import { useNotificaciones } from "@/components/layout/NotificacionesContext";
import { marcarLeida, marcarTodasLeidas } from "@/lib/notificaciones";
import type { TipoNotificacion, NotificacionPublica } from "@/lib/notificaciones";
import { useTransition } from "react";

const ICONO_TIPO: Record<TipoNotificacion, React.ReactNode> = {
  INFO: <Info size={16} className="text-blue-400" />,
  ALERTA: <AlertTriangle size={16} className="text-yellow-400" />,
  ACCION_REQUERIDA: <CheckCircle size={16} className="text-ruca-yellow" />,
};

function tiempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Ahora";
  if (min < 60) return `hace ${min} min`;
  const hs = Math.floor(min / 60);
  if (hs < 24) return `hace ${hs} h`;
  const dias = Math.floor(hs / 24);
  return `hace ${dias} día${dias !== 1 ? "s" : ""}`;
}

export default function NotificacionesPage() {
  const router = useRouter();
  const { notificaciones, sinLeer, actualizarNotificacion, marcarTodasComoLeidas } =
    useNotificaciones();
  const [, startTransition] = useTransition();

  function handleClick(n: NotificacionPublica) {
    if (!n.leida) {
      startTransition(async () => {
        await marcarLeida(n.id);
        actualizarNotificacion(n.id, { leida: true });
      });
    }
    if (n.url_destino) {
      router.push(n.url_destino);
    }
  }

  function handleMarcarTodas() {
    startTransition(async () => {
      await marcarTodasLeidas();
      marcarTodasComoLeidas();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>
          <h1 className="text-xl font-bold text-white">Notificaciones</h1>
          {sinLeer > 0 && (
            <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {sinLeer}
            </span>
          )}
        </div>
        {sinLeer > 0 && (
          <button
            type="button"
            onClick={handleMarcarTodas}
            className="text-xs text-gray-500 hover:text-white"
          >
            Marcar todas como leídas
          </button>
        )}
      </div>

      {/* Lista */}
      <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray overflow-hidden">
        {notificaciones.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-gray-600">
            <BellOff size={28} />
            <p className="text-sm">No tenés notificaciones</p>
          </div>
        ) : (
          <ul>
            {notificaciones.map((n) => (
              <li key={n.id} className="border-b border-ruca-gray-light/50 last:border-0">
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-4 px-5 py-4 text-left transition-colors hover:bg-ruca-gray-light/20 ${
                    n.url_destino ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  <div className="mt-0.5 flex-none">{ICONO_TIPO[n.tipo]}</div>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium leading-snug ${
                        n.leida ? "text-gray-400" : "text-white"
                      }`}
                    >
                      {n.titulo}
                    </p>
                    <p className="mt-0.5 text-sm text-gray-500">{n.contenido}</p>
                    <p className="mt-1.5 text-xs text-gray-600">
                      {tiempoRelativo(n.creado_en)}
                    </p>
                  </div>

                  {!n.leida && (
                    <div className="mt-1.5 h-2.5 w-2.5 flex-none rounded-full bg-blue-500" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
