"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Info, AlertTriangle, CheckCircle, BellOff, CheckCheck } from "lucide-react";
import { marcarLeida, marcarTodasLeidas } from "@/lib/notificaciones";
import { useNotificaciones } from "./NotificacionesContext";
import type { NotificacionPublica, TipoNotificacion } from "@/lib/notificaciones";

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

const ICONO_TIPO: Record<TipoNotificacion, React.ReactNode> = {
  INFO: <Info size={14} className="text-blue-400" />,
  ALERTA: <AlertTriangle size={14} className="text-yellow-400" />,
  ACCION_REQUERIDA: <CheckCircle size={14} className="text-ruca-yellow" />,
};

// ─── Componente ───────────────────────────────────────────────────────────────

export default function CampanaNotificaciones() {
  const router = useRouter();
  const { notificaciones, sinLeer, cargar, actualizarNotificacion, marcarTodasComoLeidas } =
    useNotificaciones();

  const [abierto, setAbierto] = useState(false);
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Cierre al hacer click fuera ────────────────────────────────────────────

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setAbierto(false);
      }
    }
    if (abierto) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [abierto]);

  // ── Acciones ───────────────────────────────────────────────────────────────

  function handleAbrir() {
    setAbierto((v) => {
      if (!v) void cargar(); // refresca al abrir
      return !v;
    });
  }

  function handleClickNotificacion(n: NotificacionPublica) {
    if (!n.leida) {
      startTransition(async () => {
        await marcarLeida(n.id);
        actualizarNotificacion(n.id, { leida: true });
      });
    }
    if (n.url_destino) {
      setAbierto(false);
      router.push(n.url_destino);
    }
  }

  function handleMarcarTodasLeidas() {
    startTransition(async () => {
      await marcarTodasLeidas();
      marcarTodasComoLeidas();
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div ref={dropdownRef} className="relative">
      {/* Botón campana */}
      <button
        type="button"
        onClick={handleAbrir}
        className="relative text-zinc-400 hover:text-white"
        aria-label="Notificaciones"
      >
        <Bell size={22} />
        {sinLeer > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
            {sinLeer > 99 ? "99+" : sinLeer}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {abierto && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ruca-gray-light px-4 py-3">
            <h3 className="text-sm font-semibold text-white">Notificaciones</h3>
            {sinLeer > 0 && (
              <button
                type="button"
                onClick={handleMarcarTodasLeidas}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-white"
              >
                <CheckCheck size={12} />
                Marcar todas
              </button>
            )}
          </div>

          {/* Lista */}
          <div className="max-h-80 overflow-y-auto">
            {notificaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-gray-600">
                <BellOff size={22} />
                <p className="text-sm">Sin notificaciones</p>
              </div>
            ) : (
              notificaciones.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClickNotificacion(n)}
                  className={`flex w-full items-start gap-3 border-b border-ruca-gray-light/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-ruca-gray-light/30 ${
                    n.url_destino ? "cursor-pointer" : "cursor-default"
                  }`}
                >
                  {/* Ícono tipo */}
                  <div className="mt-0.5 flex-none">
                    {ICONO_TIPO[n.tipo]}
                  </div>

                  {/* Contenido */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium leading-tight ${
                        n.leida ? "text-gray-400" : "text-white"
                      }`}
                    >
                      {n.titulo}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                      {n.contenido}
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      {tiempoRelativo(n.creado_en)}
                    </p>
                  </div>

                  {/* Punto azul si no leída */}
                  {!n.leida && (
                    <div className="mt-1.5 h-2 w-2 flex-none rounded-full bg-blue-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-ruca-gray-light px-4 py-2">
            <button
              type="button"
              onClick={() => {
                setAbierto(false);
                router.push("/notificaciones");
              }}
              className="w-full text-center text-xs text-gray-500 hover:text-ruca-yellow"
            >
              Ver todas las notificaciones →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
