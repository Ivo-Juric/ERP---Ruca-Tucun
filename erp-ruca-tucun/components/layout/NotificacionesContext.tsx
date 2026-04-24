"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { createClientComponentClient } from "@/lib/supabase";
import { obtenerNotificaciones } from "@/lib/notificaciones";
import type { NotificacionPublica } from "@/lib/notificaciones";
import { useUsuario } from "./UserContext";

type NotificacionesContextValue = {
  notificaciones: NotificacionPublica[];
  sinLeer: number;
  cargar: () => Promise<void>;
  actualizarNotificacion: (id: string, cambios: Partial<NotificacionPublica>) => void;
  marcarTodasComoLeidas: () => void;
};

const NotificacionesContext = createContext<NotificacionesContextValue | null>(null);

export function NotificacionesProvider({ children }: { children: React.ReactNode }) {
  const usuario = useUsuario();
  const [notificaciones, setNotificaciones] = useState<NotificacionPublica[]>([]);
  const [sinLeer, setSinLeer] = useState(0);
  const [supabase] = useState(() => createClientComponentClient());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  async function cargar() {
    const res = await obtenerNotificaciones();
    if (res.ok) {
      setNotificaciones(res.data);
      setSinLeer(res.sinLeer);
    }
  }

  function actualizarNotificacion(id: string, cambios: Partial<NotificacionPublica>) {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...cambios } : n)),
    );
    if (cambios.leida === true) {
      setSinLeer((prev) => Math.max(0, prev - 1));
    }
  }

  function marcarTodasComoLeidas() {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    setSinLeer(0);
  }

  useEffect(() => {
    void cargar();

    const channelName = `notificaciones-${usuario.id}`;

    supabase.getChannels().forEach((ch) => {
      if (ch.topic === `realtime:${channelName}`) {
        void supabase.removeChannel(ch);
      }
    });

    const channel = supabase
      .channel(channelName)
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
      void supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario.id]);

  return (
    <NotificacionesContext.Provider
      value={{ notificaciones, sinLeer, cargar, actualizarNotificacion, marcarTodasComoLeidas }}
    >
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error("useNotificaciones debe usarse dentro de NotificacionesProvider");
  return ctx;
}
