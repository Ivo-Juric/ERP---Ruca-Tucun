"use client";

import { useState, useTransition } from "react";
import { obtenerAsistenciaMensual } from "./actions";
import type { DatoMensual, TabReporte } from "./actions";
import FiltrosReporte, { type FiltroAplicado } from "./FiltrosReporte";
import GraficoAsistencia from "@/components/modulos/reportes/GraficoAsistencia";
import TablaReporte from "@/components/modulos/reportes/TablaReporte";

interface Props {
  tabActual: TabReporte;
  datosIniciales: DatoMensual[];
  tituloInicial: string;
  periodoInicial: string;
}

export default function SeccionAsistenciaCliente({
  tabActual,
  datosIniciales,
  tituloInicial,
  periodoInicial,
}: Props) {
  const [datos, setDatos] = useState(datosIniciales);
  const [titulo, setTitulo] = useState(tituloInicial);
  const [periodo, setPeriodo] = useState(periodoInicial);
  const [isPending, startTransition] = useTransition();

  function handleAplicar(filtros: FiltroAplicado) {
    startTransition(async () => {
      const res = await obtenerAsistenciaMensual({
        seccion_id: tabActual.seccion_id,
        agrupacion_tipo: tabActual.agrupacion_tipo,
        tipos: filtros.tipos,
        desde: filtros.desde,
        hasta: filtros.hasta,
      });
      if (res.ok) {
        const desdeDate = new Date(filtros.desde);
        const hastaDate = new Date(filtros.hasta);
        const nuevoTitulo = `Asistencia — ${desdeDate.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })} al ${hastaDate.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })}`;
        setDatos(res.data);
        setTitulo(nuevoTitulo);
        setPeriodo(`${desdeDate.getFullYear()}`);
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
        <>
          <GraficoAsistencia datos={datos} titulo={titulo} periodo={periodo} />
          <TablaReporte
            titulo="Asistencia por mes"
            nombreArchivo="asistencia"
            columnas={[
              { key: "mes", label: "Mes" },
              { key: "presentes", label: "Presentes" },
              { key: "total", label: "Total" },
              { key: "porcentaje", label: "%" },
            ]}
            datos={datos.map((d) => ({
              mes: d.mes,
              presentes: d.presentes,
              total: d.total,
              porcentaje: `${d.porcentaje}%`,
            }))}
          />
        </>
      )}
    </div>
  );
}
