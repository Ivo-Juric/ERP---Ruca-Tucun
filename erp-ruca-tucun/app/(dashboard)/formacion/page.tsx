import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, BookOpen, Calendar, FolderOpen } from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import {
  obtenerProgresoPorSeccion,
  obtenerSesionesGlobal,
  obtenerMateriales,
  obtenerSecciones,
} from "./actions";
import SubirMaterial from "@/components/modulos/formacion/SubirMaterial";
import type { Rol } from "@prisma/client";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TABS = ["plan", "sesiones", "materiales"] as const;
type Tab = (typeof TABS)[number];

const TAB_LABEL: Record<Tab, string> = {
  plan: "Plan Anual",
  sesiones: "Sesiones",
  materiales: "Materiales",
};

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "JEFE_FDOC", "SECRETARIO"];
const ROLES_SUBIR: Rol[] = ["JEFE_RUCA", "JEFE_FDOC", "SUBJEFE_FDOC"];

function ProgresoCircular({ pct }: { pct: number }) {
  const r = 22;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <div className="relative h-14 w-14 flex-none">
      <svg width={56} height={56} className="-rotate-90">
        <circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke="#3A3A3A"
          strokeWidth={5}
        />
        <circle
          cx={28}
          cy={28}
          r={r}
          fill="none"
          stroke="#D4B000"
          strokeWidth={5}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white">
        {pct}%
      </span>
    </div>
  );
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function tipoArchivoLabel(tipo: string): string {
  if (tipo.includes("pdf")) return "PDF";
  if (tipo.includes("word") || tipo.includes("doc")) return "DOC";
  if (tipo.includes("presentation") || tipo.includes("ppt")) return "PPT";
  if (tipo.includes("sheet") || tipo.includes("xls") || tipo.includes("csv"))
    return "XLS";
  if (tipo.includes("image")) return "IMG";
  return "ARCH";
}

function tipoArchivoColor(tipo: string): string {
  if (tipo.includes("pdf")) return "bg-red-900/50 text-red-300";
  if (tipo.includes("word") || tipo.includes("doc"))
    return "bg-blue-900/50 text-blue-300";
  if (tipo.includes("presentation") || tipo.includes("ppt"))
    return "bg-orange-900/50 text-orange-300";
  if (tipo.includes("sheet") || tipo.includes("xls") || tipo.includes("csv"))
    return "bg-green-900/50 text-green-300";
  return "bg-zinc-800 text-zinc-400";
}

// ─── Page ─────────────────────────────────────────────────────────────────────

interface PageProps {
  searchParams: { tab?: string; seccion?: string };
}

