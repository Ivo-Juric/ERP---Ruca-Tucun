export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus, UserCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { EstadoMiembro, Rol } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import FiltrosMiembros from "@/components/modulos/miembros/FiltrosMiembros";

const POR_PAGINA = 20;

const BADGE_ESTADO: Record<EstadoMiembro, string> = {
  ACTIVO: "bg-green-900/50 text-green-400 border-green-700/40",
  INACTIVO: "bg-zinc-800 text-zinc-400 border-zinc-700",
  EGRESADO: "bg-yellow-900/40 text-ruca-yellow border-yellow-700/40",
};
const LABEL_ESTADO: Record<EstadoMiembro, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  EGRESADO: "Egresado",
};

const ROLES_VER_TODAS: Rol[] = ["JEFE_RUCA", "SECRETARIO"];
const ROLES_POR_AGRUPACION: Rol[] = [
  "JEFE_AGRUP_MASCULINA",
  "JEFE_AGRUP_FEMENINA",
  "JEFE_MILICIANOS",
];

interface PageProps {
  searchParams: { q?: string; seccion?: string; estado?: string; pagina?: string };
}

export default async function MiembrosPage({ searchParams }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "MIEMBROS", "ver")) redirect("/dashboard");

  const pagina = Math.max(1, parseInt(searchParams.pagina ?? "1", 10));
  const q = searchParams.q?.trim() ?? "";
  const estadoFiltro = searchParams.estado as EstadoMiembro | undefined;

  // ── Construir filtro base por rol ───────────────────────────────────────
  let whereBase: Prisma.MiembroWhereInput = {};

  if (!ROLES_VER_TODAS.includes(usuario.rol)) {
    if (ROLES_POR_AGRUPACION.includes(usuario.rol)) {
      const agrupacion_id = usuario.seccion?.agrupacion?.id;
      if (!agrupacion_id) redirect("/dashboard");
      whereBase = { seccion: { agrupacion_id } };
    } else {
      if (!usuario.seccion_id) redirect("/dashboard");
      whereBase = { seccion_id: usuario.seccion_id };
    }
  }

  // ── Filtros URL adicionales ──────────────────────────────────────────────
  const where: Prisma.MiembroWhereInput = {
    ...whereBase,
    ...(q && {
      OR: [
        { nombre: { contains: q, mode: "insensitive" } },
        { apellido: { contains: q, mode: "insensitive" } },
      ],
    }),
    ...(estadoFiltro && { estado: estadoFiltro }),
    ...(searchParams.seccion && { seccion_id: searchParams.seccion }),
  };

  // ── Consultas en paralelo ────────────────────────────────────────────────
  const [miembros, total, secciones] = await Promise.all([
    prisma.miembro.findMany({
      where,
      skip: (pagina - 1) * POR_PAGINA,
      take: POR_PAGINA,
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
      select: {
        id: true,
        nombre: true,
        apellido: true,
        foto_url: true,
        estado: true,
        anio_ingreso: true,
        seccion: { select: { id: true, nombre: true } },
        _count: { select: { asistencias: true } },
      },
    }),
    prisma.miembro.count({ where }),
    ROLES_VER_TODAS.includes(usuario.rol) || ROLES_POR_AGRUPACION.includes(usuario.rol)
      ? prisma.seccion.findMany({
          where:
            ROLES_POR_AGRUPACION.includes(usuario.rol)
              ? { agrupacion_id: usuario.seccion?.agrupacion?.id }
              : undefined,
          select: { id: true, nombre: true },
          orderBy: { nombre: "asc" },
        })
      : Promise.resolve([]),
  ]);

  // ── Porcentaje de asistencia (2 queries sobre la página actual) ──────────
  const ids = miembros.map((m) => m.id);
  const [totalesAsist, presentesAsist] = await Promise.all([
    prisma.asistencia.groupBy({
      by: ["miembro_id"],
      where: { miembro_id: { in: ids } },
      _count: { _all: true },
    }),
    prisma.asistencia.groupBy({
      by: ["miembro_id"],
      where: { miembro_id: { in: ids }, presente: true },
      _count: { _all: true },
    }),
  ]);

  const mapTotal = new Map(totalesAsist.map((r) => [r.miembro_id, r._count._all]));
  const mapPresente = new Map(presentesAsist.map((r) => [r.miembro_id, r._count._all]));

  function porcentajeAsistencia(id: string): string {
    const tot = mapTotal.get(id) ?? 0;
    if (tot === 0) return "—";
    const pres = mapPresente.get(id) ?? 0;
    return `${Math.round((pres / tot) * 100)}%`;
  }

  const totalPaginas = Math.ceil(total / POR_PAGINA);
  const puedCrear = checkPermiso(usuario.rol, "MIEMBROS", "crear");
  const puedeVerTodasSecciones =
    ROLES_VER_TODAS.includes(usuario.rol) || ROLES_POR_AGRUPACION.includes(usuario.rol);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Miembros</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {total} {total === 1 ? "miembro" : "miembros"} encontrados
          </p>
        </div>
        {puedCrear && (
          <Link
            href="/miembros/nuevo"
            className="flex items-center gap-2 rounded-lg bg-ruca-yellow px-4 py-2 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors"
          >
            <Plus size={16} />
            Nuevo miembro
          </Link>
        )}
      </div>

      {/* Filtros */}
      <FiltrosMiembros
        secciones={secciones}
        puedeVerTodasSecciones={puedeVerTodasSecciones}
      />

      {/* Tabla */}
      <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
              <th className="px-4 py-3 font-semibold text-zinc-300">Miembro</th>
              <th className="px-4 py-3 font-semibold text-zinc-300">Sección</th>
              <th className="px-4 py-3 font-semibold text-zinc-300">Estado</th>
              <th className="px-4 py-3 font-semibold text-zinc-300 text-right">
                Asistencia
              </th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {miembros.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-zinc-500">
                  No se encontraron miembros.
                </td>
              </tr>
            )}
            {miembros.map((miembro, i) => (
              <tr
                key={miembro.id}
                className={[
                  "border-b border-ruca-gray-light/50 transition-colors hover:bg-ruca-gray/60",
                  i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30",
                ].join(" ")}
              >
                {/* Foto + nombre */}
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {miembro.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={miembro.foto_url}
                        alt=""
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <UserCircle2 size={32} className="shrink-0 text-zinc-600" />
                    )}
                    <span className="font-medium text-white">
                      {miembro.apellido}, {miembro.nombre}
                    </span>
                  </div>
                </td>

                {/* Sección */}
                <td className="px-4 py-3 text-zinc-400">{miembro.seccion.nombre}</td>

                {/* Badge estado */}
                <td className="px-4 py-3">
                  <span
                    className={[
                      "rounded-full border px-2.5 py-0.5 text-xs font-medium",
                      BADGE_ESTADO[miembro.estado],
                    ].join(" ")}
                  >
                    {LABEL_ESTADO[miembro.estado]}
                  </span>
                </td>

                {/* Asistencia */}
                <td className="px-4 py-3 text-right font-mono text-zinc-300">
                  {porcentajeAsistencia(miembro.id)}
                </td>

                {/* Acciones */}
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/miembros/${miembro.id}`}
                    className="rounded-md px-3 py-1 text-xs font-medium text-ruca-yellow hover:bg-ruca-gray transition-colors"
                  >
                    Ver ficha
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {totalPaginas > 1 && (
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>
            Página {pagina} de {totalPaginas}
          </span>
          <div className="flex gap-2">
            {pagina > 1 && (
              <Link
                href={`/miembros?${new URLSearchParams({ ...searchParams, pagina: String(pagina - 1) })}`}
                className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-3 py-1.5 hover:bg-ruca-gray transition-colors"
              >
                <ChevronLeft size={14} /> Anterior
              </Link>
            )}
            {pagina < totalPaginas && (
              <Link
                href={`/miembros?${new URLSearchParams({ ...searchParams, pagina: String(pagina + 1) })}`}
                className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-3 py-1.5 hover:bg-ruca-gray transition-colors"
              >
                Siguiente <ChevronRight size={14} />
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
