"use client";

import { Download } from "lucide-react";

type Columna = {
  key: string;
  label: string;
};

type Props = {
  titulo: string;
  nombreArchivo: string;
  columnas: Columna[];
  datos: Record<string, string | number>[];
};

function escaparCSV(valor: string | number): string {
  const str = String(valor);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function TablaReporte({
  titulo,
  nombreArchivo,
  columnas,
  datos,
}: Props) {
  function exportarCSV() {
    const encabezado = columnas.map((c) => escaparCSV(c.label)).join(",");
    const filas = datos.map((fila) =>
      columnas.map((c) => escaparCSV(fila[c.key] ?? "")).join(","),
    );
    const csv = [encabezado, ...filas].join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nombreArchivo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ruca-gray-light px-5 py-4">
        <h2 className="font-semibold text-white">{titulo}</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{datos.length} registros</span>
          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 rounded-lg border border-ruca-gray-light px-3 py-1.5 text-xs font-medium text-gray-300 hover:border-ruca-yellow/50 hover:text-ruca-yellow"
          >
            <Download size={13} />
            Exportar CSV
          </button>
        </div>
      </div>

      {datos.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-gray-600">
          Sin datos para mostrar.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ruca-gray-light text-left">
                {columnas.map((c) => (
                  <th
                    key={c.key}
                    className="px-4 py-3 font-semibold text-gray-400"
                  >
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {datos.map((fila, i) => (
                <tr
                  key={i}
                  className={`border-b border-ruca-gray-light/50 text-sm ${
                    i % 2 === 0 ? "bg-ruca-black/50" : ""
                  }`}
                >
                  {columnas.map((c) => (
                    <td key={c.key} className="px-4 py-2.5 text-gray-300">
                      {fila[c.key] ?? "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