export default async function FormacionPage({ searchParams }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "FORMACION", "ver")) redirect("/dashboard");

  const tabActual: Tab = TABS.includes(searchParams.tab as Tab)
    ? (searchParams.tab as Tab)
    : "plan";

  const esGlobal = ROLES_GLOBALES.includes(usuario.rol);
  const puedeSubir = ROLES_SUBIR.includes(usuario.rol);

  // Fetch secciones para el selector del tab de sesiones
  const seccionesRes =
    tabActual === "sesiones" && esGlobal ? await obtenerSecciones() : null;
  const secciones = seccionesRes?.ok ? seccionesRes.data : [];

  // ── Datos según tab activo ─────────────────────────────────────────────────

  const [progresoRes, sesionesRes, materialesRes] = await Promise.all([
    tabActual === "plan" ? obtenerProgresoPorSeccion() : Promise.resolve(null),
    tabActual === "sesiones"
      ? obtenerSesionesGlobal(
          esGlobal ? (searchParams.seccion || undefined) : undefined,
        )
      : Promise.resolve(null),
    tabActual === "materiales"
      ? obtenerMateriales(
          !esGlobal ? (usuario.seccion_id ?? undefined) : undefined,
        )
      : Promise.resolve(null),
  ]);

  const progreso = progresoRes?.ok ? progresoRes.data : [];
  const sesiones = sesionesRes?.ok ? sesionesRes.data : [];
  const materiales = materialesRes?.ok ? materialesRes.data : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Formación Doctrinal</h1>
        {tabActual === "materiales" && puedeSubir && (
          <SubirMaterial secciones={secciones} />
        )}
      </div>

      {/* Navegación de tabs */}
      <div className="flex gap-1 rounded-xl border border-ruca-gray-light bg-ruca-gray p-1">
        {TABS.map((tab) => (
          <Link
            key={tab}
            href={`/formacion?tab=${tab}`}
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tabActual === tab
                ? "bg-ruca-yellow text-ruca-black"
                : "text-gray-400 hover:text-white"
            }`}
          >
            {tab === "plan" && <BookOpen size={14} />}
            {tab === "sesiones" && <Calendar size={14} />}
            {tab === "materiales" && <FolderOpen size={14} />}
            {TAB_LABEL[tab]}
          </Link>
        ))}
      </div>

      {/* ── Tab: Plan Anual ──────────────────────────────────────────────────── */}
      {tabActual === "plan" && (
        <>
          {progreso.length === 0 ? (
            <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-14 text-center text-sm text-gray-500">
              No hay secciones con plan de formación cargado.
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {progreso.map((item) => (
                <Link
                  key={item.seccion_id}
                  href={`/formacion/plan/${item.seccion_id}`}
                  className="flex items-center gap-4 rounded-xl border border-ruca-gray-light bg-ruca-gray p-5 transition-colors hover:border-ruca-yellow/40 hover:bg-ruca-gray-light"
                >
                  <ProgresoCircular pct={item.porcentaje} />
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-white">
                      {item.seccion_nombre}
                    </h2>
                    <p className="mt-0.5 text-sm text-gray-500">
                      {item.total_items > 0
                        ? `${item.completados} / ${item.total_items} temas`
                        : "Sin ítems cargados"}
                    </p>
                    {item.total_items === 0 && (
                      <span className="text-xs text-ruca-yellow">
                        {item.plan_id ? "Plan vacío" : "Sin plan"}
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    size={16}
                    className="flex-none text-gray-600"
                  />
                </Link>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Tab: Sesiones ───────────────────────────────────────────────────── */}
      {tabActual === "sesiones" && (
        <div className="space-y-4">
          {/* Filtro de sección para roles globales */}
          {esGlobal && secciones.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">Sección:</span>
              <div className="flex flex-wrap gap-2">
                <Link
                  href="/formacion?tab=sesiones"
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    !searchParams.seccion
                      ? "bg-ruca-yellow text-ruca-black"
                      : "border border-ruca-gray-light text-gray-400 hover:text-white"
                  }`}
                >
                  Todas
                </Link>
                {secciones.map((s) => (
                  <Link
                    key={s.id}
                    href={`/formacion?tab=sesiones&seccion=${s.id}`}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                      searchParams.seccion === s.id
                        ? "bg-ruca-yellow text-ruca-black"
                        : "border border-ruca-gray-light text-gray-400 hover:text-white"
                    }`}
                  >
                    {s.nombre}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {sesiones.length === 0 ? (
            <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-14 text-center text-sm text-gray-500">
              No hay sesiones registradas.
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Fecha
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Tema
                    </th>
                    {esGlobal && (
                      <th className="px-4 py-3 font-semibold text-gray-300">
                        Sección
                      </th>
                    )}
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Asistencia
                    </th>
                    <th className="px-4 py-3 font-semibold text-gray-300">
                      Registrado por
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sesiones.map((s, i) => (
                    <tr
                      key={s.id}
                      className={`border-b border-ruca-gray-light/50 ${
                        i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30"
                      }`}
                    >
                      <td className="px-4 py-3 text-gray-300">
                        {formatFecha(s.fecha)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-white">{s.tema}</span>
                          {s.es_extra && (
                            <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                              Extra
                            </span>
                          )}
                        </div>
                        {s.plan_item && (
                          <p className="mt-0.5 text-xs text-gray-500">
                            Plan: {s.plan_item.tema}
                          </p>
                        )}
                      </td>
                      {esGlobal && (
                        <td className="px-4 py-3 text-gray-400">
                          {s.seccion.nombre}
                        </td>
                      )}
                      <td className="px-4 py-3 font-mono text-gray-300">
                        {s.total_asistencias > 0
                          ? `${s.presentes}/${s.total_asistencias}`
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {s.registrado_por.nombre} {s.registrado_por.apellido}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Materiales ─────────────────────────────────────────────────── */}
      {tabActual === "materiales" && (
        <>
          {materiales.length === 0 ? (
            <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-14 text-center text-sm text-gray-500">
              No hay materiales subidos.
              {puedeSubir && (
                <span className="block mt-2 text-ruca-yellow">
                  Usá el botón &ldquo;Subir material&rdquo; para agregar uno.
                </span>
              )}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {materiales.map((m) => (
                <a
                  key={m.id}
                  href={m.url_archivo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex flex-col gap-3 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4 transition-colors hover:border-ruca-yellow/40 hover:bg-ruca-gray-light"
                >
                  <div className="flex items-start gap-3">
                    <span
                      className={`rounded-lg px-2 py-1 text-xs font-bold ${tipoArchivoColor(m.tipo_archivo)}`}
                    >
                      {tipoArchivoLabel(m.tipo_archivo)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-medium text-white">
                        {m.nombre}
                      </h3>
                      {m.descripcion && (
                        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                          {m.descripcion}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <span>{m.seccion?.nombre ?? "Todas las secciones"}</span>
                    <span>{formatFecha(m.creado_en)}</span>
                  </div>
                </a>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
