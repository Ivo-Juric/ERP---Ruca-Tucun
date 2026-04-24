export const revalidate = 60;

import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  BarChart2,
  BookOpen,
  ClipboardList,
  AlertTriangle,
  Package,
  TrendingUp,
} from "lucide-react";
import { getUsuarioActual } from "@/lib/auth";
import { obtenerDashboardData } from "./actions";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

function formatFecha(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// ─── Widget base ─────────────────────────────────────────────────────────────

function Widget({
  icono,
  titulo,
  children,
  href,
  vacio,
}: {
  icono: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
  href?: string;
  vacio?: boolean;
}) {
  const inner = (
    <div
      className={`flex min-h-36 flex-col rounded-2xl border border-ruca-yellow-light/20 bg-ruca-gray p-5 transition-colors ${
        href ? "hover:border-ruca-yellow/40" : ""
      } ${vacio ? "opacity-60" : ""}`}
    >
      <div className="mb-3 flex items-center gap-2 text-ruca-yellow">{icono}</div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
        {titulo}
      </p>
      {children}
    </div>
  );

  if (href)
    return (
      <Link href={href} className="block">
        {inner}
      </Link>
    );
  return inner;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");

  const data = await obtenerDashboardData();

  const hoy = new Date();
  const mesActual = MESES[hoy.getMonth()] ?? "";

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bienvenido,{" "}
          <span className="text-ruca-yellow">
            {usuario.nombre} {usuario.apellido}
          </span>{" "}
          — {hoy.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* Grid principal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Widget: Próxima actividad */}
        <Widget
          icono={<Calendar size={20} />}
          titulo="Próxima actividad"
          href="/calendario"
        >
          {data?.proximaActividad ? (
            <div>
              <p className="text-lg font-bold text-white">
                {data.proximaActividad.titulo}
              </p>
              <p className="mt-0.5 text-sm text-gray-400">
                {data.proximaActividad.tipo}
              </p>
              <p className="mt-2 text-xs text-gray-500">
                {formatFecha(data.proximaActividad.fecha)}
              </p>
              <p className="mt-1 text-2xl font-bold text-ruca-yellow">
                {data.proximaActividad.dias_restantes === 0
                  ? "¡Hoy!"
                  : data.proximaActividad.dias_restantes === 1
                    ? "Mañana"
                    : `${data.proximaActividad.dias_restantes} días`}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">
              Sin actividades próximas.
            </p>
          )}
        </Widget>

        {/* Widget: Asistencia del mes */}
        <Widget
          icono={<BarChart2 size={20} />}
          titulo={`Asistencia — ${mesActual}`}
          href="/reportes?tab=asistencia-global"
        >
          {data?.asistencia ? (
            <div>
              <p className="text-4xl font-bold text-ruca-yellow">
                {data.asistencia.porcentaje}%
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {data.asistencia.presentes} presentes de {data.asistencia.total}
              </p>
              <p className="mt-0.5 text-xs text-gray-600">
                {data.asistencia.etiqueta}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">
              Sin actividades realizadas este mes.
            </p>
          )}
        </Widget>

        {/* Widget: FDoc */}
        <Widget
          icono={<BookOpen size={20} />}
          titulo="Plan FDoc"
          href="/formacion"
        >
          {data?.fdoc ? (
            <div>
              {/* Barra de progreso */}
              <div className="mb-2 flex items-end gap-2">
                <p className="text-4xl font-bold text-ruca-yellow">
                  {data.fdoc.porcentaje}%
                </p>
                <p className="mb-1 text-xs text-gray-500">completado</p>
              </div>
              <div className="h-2 w-full rounded-full bg-ruca-gray-light">
                <div
                  className="h-2 rounded-full bg-ruca-yellow"
                  style={{ width: `${data.fdoc.porcentaje}%` }}
                />
              </div>
              <p className="mt-1.5 text-xs text-gray-500">
                {data.fdoc.completados}/{data.fdoc.total} ítems — {data.fdoc.seccion}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-600 italic">Sin plan FDoc cargado.</p>
          )}
        </Widget>

        {/* Widget: Solicitudes pendientes (solo intendencia / JEFE_RUCA) */}
        {data?.solicitudesPendientes !== null && data?.solicitudesPendientes !== undefined && (
          <Widget
            icono={<ClipboardList size={20} />}
            titulo="Solicitudes pendientes"
            href="/intendencia?tab=solicitudes"
          >
            <p className="text-4xl font-bold text-ruca-yellow">
              {data.solicitudesPendientes.cantidad}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              {data.solicitudesPendientes.cantidad === 1
                ? "solicitud pendiente de aprobar"
                : "solicitudes pendientes de aprobar"}
            </p>
          </Widget>
        )}

        {/* Widget: Plan semanal (solo jefes de sección) */}
        {data?.esJefeSeccion && (
          <Widget
            icono={<TrendingUp size={20} />}
            titulo="Plan semanal"
            href="/formacion"
          >
            <p className="text-sm font-semibold text-white">
              Plan de la sección
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Revisá el estado del sábado próximo en Formación Doctrinal.
            </p>
            <span className="mt-3 inline-block rounded-full bg-ruca-yellow/10 px-2.5 py-0.5 text-xs font-medium text-ruca-yellow">
              Ir a FDoc →
            </span>
          </Widget>
        )}

        {/* Widget: Inventario (acceso rápido) */}
        <Widget
          icono={<Package size={20} />}
          titulo="Inventario"
          href="/intendencia"
        >
          <p className="text-sm text-gray-400">
            Revisá el estado del inventario, solicitudes y préstamos activos.
          </p>
          <span className="mt-3 inline-block rounded-full bg-ruca-yellow/10 px-2.5 py-0.5 text-xs font-medium text-ruca-yellow">
            Ir a Intendencia →
          </span>
        </Widget>
      </div>

      {/* Alertas del sistema */}
      {data?.alertas && data.alertas.length > 0 && (
        <div className="rounded-2xl border border-yellow-700/40 bg-yellow-950/20 p-5">
          <div className="mb-3 flex items-center gap-2 text-yellow-400">
            <AlertTriangle size={18} />
            <h2 className="font-semibold">
              Alertas del sistema ({data.alertas.length})
            </h2>
          </div>
          <ul className="space-y-2">
            {data.alertas.map((alerta, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 text-yellow-500">•</span>
                <span className="text-yellow-200">{alerta.mensaje}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
