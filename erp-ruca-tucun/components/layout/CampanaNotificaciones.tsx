"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Bell, Info, AlertTriangle, CheckCircle, BellOff, CheckCheck } from "lucide-react";
import { createClientComponentClient } from "@/lib/supabase";
import {
  obtenerNotificaciones,
  marcarLeida,
  marcarTodasLeidas,
} from "@/lib/notificaciones";
import { useUsuario } from "./UserContext";
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
  const usuario = useUsuario();
  const router = useRouter();

  const [notificaciones, setNotificaciones] = useState<NotificacionPublica[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [abierto, setAbierto] = useState(false);
  const [, startTransition] = useTransition();
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Supabase client estable — no se recrea entre renders
  const [supabase] = useState(() => createClientComponentClient());
  // Ref para el canal activo — permite cleanup síncrono antes de re-suscribir
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // ── Carga inicial ──────────────────────────────────────────────────────────

  async function cargar() {
    const res = await obtenerNotificaciones();
    if (res.ok) {
      setNotificaciones(res.data);
      setSinLeer(res.sinLeer);
    }
  }

  // ── Realtime ───────────────────────────────────────────────────────────────

  useEffect(() => {
    // Limpiar canal anterior de forma síncrona antes de crear uno nuevo.
    // unsubscribe() es síncrono y deja el canal en estado limpio de inmediato,
    // evitando que Supabase reutilice un canal ya suscrito cuando se llama a
    // .channel() con el mismo nombre y falle al agregar callbacks con .on().
    if (channelRef.current) {
      void channelRef.current.unsubscribe();
      void supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    void cargar();

    // Orden correcto: .channel() → .on() → .subscribe()
    const channel = supabase
      .channel(`notificaciones:${usuario.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificaciones",
          filter: `usuario_id=eq.${usuario.id}`,
        },
        () => {
          void cargar();
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        void channelRef.current.unsubscribe();
        void supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // supabase es estable (useState) — solo usuario.id importa como dep
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id]);

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
    setAbierto((v) => !v);
  }

  function handleClickNotificacion(n: NotificacionPublica) {
    if (!n.leida) {
      startTransition(async () => {
        await marcarLeida(n.id);
        setNotificaciones((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)),
        );
        setSinLeer((prev) => Math.max(0, prev - 1));
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
      setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
      setSinLeer(0);
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
