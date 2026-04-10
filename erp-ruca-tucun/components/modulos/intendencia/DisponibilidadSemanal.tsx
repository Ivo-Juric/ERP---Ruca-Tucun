"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { CategoriaInventario } from "@prisma/client";
import {
  obtenerDisponibilidadSemana,
} from "@/app/(dashboard)/intendencia/actions";
import type { DisponibilidadSemanaRow } from "@/app/(dashboard)/intendencia/actions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Retorna el lunes de la semana del Date dado. Duplicado de lib/disponibilidad.ts
 *  para evitar importar código server-only en un Client Component. */
function getLunesLocal(fecha: Date): Date {
  const d = new Date(fecha);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatRangoSemana(lunes: Date): string {
  const domingo = new Date(lunes);
  domingo.setDate(domingo.getDate() + 6);
  const opLunes: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  const opDomingo: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };
  return `${lunes.toLocaleDateString("es-AR", opLunes)} — ${domingo.toLocaleDateString("es-AR", opDomingo)}`;
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const LABEL_CATEGORIA: Record<CategoriaInventario, string> = {
  CAMPAMENTO: "Campamento",
  FORMACION: "Formación",
  MOBILIARIO: "Mobiliario",
  INDUMENTARIA: "Indumentaria",
  OTRO: "Otro",
};

const BADGE_CATEGORIA: Record<CategoriaInventario, string> = {
  CAMPAMENTO: "bg-orange-900/40 text-orange-300",
  FORMACION: "bg-blue-900/40 text-blue-300",
  MOBILIARIO: "bg-purple-900/40 text-purple-300",
  INDUMENTARIA: "bg-pink-900/40 text-pink-300",
  OTRO: "bg-zinc-800 text-zinc-400",
};

const CATEGORIAS = Object.keys(LABEL_CATEGORIA) as CategoriaInventario[];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function DisponibilidadSemanal() {
  const [semana, setSemana] = useState<Date>(() => getLunesLocal(new Date()));
  const [datos, setDatos] = useState<DisponibilidadSemanaRow[]>([]);
  const [cargando, setCargando] = useState(true);
  const [filaExpandida, setFilaExpandida] = useState<string | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<CategoriaInventario | "">("");

  // ── Carga de datos ─────────────────────────────────────────────────────────

  useEffect(() => {
    setCargando(true);
    setFilaExpandida(null);
    obtenerDisponibilidadSemana(semana.toISOString()).then((res) => {
      if (res.ok) setDatos(res.data);
      setCargando(false);
    });
  }, [semana]);

  // ── Navegación ─────────────────────────────────────────────────────────────

  function semanaAnterior() {
    setSemana((s) => {
      const d = new Date(s);
      d.setDate(d.getDate() - 7);
      return d;
    });
  }

  function semanaSiguiente() {
    setSemana((s) => {
      const d = new Date(s);
      d.setDate(d.getDate() + 7);
      return d;
    });
  }

  function irAHoy() {
    setSemana(getLunesLocal(new Date()));
  }

  // ── Derivados ──────────────────────────────────────────────────────────────

  const datosFiltrados = datos.filter(
    (d) => !categoriaFiltro || d.item.categoria === categoriaFiltro,
  );

  function estadoBadge(d: DisponibilidadSemanaRow) {
    if (d.disponible === 0)
      return (
        <span className="rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-300">
          Agotado
        </span>
      );
    if (d.ocupado > 0)
      return (
        <span className="rounded-full bg-yellow-900/40 px-2.5 py-0.5 text-xs font-medium text-yellow-300">
          Parcial
        </span>
      );
    return (
      <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-300">
        Disponible
      </span>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Navegación de semana */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={semanaAnterior}
          className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={14} />
          Semana anterior
        </button>

        <div className="flex items-center gap-1.5 rounded-lg border border-ruca-yellow/40 bg-ruca-yellow/10 px-4 py-1.5">
          <Calendar size={13} className="text-ruca-yellow" />
          <span className="text-sm font-medium text-white">
            {formatRangoSemana(semana)}
          </span>
        </div>

        <button
          type="button"
          onClick={semanaSiguiente}
          className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-3 py-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
        >
          Semana siguiente
          <ChevronRight size={14} />
        </button>

        <button
          type="button"
          onClick={irAHoy}
          className="rounded-lg bg-ruca-gray-light px-3 py-1.5 text-sm font-medium text-zinc-300 hover:text-white transition-colors"
        >
          Hoy
        </button>
      </div>

      {/* Filtro por categoría */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-zinc-500">Categoría:</span>
        <button
          type="button"
          onClick={() => setCategoriaFiltro("")}
          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
            !categoriaFiltro
              ? "bg-ruca-yellow text-ruca-black"
              : "border border-ruca-gray-light text-zinc-500 hover:text-white"
          }`}
        >
          Todas
        </button>
        {CATEGORIAS.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCategoriaFiltro(cat)}
            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
              categoriaFiltro === cat
                ? "bg-ruca-yellow text-ruca-black"
                : "border border-ruca-gray-light text-zinc-500 hover:text-white"
            }`}
          >
            {LABEL_CATEGORIA[cat]}
          </button>
        ))}
      </div>

      {/* Tabla */}
      {cargando ? (
        <div className="flex h-40 items-center justify-center text-sm text-zinc-500">
          Cargando disponibilidad...
        </div>
      ) : datosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-12 text-center text-sm text-zinc-500">
          No hay ítems en el inventario.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
                <th className="px-4 py-3 font-semibold text-zinc-300">Ítem</th>
                <th className="px-4 py-3 font-semibold text-zinc-300">Categoría</th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-300">
                  Total
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-300">
                  Ocupado
                </th>
                <th className="px-4 py-3 text-right font-semibold text-zinc-300">
                  Disponible
                </th>
                <th className="px-4 py-3 font-semibold text-zinc-300">Estado</th>
                <th className="px-4 py-3 w-6" />
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.map((row, i) => {
                const expandido = filaExpandida === row.item.id;
                const clickeable = row.ocupado > 0;

                return (
                  <>
                    <tr
                      key={row.item.id}
                      onClick={() => {
                        if (!clickeable) return;
                        setFilaExpandida(expandido ? null : row.item.id);
                      }}
                      className={[
                        "border-b border-ruca-gray-light/50 transition-colors",
                        i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30",
                        clickeable ? "cursor-pointer hover:bg-ruca-gray/60" : "",
                        expandido ? "bg-ruca-gray/60" : "",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">
                          {row.item.nombre}
                        </span>
                        {row.item.descripcion && (
                          <p className="mt-0.5 text-xs text-zinc-600">
                            {row.item.descripcion}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CATEGORIA[row.item.categoria]}`}
                        >
                          {LABEL_CATEGORIA[row.item.categoria]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">
                        {row.total}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        <span className={row.ocupado > 0 ? "text-red-400" : "text-zinc-600"}>
                          {row.ocupado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold">
                        <span
                          className={
                            row.disponible === 0
                              ? "text-red-400"
                              : row.disponible === row.total
                                ? "text-green-400"
                                : "text-yellow-400"
                          }
                        >
                          {row.disponible}
                        </span>
                      </td>
                      <td className="px-4 py-3">{estadoBadge(row)}</td>
                      <td className="px-4 py-3 text-zinc-600">
                        {clickeable &&
                          (expandido ? (
                            <ChevronUp size={14} />
                          ) : (
                            <ChevronDown size={14} />
                          ))}
                      </td>
                    </tr>

                    {/* Detalle expandido inline */}
                    {expandido && (
                      <tr
                        key={`${row.item.id}-detalle`}
                        className="border-b border-ruca-gray-light/50 bg-ruca-black/60"
                      >
                        <td colSpan={7} className="px-6 py-3">
                          <div className="space-y-1">
                            <p className="mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                              Solicitudes activas esta semana
                            </p>
                            {row.solicitudesActivas.map((s) => (
                              <div
                                key={s.id}
                                className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg bg-ruca-gray/60 px-3 py-2 text-xs"
                              >
                                <span className="font-medium text-white">
                                  {s.solicitado_por.seccion?.nombre ??
                                    `${s.solicitado_por.nombre} ${s.solicitado_por.apellido}`}
                                </span>
                                <span className="text-zinc-400">
                                  {s.actividad.titulo}
                                </span>
                                <span className="font-mono text-ruca-yellow">
                                  ×{s.cantidad_aprobada ?? s.cantidad}
                                </span>
                                <span className="text-zinc-500">
                                  Uso: {formatFecha(s.fecha_uso)}
                                  {s.fecha_devolucion_esperada
                                    ? ` → Dev: ${formatFecha(s.fecha_devolucion_esperada)}`
                                    : " (sin devolución)"}
                                </span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
