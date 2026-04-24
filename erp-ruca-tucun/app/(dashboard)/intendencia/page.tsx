export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import {
  AlertTriangle,
  Package,
  ClipboardList,
  ArrowLeftRight,
  BarChart2,
} from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import {
  obtenerInventario,
  obtenerSolicitudes,
  obtenerPrestamosActivos,
} from "./actions";
import FormularioItem from "@/components/modulos/intendencia/FormularioItem";
import FormularioSolicitud from "@/components/modulos/intendencia/FormularioSolicitud";
import AccionesSolicitud from "@/components/modulos/intendencia/AccionesSolicitud";
import DisponibilidadSemanal from "@/components/modulos/intendencia/DisponibilidadSemanal";
import type {
  CategoriaInventario,
  EstadoConservacion,
  EstadoSolicitud,
  Rol,
} from "@prisma/client";

// ─── Constantes ───────────────────────────────────────────────────────────────

const TABS = ["disponibilidad", "inventario", "solicitudes", "prestamos"] as const;
type Tab = (typeof TABS)[number];

const ROLES_VER_INVENTARIO: Rol[] = [
  "JEFE_RUCA",
  "JEFE_INTENDENCIA",
  "SUBJEFE_INTENDENCIA",
  "SECRETARIO",
];
const ROLES_CREAR_ITEM: Rol[] = ["JEFE_RUCA", "JEFE_INTENDENCIA"];
const ROLES_VER_PRESTAMOS: Rol[] = [
  "JEFE_RUCA",
  "JEFE_INTENDENCIA",
  "SUBJEFE_INTENDENCIA",
];
const ROLES_SOLICITAR: Rol[] = [
  "JEFE_RUCA",
  "JEFE_SECCION",
  "SUBJEFE_SECCION",
  "JEFE_MILICIANOS",
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
];

// ─── Badges ───────────────────────────────────────────────────────────────────

const BADGE_CATEGORIA: Record<CategoriaInventario, string> = {
  CAMPAMENTO: "bg-orange-900/40 text-orange-300",
  FORMACION: "bg-blue-900/40 text-blue-300",
  MOBILIARIO: "bg-purple-900/40 text-purple-300",
  INDUMENTARIA: "bg-pink-900/40 text-pink-300",
  OTRO: "bg-zinc-800 text-zinc-400",
};
const LABEL_CATEGORIA: Record<CategoriaInventario, string> = {
  CAMPAMENTO: "Campamento",
  FORMACION: "Formación",
  MOBILIARIO: "Mobiliario",
  INDUMENTARIA: "Indumentaria",
  OTRO: "Otro",
};

const BADGE_CONSERVACION: Record<EstadoConservacion, string> = {
  BUENO: "bg-green-900/40 text-green-300",
  REGULAR: "bg-yellow-900/40 text-yellow-300",
  MALO: "bg-red-900/40 text-red-300",
  FUERA_DE_USO: "bg-zinc-800 text-zinc-500 line-through",
};
const LABEL_CONSERVACION: Record<EstadoConservacion, string> = {
  BUENO: "Bueno",
  REGULAR: "Regular",
  MALO: "Malo",
  FUERA_DE_USO: "Fuera de uso",
};

const BADGE_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE_JEFE: "bg-yellow-900/40 text-yellow-300 border border-yellow-700/40",
  PENDIENTE_INTENDENCIA: "bg-blue-900/40 text-blue-300 border border-blue-700/40",
  APROBADA: "bg-green-900/40 text-green-300 border border-green-700/40",
  APROBADA_PARCIAL:
    "bg-teal-900/40 text-teal-300 border border-teal-700/40",
  RECHAZADA: "bg-red-900/40 text-red-300 border border-red-700/40",
};
const LABEL_ESTADO: Record<EstadoSolicitud, string> = {
  PENDIENTE_JEFE: "Pendiente Jefe",
  PENDIENTE_INTENDENCIA: "Pendiente Intendencia",
  APROBADA: "Aprobada",
  APROBADA_PARCIAL: "Aprobada parcial",
  RECHAZADA: "Rechazada",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: {
    tab?: string;
    categoria?: string;
    conservacion?: string;
  };
}

