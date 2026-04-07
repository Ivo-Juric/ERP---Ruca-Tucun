"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import { Search } from "lucide-react";
import { EstadoMiembro } from "@prisma/client";

interface Seccion {
  id: string;
  nombre: string;
}

interface FiltrosMiembrosProps {
  secciones: Seccion[];
  puedeVerTodasSecciones: boolean;
}

const LABEL_ESTADO: Record<EstadoMiembro, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  EGRESADO: "Egresado",
};

export default function FiltrosMiembros({
  secciones,
  puedeVerTodasSecciones,
}: FiltrosMiembrosProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const actualizarFiltro = useCallback(
    (clave: string, valor: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (valor) {
        params.set(clave, valor);
      } else {
        params.delete(clave);
      }
      params.delete("pagina"); // resetear paginación al filtrar
      router.replace(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams],
  );

  return (
    <div className="flex flex-wrap gap-3">
      {/* Buscador */}
      <div className="relative flex-1 min-w-48">
        <Search
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          type="search"
          placeholder="Buscar por nombre..."
          defaultValue={searchParams.get("q") ?? ""}
          onChange={(e) => actualizarFiltro("q", e.target.value)}
          className="w-full rounded-lg border border-ruca-gray-light bg-ruca-gray pl-9 pr-4 py-2 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
        />
      </div>

      {/* Filtro sección */}
      {puedeVerTodasSecciones && secciones.length > 0 && (
        <select
          defaultValue={searchParams.get("seccion") ?? ""}
          onChange={(e) => actualizarFiltro("seccion", e.target.value)}
          className="rounded-lg border border-ruca-gray-light bg-ruca-gray px-3 py-2 text-sm text-white outline-none focus:border-ruca-yellow"
        >
          <option value="">Todas las secciones</option>
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      )}

      {/* Filtro estado */}
      <select
        defaultValue={searchParams.get("estado") ?? ""}
        onChange={(e) => actualizarFiltro("estado", e.target.value)}
        className="rounded-lg border border-ruca-gray-light bg-ruca-gray px-3 py-2 text-sm text-white outline-none focus:border-ruca-yellow"
      >
        <option value="">Todos los estados</option>
        {(Object.keys(LABEL_ESTADO) as EstadoMiembro[]).map((e) => (
          <option key={e} value={e}>
            {LABEL_ESTADO[e]}
          </option>
        ))}
      </select>
    </div>
  );
}
