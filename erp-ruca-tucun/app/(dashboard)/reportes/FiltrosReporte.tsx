"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { TipoActividad } from "@prisma/client";

// ─── Tipos ────────────────────────────────────────────────────────────────────

export type FiltroAplicado = {
  tipos: TipoActividad[];
  desde: string; // ISO string
  hasta: string; // ISO string
};

type Modo = "mes" | "semana" | "personalizado";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TODOS_TIPOS = Object.values(TipoActividad);

const LABEL_TIPO: Record<TipoActividad, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada FDoc",
  JORNADA_JEFES: "Jornada Jefes",
  REUNION_JEFES: "Reunión Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

const MESES_CORTO = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

const MESES_LARGO = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function obtenerLunes(d: Date): Date {
  const copy = new Date(d);
  const day = copy.getDay(); // 0=dom
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatearSemana(lunes: Date): string {
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const fmtDia = (d: Date) =>
    `${d.getDate()} ${MESES_CORTO[d.getMonth()]}`;
  return `${fmtDia(lunes)} — ${fmtDia(domingo)} ${domingo.getFullYear()}`;
}

// ─── Componente ───────────────────────────────────────────────────────────────

interface Props {
  onAplicar: (filtros: FiltroAplicado) => void;
  cargando?: boolean;
}

export default function FiltrosReporte({ onAplicar, cargando }: Props) {
  const hoy = new Date();

  const [tipos, setTipos] = useState<TipoActividad[]>([...TODOS_TIPOS]);
  const [modo, setModo] = useState<Modo>("mes");

  // Modo mes
  const [anioSel, setAnioSel] = useState(hoy.getFullYear());
  const [mesSel, setMesSel] = useState(hoy.getMonth() + 1); // 1-12

  // Modo semana
  const [lunes, setLunes] = useState(() => obtenerLunes(hoy));

  // Modo personalizado
  const [pDesde, setPDesde] = useState(
    new Date(hoy.getFullYear(), 0, 1).toISOString().slice(0, 10),
  );
  const [pHasta, setPHasta] = useState(hoy.toISOString().slice(0, 10));
  const [errDesde, setErrDesde] = useState<string | null>(null);
  const [errHasta, setErrHasta] = useState<string | null>(null);

  const todosSeleccionados = tipos.length === TODOS_TIPOS.length;

  // ── Tipos ──────────────────────────────────────────────────────────────────

  function toggleTipo(t: TipoActividad) {
    setTipos((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );
  }

  function toggleTodos() {
    setTipos(todosSeleccionados ? [] : [...TODOS_TIPOS]);
  }

  // ── Semana ─────────────────────────────────────────────────────────────────

  function semanaAnterior() {
    setLunes((prev) => {
      const nueva = new Date(prev);
      nueva.setDate(nueva.getDate() - 7);
      return nueva;
    });
  }

  function semanaSiguiente() {
    const lunesHoy = obtenerLunes(hoy);
    setLunes((prev) => {
      const nueva = new Date(prev);
      nueva.setDate(nueva.getDate() + 7);
      return nueva <= lunesHoy ? nueva : prev;
    });
  }

  // ── Validación personalizado ───────────────────────────────────────────────

  function validarPersonalizado(): boolean {
    setErrDesde(null);
    setErrHasta(null);
    const d = new Date(pDesde + "T00:00:00");
    const h = new Date(pHasta + "T23:59:59");
    const hoyFin = new Date();
    hoyFin.setHours(23, 59, 59, 999);

    let ok = true;

    if (d > h) {
      setErrDesde("La fecha de inicio no puede ser posterior a la de fin.");
      ok = false;
    }
    if (h > hoyFin) {
      setErrHasta("La fecha de fin no puede ser posterior a hoy.");
      ok = false;
    }
    const dias = (h.getTime() - d.getTime()) / 86_400_000;
    if (ok && dias > 365) {
      setErrDesde("El rango no puede superar 365 días.");
      ok = false;
    }

    return ok;
  }

  const personalizadoInvalido =
    modo === "personalizado" && (!!errDesde || !!errHasta);

  // ── Computar rango ─────────────────────────────────────────────────────────

  function computarRango(): { desde: string; hasta: string } {
    if (modo === "mes") {
      const desde = new Date(anioSel, mesSel - 1, 1, 0, 0, 0);
      const hasta = new Date(anioSel, mesSel, 0, 23, 59, 59);
      return { desde: desde.toISOString(), hasta: hasta.toISOString() };
    }
    if (modo === "semana") {
      const desde = new Date(lunes);
      desde.setHours(0, 0, 0, 0);
      const hasta = new Date(lunes);
      hasta.setDate(hasta.getDate() + 6);
      hasta.setHours(23, 59, 59, 999);
      return { desde: desde.toISOString(), hasta: hasta.toISOString() };
    }
    const desde = new Date(pDesde + "T00:00:00");
    const hasta = new Date(pHasta + "T23:59:59");
    return { desde: desde.toISOString(), hasta: hasta.toISOString() };
  }

  function handleAplicar() {
    if (modo === "personalizado" && !validarPersonalizado()) return;
    const { desde, hasta } = computarRango();
    onAplicar({ tipos, desde, hasta });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-5 space-y-5">
      {/* Tipos de actividad */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Tipo de actividad
        </p>
        <div className="flex flex-wrap gap-2">
          {/* Todos/Ninguno */}
          <button
            type="button"
            onClick={toggleTodos}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              todosSeleccionados
                ? "border-ruca-yellow bg-ruca-yellow/20 text-ruca-yellow"
                : "border-ruca-gray-light text-gray-500 hover:border-gray-400"
            }`}
          >
            {todosSeleccionados ? "Todos" : "Ninguno"}
          </button>
          {TODOS_TIPOS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => toggleTipo(t)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                tipos.includes(t)
                  ? "border-ruca-yellow bg-ruca-yellow/10 text-ruca-yellow"
                  : "border-ruca-gray-light text-gray-500 hover:border-gray-400"
              }`}
            >
              {LABEL_TIPO[t]}
            </button>
          ))}
        </div>
      </div>

      {/* Período */}
      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Período
        </p>

        {/* Tabs de modo */}
        <div className="mb-3 flex gap-1 rounded-lg border border-ruca-gray-light bg-ruca-black p-1 w-fit">
          {(["mes", "semana", "personalizado"] as Modo[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setModo(m)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                modo === m
                  ? "bg-ruca-yellow text-ruca-black"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {m === "mes" ? "Por mes" : m === "semana" ? "Por semana" : "Personalizado"}
            </button>
          ))}
        </div>

        {/* Selector de mes */}
        {modo === "mes" && (
          <div className="flex items-center gap-2">
            <select
              value={mesSel}
              onChange={(e) => setMesSel(Number(e.target.value))}
              className="rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
            >
              {MESES_LARGO.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={anioSel}
              onChange={(e) => setAnioSel(Number(e.target.value))}
              className="rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
            >
              {Array.from({ length: 5 }, (_, i) => hoy.getFullYear() - i).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Selector de semana */}
        {modo === "semana" && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={semanaAnterior}
              className="rounded-lg border border-ruca-gray-light p-1.5 text-gray-400 hover:text-white"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-sm text-white">{formatearSemana(lunes)}</span>
            <button
              type="button"
              onClick={semanaSiguiente}
              disabled={lunes >= obtenerLunes(hoy)}
              className="rounded-lg border border-ruca-gray-light p-1.5 text-gray-400 hover:text-white disabled:opacity-30"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* Período personalizado */}
        {modo === "personalizado" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-gray-400">Desde</label>
              <input
                type="date"
                value={pDesde}
                max={hoy.toISOString().slice(0, 10)}
                onChange={(e) => {
                  setPDesde(e.target.value);
                  setErrDesde(null);
                }}
                className="w-full rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
              />
              {errDesde && (
                <p className="mt-1 text-xs text-red-400">{errDesde}</p>
              )}
            </div>
            <div>
              <label className="mb-1 block text-xs text-gray-400">Hasta</label>
              <input
                type="date"
                value={pHasta}
                max={hoy.toISOString().slice(0, 10)}
                onChange={(e) => {
                  setPHasta(e.target.value);
                  setErrHasta(null);
                }}
                className="w-full rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
              />
              {errHasta && (
                <p className="mt-1 text-xs text-red-400">{errHasta}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Botón aplicar */}
      <div className="flex items-center gap-3 border-t border-ruca-gray-light pt-4">
        <button
          type="button"
          onClick={handleAplicar}
          disabled={cargando || personalizadoInvalido || tipos.length === 0}
          className="rounded-lg bg-ruca-yellow px-5 py-2 text-sm font-semibold text-ruca-black hover:opacity-90 disabled:opacity-40"
        >
          {cargando ? "Cargando…" : "Aplicar filtros"}
        </button>
        {tipos.length === 0 && (
          <p className="text-xs text-red-400">Seleccioná al menos un tipo.</p>
        )}
      </div>
    </div>
  );
}
