export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import {
  obtenerTabsReporte,
  obtenerAsistenciaMensual,
  obtenerProgresoFDoc,
  obtenerResumenInventario,
  obtenerActividadGeneral,
  obtenerMiembrosConAsistencia,
} from "./actions";
import TablaReporte from "@/components/modulos/reportes/TablaReporte";
import SeccionAsistenciaCliente from "./SeccionAsistenciaCliente";
import SeccionActividadesCliente from "./SeccionActividadesCliente";
import type { TabReporte } from "./actions";

interface PageProps {
  searchParams: { tab?: string };
}

const LABEL_ESTADO: Record<string, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  EGRESADO: "Egresado",
};

const LABEL_CATEGORIA: Record<string, string> = {
  CAMPAMENTO: "Campamento",
  FORMACION: "Formación",
  MOBILIARIO: "Mobiliario",
  INDUMENTARIA: "Indumentaria",
  OTRO: "Otro",
};

const LABEL_CONSERVACION: Record<string, string> = {
  BUENO: "Bueno",
  REGULAR: "Regular",
  MALO: "Malo",
  FUERA_DE_USO: "Fuera de uso",
};

export default async function ReportesPage({ searchParams }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "REPORTES", "ver")) redirect("/dashboard");

  const tabs = await obtenerTabsReporte();
  if (tabs.length === 0) redirect("/dashboard");

  const tabActual: TabReporte =
    tabs.find((t) => t.id === searchParams.tab) ?? tabs[0]!;

  const anio = new Date().getFullYear();

  const [asistenciaRes, fdocRes, inventarioRes, actividadRes, miembrosRes] =
    await Promise.all([
      tabActual.id.startsWith("asistencia")
        ? obtenerAsistenciaMensual({
            seccion_id: tabActual.seccion_id,
            agrupacion_tipo: tabActual.agrupacion_tipo,
          })
        : Promise.resolve(null),
      tabActual.id.startsWith("fdoc")
        ? obtenerProgresoFDoc({
            seccion_id: tabActual.seccion_id,
            agrupacion_tipo: tabActual.agrupacion_tipo,
          })
        : Promise.resolve(null),
      tabActual.id === "inventario"
        ? obtenerResumenInventario()
        : Promise.resolve(null),
      tabActual.id === "actividades"
        ? obtenerActividadGeneral()
        : Promise.resolve(null),
      tabActual.id === "miembros" && tabActual.seccion_id
        ? obtenerMiembrosConAsistencia(tabActual.seccion_id)
        : Promise.resolve(null),
    ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white">Reportes</h1>
        <p className="mt-1 text-sm text-gray-500">Año {anio}</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-ruca-gray-light bg-ruca-gray p-1">
        {tabs.map((t) => (
          <Link
            key={t.id}
            href={`/reportes?tab=${t.id}`}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tabActual.id === t.id
                ? "bg-ruca-yellow text-ruca-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Contenido */}
      <div className="space-y-6">
        {/* ── Asistencia (con filtros cliente) ──────────────────────────────── */}
        {tabActual.id.startsWith("asistencia") && (
          <>
            {asistenciaRes && !asistenciaRes.ok ? (
              <ErrorBox mensaje={asistenciaRes.error} />
            ) : asistenciaRes?.ok ? (
              <SeccionAsistenciaCliente
                tabActual={tabActual}
                datosIniciales={asistenciaRes.data}
                tituloInicial={`Asistencia mensual ${anio}`}
                periodoInicial={String(anio)}
              />
            ) : null}
          </>
        )}

        {/* ── FDoc ────────────────────────────────────────────────────────── */}
        {tabActual.id.startsWith("fdoc") && (
          <>
            {fdocRes && !fdocRes.ok ? (
              <ErrorBox mensaje={fdocRes.error} />
            ) : fdocRes?.ok ? (
              <TablaReporte
                titulo={`Progreso FDoc ${anio}`}
                nombreArchivo={`fdoc-${anio}`}
                columnas={[
                  { key: "seccion_nombre", label: "Sección" },
                  { key: "total_items", label: "Total ítems" },
                  { key: "completados", label: "Completados" },
                  { key: "porcentaje", label: "% avance" },
                  { key: "sesiones", label: "Sesiones registradas" },
                ]}
                datos={fdocRes.data.map((d) => ({
                  seccion_nombre: d.seccion_nombre,
                  total_items: d.total_items,
                  completados: d.completados,
                  porcentaje: `${d.porcentaje}%`,
                  sesiones: d.sesiones,
                }))}
              />
            ) : null}
          </>
        )}

        {/* ── Inventario ──────────────────────────────────────────────────── */}
        {tabActual.id === "inventario" && (
          <>
            {inventarioRes && !inventarioRes.ok ? (
              <ErrorBox mensaje={inventarioRes.error} />
            ) : inventarioRes?.ok ? (
              <TablaReporte
                titulo="Estado del inventario"
                nombreArchivo={`inventario-${anio}`}
                columnas={[
                  { key: "nombre", label: "Nombre" },
                  { key: "categoria", label: "Categoría" },
                  { key: "cantidad_disponible", label: "Disponible" },
                  { key: "cantidad_total", label: "Total" },
                  { key: "estado_conservacion", label: "Conservación" },
                  { key: "stock_bajo", label: "Alerta stock" },
                ]}
                datos={inventarioRes.data.map((d) => ({
                  nombre: d.nombre,
                  categoria: LABEL_CATEGORIA[d.categoria] ?? d.categoria,
                  cantidad_disponible: d.cantidad_disponible,
                  cantidad_total: d.cantidad_total,
                  estado_conservacion:
                    LABEL_CONSERVACION[d.estado_conservacion] ?? d.estado_conservacion,
                  stock_bajo: d.stock_bajo ? "Sí" : "No",
                }))}
              />
            ) : null}
          </>
        )}

        {/* ── Actividades (con filtros cliente) ───────────────────────────── */}
        {tabActual.id === "actividades" && (
          <>
            {actividadRes && !actividadRes.ok ? (
              <ErrorBox mensaje={actividadRes.error} />
            ) : actividadRes?.ok ? (
              <SeccionActividadesCliente
                datosIniciales={actividadRes.data}
                anioInicial={anio}
              />
            ) : null}
          </>
        )}

        {/* ── Miembros ────────────────────────────────────────────────────── */}
        {tabActual.id === "miembros" && (
          <>
            {miembrosRes && !miembrosRes.ok ? (
              <ErrorBox mensaje={miembrosRes.error} />
            ) : miembrosRes?.ok ? (
              <TablaReporte
                titulo="Miembros y asistencia"
                nombreArchivo={`miembros-${anio}`}
                columnas={[
                  { key: "apellido", label: "Apellido" },
                  { key: "nombre", label: "Nombre" },
                  { key: "seccion", label: "Sección" },
                  { key: "estado", label: "Estado" },
                  { key: "anio_ingreso", label: "Ingreso" },
                  { key: "asistencia_pct", label: "% Asistencia" },
                ]}
                datos={miembrosRes.data.map((d) => ({
                  apellido: d.apellido,
                  nombre: d.nombre,
                  seccion: d.seccion,
                  estado: LABEL_ESTADO[d.estado] ?? d.estado,
                  anio_ingreso: d.anio_ingreso,
                  asistencia_pct:
                    d.asistencia_pct !== null ? `${d.asistencia_pct}%` : "—",
                }))}
              />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function ErrorBox({ mensaje }: { mensaje: string }) {
  return (
    <div className="rounded-xl bg-red-900/20 p-4 text-sm text-red-400">
      {mensaje}
    </div>
  );
}
