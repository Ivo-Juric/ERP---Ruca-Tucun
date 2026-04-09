"use client";

import { useState, useEffect, useTransition } from "react";
import { Check, X, UserCheck } from "lucide-react";
import {
  obtenerMiembrosPorSeccion,
  obtenerAsistenciaActividad,
  registrarAsistencia,
} from "@/app/(dashboard)/miembros/actions";
import type { MiembroBasico } from "@/app/(dashboard)/miembros/actions";

// ─── Tipos locales ────────────────────────────────────────────────────────────

interface Props {
  actividadId: string;
  seccionId: string;
}

interface PresenteInfo {
  pago_sabado: boolean;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function iniciales(nombre: string, apellido: string): string {
  return `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase();
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ mensaje, tipo }: { mensaje: string; tipo: "exito" | "error" }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium shadow-2xl transition-all ${
        tipo === "exito" ? "bg-green-600 text-white" : "bg-red-600 text-white"
      }`}
    >
      {tipo === "exito" ? <Check size={15} /> : <X size={15} />}
      {mensaje}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function RegistroAsistencia({ actividadId, seccionId }: Props) {
  const [miembros, setMiembros] = useState<MiembroBasico[]>([]);
  const [presentes, setPresentes] = useState<Map<string, PresenteInfo>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [toast, setToast] = useState<{ mensaje: string; tipo: "exito" | "error" } | null>(null);
  const [, startTransition] = useTransition();

  // ── Carga inicial ──────────────────────────────────────────────────────────

  useEffect(() => {
    async function cargar() {
      const [resMiembros, resAsistencia] = await Promise.all([
        obtenerMiembrosPorSeccion(seccionId),
        obtenerAsistenciaActividad(actividadId),
      ]);

      if (resMiembros.ok) setMiembros(resMiembros.data);

      if (resAsistencia.ok) {
        const mapa = new Map<string, PresenteInfo>();
        for (const r of resAsistencia.data) {
          if (r.presente) mapa.set(r.miembro_id, { pago_sabado: r.pago_sabado });
        }
        setPresentes(mapa);
      }

      setCargando(false);
    }
    void cargar();
  }, [actividadId, seccionId]);

  // ── Toast ──────────────────────────────────────────────────────────────────

  function mostrarToast(mensaje: string, tipo: "exito" | "error") {
    setToast({ mensaje, tipo });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Acciones de lista ──────────────────────────────────────────────────────

  function agregarPresente(miembro_id: string) {
    setPresentes((prev) => {
      const next = new Map(prev);
      next.set(miembro_id, { pago_sabado: false });
      return next;
    });
  }

  function quitarPresente(miembro_id: string) {
    setPresentes((prev) => {
      const next = new Map(prev);
      next.delete(miembro_id);
      return next;
    });
  }

  function togglePago(miembro_id: string) {
    setPresentes((prev) => {
      const next = new Map(prev);
      const info = next.get(miembro_id);
      if (info) next.set(miembro_id, { pago_sabado: !info.pago_sabado });
      return next;
    });
  }

  function guardar() {
    startTransition(async () => {
      const registros = miembros.map((m) => ({
        miembro_id: m.id,
        presente: presentes.has(m.id),
        pago_sabado: presentes.get(m.id)?.pago_sabado ?? false,
      }));
      const res = await registrarAsistencia(actividadId, registros);
      if (res.ok) {
        mostrarToast("Asistencia guardada", "exito");
      } else {
        mostrarToast(res.error, "error");
      }
    });
  }

  // ── Derivados ──────────────────────────────────────────────────────────────

  const miembrosFiltrados = miembros.filter((m) => {
    const q = busqueda.toLowerCase();
    return (
      m.nombre.toLowerCase().includes(q) || m.apellido.toLowerCase().includes(q)
    );
  });

  const miembrosPresentes = miembros.filter((m) => presentes.has(m.id));

  // ── Render ─────────────────────────────────────────────────────────────────

  if (cargando) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-zinc-500">
        Cargando asistencia...
      </div>
    );
  }

