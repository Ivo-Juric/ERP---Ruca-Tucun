"use client";

import { useState, useTransition } from "react";
import { obtenerActividadGeneral } from "./actions";
import type { FilaActividad } from "./actions";
import FiltrosReporte, { type FiltroAplicado } from "./FiltrosReporte";
import TablaReporte from "@/components/modulos/reportes/TablaReporte";

const LABEL_TIPO: Record<string, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada FDoc",
  JORNADA_JEFES: "Jornada Jefes",
  REUNION_JEFES: "Reunión Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

interface Props {
  datosIniciales: FilaActividad[];
  anioInicial: number;
}

export default function SeccionActividadesCliente({
  datosIniciales,
  anioInicial,
}: Props) {
  const [datos, setDatos] = useState(datosIniciales);
  const [tituloTabla, setTituloTabla] = useState(`Actividades realizadas ${anioInicial}`);
  const [isPending, startTransition] = useTransition();

  function handleAplicar(filtros: FiltroAplicado) {
    startTransition(async () => {
      const res = await obtenerActividadGeneral({
        tipos: filtros.tipos,
        desde: filtros.desde,
        hasta: filtros.hasta,
      });
      if (res.ok) {
        const desdeDate = new Date(filtros.desde);
        const hastaDate = new Date(filtros.hasta);
        setDatos(res.data);
        setTituloTabla(
          `Actividades — ${desdeDate.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })} al ${hastaDate.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}`,
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <FiltrosReporte onAplicar={handleAplicar} cargando={isPending} />
      {isPending ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-8 text-center text-sm text-gray-500">
          Cargando datos…
        </div>
      ) : (
        <TablaReporte
          titulo={tituloTabla}
          nombreArchivo="actividades"
          columnas={[
            { key: "titulo", label: "Título" },
            { key: "tipo", label: "Tipo" },
            { key: "fecha", label: "Fecha" },
            { key: "seccion", label: "Sección" },
            { key: "asistencia_pct", label: "% Asistencia" },
          ]}
          datos={datos.map((d) => ({
            titulo: d.titulo,
            tipo: LABEL_TIPO[d.tipo] ?? d.tipo,
            fecha: new Date(d.fecha).toLocaleDateString("es-AR"),
            seccion: d.seccion,
            asistencia_pct: d.asistencia_pct !== null ? `${d.asistencia_pct}%` : "—",
          }))}
        />
      )}
    </div>
  );
}
