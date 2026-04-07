"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { ChevronLeft, Hash, MessageSquare, Send } from "lucide-react";
import { createClientComponentClient } from "@/lib/supabase";
import {
  enviarMensaje,
  enviarMensajeDirecto,
  obtenerMensajes,
  obtenerMensajesDirectos,
} from "@/app/(dashboard)/comunicacion/actions";
import type {
  MensajeItem,
  MensajeDMItem,
} from "@/app/(dashboard)/comunicacion/actions";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type Props = {
  mode: "canal" | "dm";
  canal_id?: string;
  interlocutor_id?: string;
  puede_escribir?: boolean;
  nombre: string;
  usuario_id: string;
  usuario_nombre: string;
  usuario_apellido: string;
  usuario_foto: string | null;
  onVolver?: () => void;
};

type MensajeUnificado = {
  id: string;
  contenido: string;
  autor_id: string;
  autor_nombre: string;
  autor_apellido: string;
  autor_foto: string | null;
  creado_en: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function iniciales(nombre: string, apellido: string): string {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

function mapearMensajesCanal(data: MensajeItem[]): MensajeUnificado[] {
  return data.map((m) => ({
    id: m.id,
    contenido: m.contenido,
    autor_id: m.autor_id,
    autor_nombre: m.autor.nombre,
    autor_apellido: m.autor.apellido,
    autor_foto: m.autor.foto_url,
    creado_en: m.creado_en,
  }));
}

function mapearMensajesDM(data: MensajeDMItem[]): MensajeUnificado[] {
  return data.map((m) => ({
    id: m.id,
    contenido: m.contenido,
    autor_id: m.emisor_id,
    autor_nombre: m.emisor.nombre,
    autor_apellido: m.emisor.apellido,
    autor_foto: m.emisor.foto_url,
    creado_en: m.creado_en,
  }));
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function AreaMensajes({
  mode,
  canal_id,
  interlocutor_id,
  puede_escribir = true,
  nombre,
  usuario_id,
  usuario_nombre,
  usuario_apellido,
  usuario_foto,
  onVolver,
}: Props) {
  const [mensajes, setMensajes] = useState<MensajeUnificado[]>([]);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);
  const [, startTransition] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [supabase] = useState(() => createClientComponentClient());

  const puedeEscribir = mode === "dm" || puede_escribir;

  function scrollAbajo() {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    let cancelado = false;

    async function cargar() {
      setCargando(true);
      if (mode === "canal" && canal_id) {
        const res = await obtenerMensajes(canal_id);
        if (!cancelado) {
          if (res.ok) setMensajes(mapearMensajesCanal(res.data));
          else setError(res.error);
        }
      } else if (mode === "dm" && interlocutor_id) {
        const res = await obtenerMensajesDirectos(interlocutor_id);
        if (!cancelado) {
          if (res.ok) setMensajes(mapearMensajesDM(res.data));
          else setError(res.error);
        }
      }
      if (!cancelado) setCargando(false);
    }

    cargar();
    return () => {
      cancelado = true;
    };
  }, [mode, canal_id, interlocutor_id]);

  // ── Scroll automático ──────────────────────────────────────────────────────

  useEffect(() => {
    scrollAbajo();
  }, [mensajes]);

  // ── Realtime ───────────────────────────────────────────────────────────────

  useEffect(() => {
    if (mode === "canal" && canal_id) {
      const channel = supabase
        .channel(`mensajes-canal-${canal_id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes",
            filter: `canal_id=eq.${canal_id}`,
          },
          () => {
            startTransition(async () => {
              const res = await obtenerMensajes(canal_id);
              if (res.ok) setMensajes(mapearMensajesCanal(res.data));
            });
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }

    if (mode === "dm" && interlocutor_id) {
      const channel = supabase
        .channel(`mensajes-dm-${usuario_id}-${interlocutor_id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "mensajes_directos",
            filter: `receptor_id=eq.${usuario_id}`,
          },
          (payload) => {
            const row = payload.new as { emisor_id?: string };
            if (row.emisor_id === interlocutor_id) {
              startTransition(async () => {
                const res = await obtenerMensajesDirectos(interlocutor_id);
                if (res.ok) setMensajes(mapearMensajesDM(res.data));
              });
            }
          },
        )
        .subscribe();

      return () => {
        void supabase.removeChannel(channel);
      };
    }
  }, [mode, canal_id, interlocutor_id, usuario_id, supabase]);

  // ── Envío ──────────────────────────────────────────────────────────────────

  async function handleEnviar() {
    const contenido = texto.trim();
    if (!contenido) return;

    setTexto("");
    setError(null);

    // Optimistic update
    const optimista: MensajeUnificado = {
      id: `opt-${Date.now()}`,
      contenido,
      autor_id: usuario_id,
      autor_nombre: usuario_nombre,
      autor_apellido: usuario_apellido,
      autor_foto: usuario_foto,
      creado_en: new Date().toISOString(),
    };
    setMensajes((prev) => [...prev, optimista]);

    let res;
    if (mode === "canal" && canal_id) {
      res = await enviarMensaje(canal_id, contenido);
    } else if (mode === "dm" && interlocutor_id) {
      res = await enviarMensajeDirecto(interlocutor_id, contenido);
    } else {
      return;
    }

    if (!res.ok) {
      setError(res.error);
      setMensajes((prev) => prev.filter((m) => m.id !== optimista.id));
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleEnviar();
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col bg-ruca-black">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-ruca-gray-light bg-ruca-gray px-4 py-4">
        {onVolver && (
          <button
            onClick={onVolver}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-ruca-gray-light hover:text-white md:hidden"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {mode === "canal" ? (
          <Hash size={18} className="flex-none text-ruca-yellow" />
        ) : (
          <MessageSquare size={18} className="flex-none text-ruca-yellow" />
        )}
        <h3 className="font-semibold text-white">{nombre}</h3>
        {!puedeEscribir && (
          <span className="ml-auto text-xs text-gray-500">Solo lectura</span>
        )}
      </div>

      {/* Lista de mensajes */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto px-4 py-4"
      >
        {cargando ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Cargando mensajes...
          </div>
        ) : mensajes.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            No hay mensajes. ¡Sé el primero en escribir!
          </div>
        ) : (
          mensajes.map((m) => {
            const esMio = m.autor_id === usuario_id;
            return (
              <div
                key={m.id}
                className={`flex gap-2.5 ${esMio ? "flex-row-reverse" : "flex-row"}`}
              >
                {/* Avatar (solo mensajes ajenos) */}
                {!esMio && (
                  <div className="flex h-8 w-8 flex-none items-center justify-center self-end rounded-full bg-ruca-gray-light text-xs font-bold text-white">
                    {m.autor_foto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.autor_foto}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      iniciales(m.autor_nombre, m.autor_apellido)
                    )}
                  </div>
                )}

                <div
                  className={`flex max-w-[70%] flex-col gap-0.5 ${esMio ? "items-end" : "items-start"}`}
                >
                  {!esMio && (
                    <span className="px-1 text-xs text-gray-500">
                      {m.autor_nombre} {m.autor_apellido}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
                      esMio
                        ? "rounded-tr-sm bg-ruca-yellow text-ruca-black"
                        : "rounded-tl-sm bg-ruca-gray text-white"
                    }`}
                  >
                    {m.contenido}
                  </div>
                  <span className="px-1 text-xs text-gray-600">
                    {formatHora(m.creado_en)}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-1 rounded-lg bg-red-900/30 px-3 py-2 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Input o aviso de solo lectura */}
      {puedeEscribir ? (
        <div className="border-t border-ruca-gray-light bg-ruca-gray px-4 py-3">
          <div className="flex items-end gap-2">
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Escribí un mensaje… (Enter para enviar, Shift+Enter nueva línea)"
              rows={1}
              className="flex-1 resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
              style={{ maxHeight: "8rem" }}
            />
            <button
              onClick={() => void handleEnviar()}
              disabled={!texto.trim()}
              className="flex-none rounded-xl bg-ruca-yellow p-2.5 text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-40"
            >
              <Send size={18} />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-ruca-gray-light bg-ruca-gray px-4 py-3 text-center text-sm text-gray-500">
          Solo lectura — no podés escribir en este canal
        </div>
      )}
    </div>
  );
}
