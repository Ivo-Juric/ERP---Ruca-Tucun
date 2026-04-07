"use client";

import { useState, useCallback } from "react";
import { Hash, MessageSquare, Plus, Users, X } from "lucide-react";
import type {
  CanalConAcceso,
  ConversacionDM,
  UsuarioBasico,
} from "@/app/(dashboard)/comunicacion/actions";
import { obtenerUsuarios } from "@/app/(dashboard)/comunicacion/actions";
import AreaMensajes from "./AreaMensajes";

type Props = {
  canalesIniciales: CanalConAcceso[];
  conversacionesIniciales: ConversacionDM[];
  usuarioId: string;
  usuarioNombre: string;
  usuarioApellido: string;
  usuarioFoto: string | null;
};

type Seleccion =
  | { tipo: "canal"; canal: CanalConAcceso }
  | { tipo: "dm"; conv: ConversacionDM }
  | null;

function iniciales(nombre: string, apellido: string): string {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

export default function ComunicacionLayout({
  canalesIniciales,
  conversacionesIniciales,
  usuarioId,
  usuarioNombre,
  usuarioApellido,
  usuarioFoto,
}: Props) {
  const [seleccion, setSeleccion] = useState<Seleccion>(null);
  const [canales] = useState(canalesIniciales);
  const [conversaciones, setConversaciones] = useState(conversacionesIniciales);
  const [mostrarSelector, setMostrarSelector] = useState(false);
  const [usuarios, setUsuarios] = useState<UsuarioBasico[]>([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(false);

  const haySeleccion = seleccion !== null;

  const handleAbrirSelector = useCallback(async () => {
    setMostrarSelector(true);
    if (usuarios.length === 0) {
      setCargandoUsuarios(true);
      const res = await obtenerUsuarios();
      if (res.ok) setUsuarios(res.data);
      setCargandoUsuarios(false);
    }
  }, [usuarios.length]);

  const handleSeleccionarUsuario = useCallback(
    (u: UsuarioBasico) => {
      setMostrarSelector(false);
      const existente = conversaciones.find((c) => c.interlocutor_id === u.id);
      if (existente) {
        setSeleccion({ tipo: "dm", conv: existente });
      } else {
        const nueva: ConversacionDM = {
          interlocutor_id: u.id,
          nombre: u.nombre,
          apellido: u.apellido,
          foto_url: u.foto_url,
          ultimo_mensaje: "",
          ultimo_mensaje_en: new Date().toISOString(),
          no_leidos: 0,
        };
        setConversaciones((prev) => [nueva, ...prev]);
        setSeleccion({ tipo: "dm", conv: nueva });
      }
    },
    [conversaciones],
  );

  return (
    <>
      {/* Modal selector de usuario */}
      {mostrarSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-5 py-4">
              <div className="flex items-center gap-2">
                <Users size={18} className="text-ruca-yellow" />
                <h3 className="font-semibold text-white">Nueva conversación</h3>
              </div>
              <button
                onClick={() => setMostrarSelector(false)}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {cargandoUsuarios ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  Cargando usuarios...
                </div>
              ) : usuarios.length === 0 ? (
                <div className="py-10 text-center text-sm text-gray-500">
                  No hay otros usuarios activos.
                </div>
              ) : (
                usuarios.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => handleSeleccionarUsuario(u)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-ruca-gray-light"
                  >
                    <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ruca-yellow text-xs font-bold text-ruca-black">
                      {iniciales(u.nombre, u.apellido)}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-white">
                        {u.nombre} {u.apellido}
                      </div>
                      <div className="text-xs text-gray-500">
                        {u.rol.replace(/_/g, " ")}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Layout principal */}
      <div className="flex h-[calc(100dvh-10rem)] overflow-hidden rounded-xl border border-ruca-gray-light md:h-[calc(100dvh-3rem)]">
        {/* Panel izquierdo */}
        <div
          className={`flex h-full flex-col border-r border-ruca-gray-light bg-ruca-gray ${
            haySeleccion
              ? "hidden md:flex md:w-72 md:flex-none"
              : "w-full md:w-72 md:flex-none"
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-ruca-gray-light px-4 py-4">
            <h2 className="font-semibold text-white">Mensajería</h2>
            <button
              onClick={handleAbrirSelector}
              className="rounded-lg p-2 text-ruca-yellow hover:bg-ruca-gray-light"
              title="Nueva conversación directa"
            >
              <Plus size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* Canales */}
            <div>
              <div className="flex items-center gap-1.5 px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <Hash size={11} />
                Canales
              </div>
              {canales.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-600">
                  Sin canales asignados.
                </p>
              ) : (
                canales.map((mc) => {
                  const activo =
                    seleccion?.tipo === "canal" &&
                    seleccion.canal.canal_id === mc.canal_id;
                  return (
                    <button
                      key={mc.canal_id}
                      onClick={() => setSeleccion({ tipo: "canal", canal: mc })}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-ruca-gray-light ${
                        activo ? "bg-ruca-gray-light" : ""
                      }`}
                    >
                      <Hash
                        size={15}
                        className="mt-0.5 flex-none text-ruca-yellow"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {mc.canal.nombre}
                        </p>
                        {mc.ultimo_mensaje && (
                          <p className="truncate text-xs text-gray-500">
                            {mc.ultimo_mensaje.autor_nombre}:{" "}
                            {mc.ultimo_mensaje.contenido}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Mensajes directos */}
            <div>
              <div className="flex items-center gap-1.5 px-4 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-gray-500">
                <MessageSquare size={11} />
                Mensajes directos
              </div>
              {conversaciones.length === 0 ? (
                <p className="px-4 py-3 text-sm text-gray-600">
                  Sin conversaciones. Usá + para iniciar una.
                </p>
              ) : (
                conversaciones.map((conv) => {
                  const activo =
                    seleccion?.tipo === "dm" &&
                    seleccion.conv.interlocutor_id === conv.interlocutor_id;
                  return (
                    <button
                      key={conv.interlocutor_id}
                      onClick={() => setSeleccion({ tipo: "dm", conv })}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-ruca-gray-light ${
                        activo ? "bg-ruca-gray-light" : ""
                      }`}
                    >
                      <div className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-ruca-yellow text-xs font-bold text-ruca-black">
                        {conv.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={conv.foto_url}
                            alt=""
                            className="h-9 w-9 rounded-full object-cover"
                          />
                        ) : (
                          iniciales(conv.nombre, conv.apellido)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="truncate text-sm font-medium text-white">
                            {conv.nombre} {conv.apellido}
                          </p>
                          {conv.no_leidos > 0 && (
                            <span className="flex-none rounded-full bg-ruca-yellow px-1.5 py-0.5 text-xs font-bold text-ruca-black">
                              {conv.no_leidos}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-gray-500">
                          {conv.ultimo_mensaje || "Sin mensajes"}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Panel derecho */}
        <div
          className={`flex-col overflow-hidden ${haySeleccion ? "flex flex-1" : "hidden md:flex md:flex-1"}`}
        >
          {seleccion === null ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-gray-600">
              <MessageSquare size={48} className="opacity-20" />
              <p className="text-sm">Seleccioná un canal o conversación</p>
            </div>
          ) : seleccion.tipo === "canal" ? (
            <AreaMensajes
              key={`canal-${seleccion.canal.canal_id}`}
              mode="canal"
              canal_id={seleccion.canal.canal_id}
              nombre={seleccion.canal.canal.nombre}
              puede_escribir={seleccion.canal.puede_escribir}
              usuario_id={usuarioId}
              usuario_nombre={usuarioNombre}
              usuario_apellido={usuarioApellido}
              usuario_foto={usuarioFoto}
              onVolver={() => setSeleccion(null)}
            />
          ) : (
            <AreaMensajes
              key={`dm-${seleccion.conv.interlocutor_id}`}
              mode="dm"
              interlocutor_id={seleccion.conv.interlocutor_id}
              nombre={`${seleccion.conv.nombre} ${seleccion.conv.apellido}`}
              usuario_id={usuarioId}
              usuario_nombre={usuarioNombre}
              usuario_apellido={usuarioApellido}
              usuario_foto={usuarioFoto}
              onVolver={() => setSeleccion(null)}
            />
          )}
        </div>
      </div>
    </>
  );
}