export default async function IntendenciaPage({ searchParams }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "INTENDENCIA", "ver")) redirect("/dashboard");

  const puedeVerInventario = ROLES_VER_INVENTARIO.includes(usuario.rol);
  const puedeCrearItem = ROLES_CREAR_ITEM.includes(usuario.rol);
  const puedeVerPrestamos = ROLES_VER_PRESTAMOS.includes(usuario.rol);
  const puedeSolicitar = ROLES_SOLICITAR.includes(usuario.rol);

  // Tab por defecto según rol
  const defaultTab: Tab = puedeVerInventario ? "disponibilidad" : "solicitudes";
  const tabActual: Tab = TABS.includes(searchParams.tab as Tab)
    ? (searchParams.tab as Tab)
    : defaultTab;

  // Tabs visibles
  const tabsVisibles: { id: Tab; label: string; icon: React.ReactNode }[] = [
    ...(puedeVerInventario
      ? [
          {
            id: "disponibilidad" as Tab,
            label: "Disponibilidad",
            icon: <BarChart2 size={14} />,
          },
          {
            id: "inventario" as Tab,
            label: "Inventario",
            icon: <Package size={14} />,
          },
        ]
      : []),
    {
      id: "solicitudes" as Tab,
      label: "Solicitudes",
      icon: <ClipboardList size={14} />,
    },
    ...(puedeVerPrestamos
      ? [
          {
            id: "prestamos" as Tab,
            label: "Préstamos activos",
            icon: <ArrowLeftRight size={14} />,
          },
        ]
      : []),
  ];

  // ── Fetch data según tab ───────────────────────────────────────────────────

  const categoriaFiltro = searchParams.categoria as CategoriaInventario | undefined;
  const conservacionFiltro = searchParams.conservacion as EstadoConservacion | undefined;

  const [inventarioRes, solicitudesRes, prestamosRes] = await Promise.all([
    tabActual === "inventario" && puedeVerInventario
      ? obtenerInventario({
          categoria: categoriaFiltro,
          estado_conservacion: conservacionFiltro,
        })
      : Promise.resolve(null),
    tabActual === "solicitudes"
      ? obtenerSolicitudes()
      : Promise.resolve(null),
    tabActual === "prestamos" && puedeVerPrestamos
      ? obtenerPrestamosActivos()
      : Promise.resolve(null),
  ]);

  const inventario = inventarioRes?.ok ? inventarioRes.data : [];
  const solicitudes = solicitudesRes?.ok ? solicitudesRes.data : [];
  const prestamos = prestamosRes?.ok ? prestamosRes.data : [];

  const CATEGORIAS = Object.keys(LABEL_CATEGORIA) as CategoriaInventario[];
  const CONSERVACIONES = Object.keys(
    LABEL_CONSERVACION,
  ) as EstadoConservacion[];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Intendencia</h1>
        <div className="flex gap-2">
          {tabActual === "inventario" && puedeCrearItem && (
            <FormularioItem mode="crear" />
          )}
          {tabActual === "solicitudes" && puedeSolicitar && (
            <FormularioSolicitud />
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-ruca-gray-light bg-ruca-gray p-1">
        {tabsVisibles.map((t) => (
          <Link
            key={t.id}
            href={`/intendencia?tab=${t.id}`}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tabActual === t.id
                ? "bg-ruca-yellow text-ruca-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {t.icon}
            {t.label}
          </Link>
        ))}
      </div>

      {/* ── Tab: Disponibilidad ──────────────────────────────────────────── */}
      {tabActual === "disponibilidad" && puedeVerInventario && (
        <DisponibilidadSemanal />
      )}

      {/* ── Tab: Inventario ─────────────────────────────────────────────────── */}
      {tabActual === "inventario" && puedeVerInventario && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-4">
            {/* Categoría */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500">Categoría:</span>
              <Link
                href={`/intendencia?tab=inventario${conservacionFiltro ? `&conservacion=${conservacionFiltro}` : ""}`}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  !categoriaFiltro
                    ? "bg-ruca-yellow text-ruca-black"
                    : "border border-ruca-gray-light text-gray-500 hover:text-white"
                }`}
              >
                Todas
              </Link>
              {CATEGORIAS.map((cat) => (
                <Link
                  key={cat}
                  href={`/intendencia?tab=inventario&categoria=${cat}${conservacionFiltro ? `&conservacion=${conservacionFiltro}` : ""}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    categoriaFiltro === cat
                      ? "bg-ruca-yellow text-ruca-black"
                      : "border border-ruca-gray-light text-gray-500 hover:text-white"
                  }`}
                >
                  {LABEL_CATEGORIA[cat]}
                </Link>
              ))}
            </div>

            {/* Conservación */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-gray-500">Estado:</span>
              <Link
                href={`/intendencia?tab=inventario${categoriaFiltro ? `&categoria=${categoriaFiltro}` : ""}`}
                className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  !conservacionFiltro
                    ? "bg-ruca-yellow text-ruca-black"
                    : "border border-ruca-gray-light text-gray-500 hover:text-white"
                }`}
              >
                Todos
              </Link>
              {CONSERVACIONES.map((e) => (
                <Link
                  key={e}
                  href={`/intendencia?tab=inventario${categoriaFiltro ? `&categoria=${categoriaFiltro}` : ""}&conservacion=${e}`}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                    conservacionFiltro === e
                      ? "bg-ruca-yellow text-ruca-black"
                      : "border border-ruca-gray-light text-gray-500 hover:text-white"
                  }`}
                >
                  {LABEL_CONSERVACION[e]}
                </Link>
              ))}
            </div>
          </div>

          {/* Tabla inventario */}
          {inventario.length === 0 ? (
            <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-12 text-center text-sm text-gray-500">
              No hay ítems en el inventario.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Nombre
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Categoría
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Disponible / Total
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Conservación
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Ubicación
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {inventario.map((item, i) => (
                    <tr
                      key={item.id}
                      className={`border-b border-ruca-gray-light/50 ${
                        i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">
                            {item.nombre}
                          </span>
                          {item.stock_bajo && (
                            <span
                              className="flex items-center gap-1 rounded-full bg-red-900/40 px-1.5 py-0.5 text-xs text-red-300"
                              title="Stock bajo"
                            >
                              <AlertTriangle size={10} />
                              Stock bajo
                            </span>
                          )}
                        </div>
                        {item.descripcion && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            {item.descripcion}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CATEGORIA[item.categoria]}`}
                        >
                          {LABEL_CATEGORIA[item.categoria]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-sm font-semibold ${
                              item.stock_bajo
                                ? "text-red-400"
                                : "text-green-400"
                            }`}
                          >
                            {item.cantidad_disponible}
                          </span>
                          <span className="text-gray-600">/</span>
                          <span className="font-mono text-sm text-gray-400">
                            {item.cantidad_total}
                          </span>
                        </div>
                        {/* Mini barra de progreso */}
                        <div className="mt-1 h-1.5 w-24 rounded-full bg-ruca-gray-light">
                          <div
                            className={`h-1.5 rounded-full ${
                              item.stock_bajo ? "bg-red-500" : "bg-green-500"
                            }`}
                            style={{
                              width: `${item.cantidad_total > 0 ? Math.round((item.cantidad_disponible / item.cantidad_total) * 100) : 0}%`,
                            }}
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_CONSERVACION[item.estado_conservacion]}`}
                        >
                          {LABEL_CONSERVACION[item.estado_conservacion]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">
                        {item.ubicacion ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {puedeCrearItem && (
                          <FormularioItem mode="editar" item={item} />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Solicitudes ──────────────────────────────────────────────── */}
      {tabActual === "solicitudes" && (
        <div className="space-y-4">
          {solicitudesRes && !solicitudesRes.ok && (
            <div className="rounded-xl bg-red-900/20 p-4 text-sm text-red-400">
              {solicitudesRes.error}
            </div>
          )}

          {solicitudes.length === 0 ? (
            <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-12 text-center text-sm text-gray-500">
              No hay solicitudes para mostrar.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Ítem
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Cant.
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Actividad
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Solicitado por
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Fecha uso
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Estado
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {solicitudes.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`border-b border-ruca-gray-light/50 ${
                        i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30"
                      }`}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-white">
                          {s.item.nombre}
                        </span>
                        <div
                          className={`mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs ${BADGE_CATEGORIA[s.item.categoria]}`}
                        >
                          {LABEL_CATEGORIA[s.item.categoria]}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {s.cantidad_aprobada !== null ? (
                          <>
                            <span className="text-green-400">
                              {s.cantidad_aprobada}
                            </span>
                            <span className="text-gray-600">
                              /{s.cantidad}
                            </span>
                          </>
                        ) : (
                          s.cantidad
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {s.actividad.titulo}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">
                          {s.solicitado_por.nombre} {s.solicitado_por.apellido}
                        </span>
                        {s.solicitado_por.seccion && (
                          <p className="text-xs text-gray-500">
                            {s.solicitado_por.seccion.nombre}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatFecha(s.fecha_uso)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${BADGE_ESTADO[s.estado]}`}
                        >
                          {LABEL_ESTADO[s.estado]}
                        </span>
                        {s.comentario_respuesta && (
                          <p
                            className="mt-0.5 max-w-xs truncate text-xs text-gray-500"
                            title={s.comentario_respuesta}
                          >
                            {s.comentario_respuesta}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AccionesSolicitud
                          solicitud={s}
                          rol={usuario.rol}
                          seccionId={usuario.seccion_id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Préstamos activos ────────────────────────────────────────── */}
      {tabActual === "prestamos" && puedeVerPrestamos && (
        <div className="space-y-4">
          {prestamos.length === 0 ? (
            <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-12 text-center text-sm text-gray-500">
              No hay préstamos activos.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Ítem
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Cant.
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Solicitado por
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Fecha uso
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Devolución esperada
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Estado
                    </th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {prestamos.map((p, i) => (
                    <tr
                      key={p.id}
                      className={`border-b border-ruca-gray-light/50 ${
                        i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30"
                      } ${p.vencido ? "bg-red-950/20" : ""}`}
                    >
                      <td className="px-4 py-3 font-medium text-white">
                        {p.item.nombre}
                      </td>
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {p.cantidad_aprobada ?? p.cantidad}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-300">
                          {p.solicitado_por.nombre} {p.solicitado_por.apellido}
                        </span>
                        {p.solicitado_por.seccion && (
                          <p className="text-xs text-gray-500">
                            {p.solicitado_por.seccion.nombre}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-400">
                        {formatFecha(p.fecha_uso)}
                      </td>
                      <td className="px-4 py-3">
                        {p.fecha_devolucion_esperada ? (
                          <div>
                            <span
                              className={
                                p.vencido ? "text-red-400" : "text-gray-400"
                              }
                            >
                              {formatFecha(p.fecha_devolucion_esperada)}
                            </span>
                            {p.dias_restantes !== null && (
                              <p
                                className={`text-xs ${
                                  p.vencido
                                    ? "text-red-400"
                                    : p.dias_restantes <= 3
                                      ? "text-yellow-400"
                                      : "text-gray-500"
                                }`}
                              >
                                {p.vencido
                                  ? `Vencido hace ${Math.abs(p.dias_restantes)} día${Math.abs(p.dias_restantes) !== 1 ? "s" : ""}`
                                  : p.dias_restantes === 0
                                    ? "Vence hoy"
                                    : `${p.dias_restantes} día${p.dias_restantes !== 1 ? "s" : ""} restante${p.dias_restantes !== 1 ? "s" : ""}`}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-600">Sin fecha</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {p.vencido ? (
                          <span className="flex items-center gap-1 text-xs text-red-400">
                            <AlertTriangle size={12} />
                            Vencido
                          </span>
                        ) : (
                          <span className="text-xs text-green-400">
                            En curso
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <AccionesSolicitud
                          solicitud={p}
                          rol={usuario.rol}
                          seccionId={usuario.seccion_id}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
