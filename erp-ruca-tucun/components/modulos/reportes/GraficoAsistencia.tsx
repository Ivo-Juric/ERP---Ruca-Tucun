"use client";

// Requiere: npm install recharts
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { DatoMensual } from "@/app/(dashboard)/reportes/actions";

type Props = {
  datos: DatoMensual[];
  titulo: string;
  periodo: string;
};

function TooltipPersonalizado({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const dato = payload[0];
  return (
    <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray px-3 py-2 text-sm shadow-lg">
      <p className="font-semibold text-white">{label}</p>
      <p className="text-ruca-yellow">{dato?.value ?? 0}% asistencia</p>
    </div>
  );
}

export default function GraficoAsistencia({ datos, titulo, periodo }: Props) {
  // Filtrar meses con datos
  const datosFiltrados = datos.filter((d) => d.total > 0);

  return (
    <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white">{titulo}</h2>
          <p className="text-xs text-gray-500">Período: {periodo}</p>
        </div>
        {datosFiltrados.length > 0 && (
          <p className="text-xs text-gray-500">
            Promedio:{" "}
            <span className="font-semibold text-ruca-yellow">
              {Math.round(
                datosFiltrados.reduce((acc, d) => acc + d.porcentaje, 0) /
                  datosFiltrados.length,
              )}
              %
            </span>
          </p>
        )}
      </div>

      {datosFiltrados.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-gray-600">
          Sin datos de asistencia para este período.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={datos}
            margin={{ top: 4, right: 8, left: -16, bottom: 0 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#3A3A3A"
              vertical={false}
            />
            <XAxis
              dataKey="mes"
              tick={{ fill: "#9CA3AF", fontSize: 12 }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fill: "#9CA3AF", fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              content={<TooltipPersonalizado />}
              cursor={{ fill: "rgba(212,176,0,0.08)" }}
            />
            <Bar
              dataKey="porcentaje"
              fill="#D4B000"
              radius={[6, 6, 0, 0]}
              maxBarSize={48}
            />
          </BarChart>
        </ResponsiveContainer>
      )}

      {/* Tabla debajo del gráfico con totales reales */}
      {datosFiltrados.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-4 border-t border-ruca-gray-light pt-4 sm:grid-cols-6">
          {datosFiltrados.map((d) => (
            <div key={d.mes} className="text-center">
              <p className="text-xs text-gray-500">{d.mes}</p>
              <p className="font-semibold text-white">{d.porcentaje}%</p>
              <p className="text-xs text-gray-600">
                {d.presentes}/{d.total}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