  return (
    <div className="mt-6">
      <h2 className="mb-4 text-lg font-bold text-white">Registro de asistencia</h2>

      <div className="flex flex-col gap-4 md:flex-row">
        {/* ── Panel izquierdo: lista de miembros ── */}
        <div className="flex-1 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4">
          <h3 className="mb-3 text-sm font-semibold text-white">
            Miembros de la sección
          </h3>

          <input
            type="text"
            placeholder="Buscar por nombre o apellido..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="mb-3 w-full rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow"
          />

          <div className="max-h-80 space-y-0.5 overflow-y-auto">
            {miembrosFiltrados.length === 0 && (
              <p className="py-4 text-center text-xs text-zinc-600">Sin resultados</p>
            )}
            {miembrosFiltrados.map((m) => {
              const estaPresente = presentes.has(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() =>
                    estaPresente ? quitarPresente(m.id) : agregarPresente(m.id)
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-ruca-gray-light/40"
                >
                  {/* Avatar */}
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ruca-gray-light text-xs font-bold text-white">
                    {iniciales(m.nombre, m.apellido)}
                  </div>
                  {/* Nombre */}
                  <span className="flex-1 text-sm text-white">
                    {m.apellido}, {m.nombre}
                  </span>
                  {/* Indicador */}
                  {estaPresente ? (
                    <Check size={18} className="flex-none text-green-400" />
                  ) : (
                    <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-ruca-yellow text-xs font-bold text-ruca-black">
                      +
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Panel derecho: presentes ── */}
        <div className="flex flex-1 flex-col rounded-xl border border-ruca-gray-light bg-ruca-gray p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Presentes</h3>
            <span className="text-sm font-bold text-ruca-yellow">
              {miembrosPresentes.length} / {miembros.length}
            </span>
          </div>

          <div className="max-h-80 flex-1 space-y-0.5 overflow-y-auto">
            {miembrosPresentes.length === 0 && (
              <div className="flex flex-col items-center justify-center gap-2 py-8 text-zinc-600">
                <UserCheck size={22} />
                <p className="text-xs">Ningún miembro presente aún</p>
              </div>
            )}
            {miembrosPresentes.map((m) => {
              const info = presentes.get(m.id)!;
              return (
                <div key={m.id} className="flex items-center gap-3 rounded-lg px-3 py-2">
                  {/* Avatar */}
                  <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ruca-gray-light text-xs font-bold text-white">
                    {iniciales(m.nombre, m.apellido)}
                  </div>
                  {/* Nombre */}
                  <span className="flex-1 truncate text-sm text-white">
                    {m.apellido}, {m.nombre}
                  </span>
                  {/* Toggle pago */}
                  <button
                    type="button"
                    onClick={() => togglePago(m.id)}
                    title="Pagó $"
                    className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                      info.pago_sabado
                        ? "bg-ruca-yellow text-ruca-black"
                        : "bg-ruca-gray-light text-zinc-400"
                    }`}
                  >
                    <span
                      className={`h-2 w-2 rounded-full ${
                        info.pago_sabado ? "bg-ruca-black" : "bg-zinc-500"
                      }`}
                    />
                    Pagó $
                  </button>
                  {/* Quitar */}
                  <button
                    type="button"
                    onClick={() => quitarPresente(m.id)}
                    title="Quitar de presentes"
                    className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <X size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={guardar}
            className="mt-4 w-full rounded-lg bg-ruca-yellow py-2.5 text-sm font-bold text-ruca-black transition-colors hover:bg-ruca-yellow-light"
          >
            Guardar asistencia
          </button>
        </div>
      </div>

      {toast && <Toast mensaje={toast.mensaje} tipo={toast.tipo} />}
    </div>
  );
}
