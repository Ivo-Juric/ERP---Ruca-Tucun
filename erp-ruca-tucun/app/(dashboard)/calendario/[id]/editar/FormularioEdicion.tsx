"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EstadoActividad, TipoActividad } from "@prisma/client";
import { editarActividad } from "../../actions";

const LABEL_TIPO: Record<TipoActividad, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada de Formación",
  JORNADA_JEFES: "Jornada de Jefes",
  REUNION_JEFES: "Reunión de Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

const LABEL_ESTADO: Record<EstadoActividad, string> = {
  PLANIFICADA: "Planificada",
  CONFIRMADA: "Confirmada",
  REALIZADA: "Realizada",
  CANCELADA: "Cancelada",
};

interface DefaultValues {
  titulo: string;
  tipo: TipoActividad;
  estado: EstadoActividad;
  fecha_inicio: string;
  fecha_fin: string;
  lugar: string;
  descripcion: string;
}

interface Props {
  actividadId: string;
  defaultValues: DefaultValues;
}

export default function FormularioEdicion({ actividadId, defaultValues }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [titulo, setTitulo] = useState(defaultValues.titulo);
  const [tipo, setTipo] = useState<TipoActividad>(defaultValues.tipo);
  const [estado, setEstado] = useState<EstadoActividad>(defaultValues.estado);
  const [fechaInicio, setFechaInicio] = useState(defaultValues.fecha_inicio);
  const [fechaFin, setFechaFin] = useState(defaultValues.fecha_fin);
  const [lugar, setLugar] = useState(defaultValues.lugar);
  const [descripcion, setDescripcion] = useState(defaultValues.descripcion);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const res = await editarActividad(actividadId, {
        titulo,
        tipo,
        estado,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        lugar: lugar || null,
        descripcion: descripcion || null,
      });
      if (res.ok) {
        router.push(`/calendario/${actividadId}`);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-6 space-y-5"
    >
      {/* Título */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400">Título</label>
        <input
          type="text"
          required
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
        />
      </div>

      {/* Tipo + Estado */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Tipo</label>
          <select
            value={tipo}
            onChange={(e) => setTipo(e.target.value as TipoActividad)}
            className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
          >
            {Object.values(TipoActividad).map((t) => (
              <option key={t} value={t}>
                {LABEL_TIPO[t]}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Estado</label>
          <select
            value={estado}
            onChange={(e) => setEstado(e.target.value as EstadoActividad)}
            className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
          >
            {Object.values(EstadoActividad).map((s) => (
              <option key={s} value={s}>
                {LABEL_ESTADO[s]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fechas */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Fecha de inicio</label>
          <input
            type="datetime-local"
            required
            value={fechaInicio}
            onChange={(e) => setFechaInicio(e.target.value)}
            className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-400">Fecha de fin</label>
          <input
            type="datetime-local"
            required
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
            className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
          />
        </div>
      </div>

      {/* Lugar */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400">Lugar (opcional)</label>
        <input
          type="text"
          value={lugar}
          onChange={(e) => setLugar(e.target.value)}
          className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
        />
      </div>

      {/* Descripción */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-gray-400">Descripción (opcional)</label>
        <textarea
          rows={3}
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="w-full resize-none rounded-xl border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-ruca-yellow"
        />
      </div>

      {error && (
        <p className="rounded-lg bg-red-950/40 px-3 py-2 text-xs text-red-400">{error}</p>
      )}

      <div className="flex justify-end gap-3 border-t border-ruca-gray-light pt-4">
        <button
          type="button"
          onClick={() => router.back()}
          disabled={isPending}
          className="rounded-xl border border-ruca-gray-light px-4 py-2 text-sm text-zinc-300 hover:bg-ruca-gray-light disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:opacity-90 disabled:opacity-50"
        >
          {isPending ? "Guardando…" : "Guardar cambios"}
        </button>
      </div>
    </form>
  );
}
