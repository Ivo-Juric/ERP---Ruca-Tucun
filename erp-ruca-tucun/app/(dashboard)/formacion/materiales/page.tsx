export const revalidate = 60;

import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { obtenerMateriales, obtenerSecciones } from "../actions";
import SubirMaterial from "@/components/modulos/formacion/SubirMaterial";
import type { Rol } from "@prisma/client";

const ROLES_GLOBALES: Rol[] = ["JEFE_RUCA", "JEFE_FDOC", "SECRETARIO"];
const ROLES_SUBIR: Rol[] = ["JEFE_RUCA", "JEFE_FDOC", "SUBJEFE_FDOC"];

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

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

interface PageProps {
  searchParams: { seccion?: string };
}

export default async function MaterialesPage({ searchParams }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "FORMACION", "ver")) redirect("/dashboard");

  const esGlobal = ROLES_GLOBALES.includes(usuario.rol);
  const puedeSubir = ROLES_SUBIR.includes(usuario.rol);

  const seccionFiltro = esGlobal
    ? (searchParams.seccion || undefined)
    : (usuario.seccion_id ?? undefined);

  const [materialesRes, seccionesRes] = await Promise.all([
    obtenerMateriales(seccionFiltro),
    esGlobal ? obtenerSecciones() : Promise.resolve(null),
  ]);

  const materiales = materialesRes.ok ? materialesRes.data : [];
  const secciones = seccionesRes?.ok ? seccionesRes.data : [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Link
          href="/formacion?tab=materiales"
          className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-3 py-1.5 text-sm text-gray-400 hover:bg-ruca-gray hover:text-white"
        >
          <ChevronLeft size={16} />
          Volver
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">
            Repositorio de Materiales
          </h1>
          <p className="text-sm text-gray-500">
            {materiales.length} material{materiales.length !== 1 ? "es" : ""}{" "}
            disponible{materiales.length !== 1 ? "s" : ""}
          </p>
        </div>
        {puedeSubir && <SubirMaterial secciones={secciones} />}
      </div>

      {/* Filtro por sección */}
      {esGlobal && secciones.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/formacion/materiales"
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              !searchParams.seccion
                ? "bg-ruca-yellow text-ruca-black"
                : "border border-ruca-gray-light text-gray-400 hover:text-white"
            }`}
          >
            Todos
          </Link>
          {secciones.map((s) => (
            <Link
              key={s.id}
              href={`/formacion/materiales?seccion=${s.id}`}
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
      )}

      {!materialesRes.ok && (
        <div className="rounded-xl bg-red-900/20 p-4 text-sm text-red-400">
          {materialesRes.error}
        </div>
      )}

      {/* Grid de materiales */}
      {materiales.length === 0 ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-14 text-center">
          <p className="text-sm text-gray-500">No hay materiales disponibles.</p>
          {puedeSubir && (
            <p className="mt-2 text-xs text-ruca-yellow">
              Usá el botón &ldquo;Subir material&rdquo; para agregar uno.
            </p>
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
              className="group flex flex-col gap-4 rounded-xl border border-ruca-gray-light bg-ruca-gray p-5 transition-colors hover:border-ruca-yellow/40 hover:bg-ruca-gray-light"
            >
              {/* Tipo + nombre */}
              <div className="flex items-start gap-3">
                <span
                  className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${tipoArchivoColor(m.tipo_archivo)}`}
                >
                  {tipoArchivoLabel(m.tipo_archivo)}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-white group-hover:text-ruca-yellow-light transition-colors">
                    {m.nombre}
                  </h3>
                  {m.descripcion && (
                    <p className="mt-1 line-clamp-2 text-xs text-gray-500">
                      {m.descripcion}
                    </p>
                  )}
                </div>
              </div>

              {/* Metadatos */}
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span>{m.seccion?.nombre ?? "Todas las secciones"}</span>
                <span>{formatFecha(m.creado_en)}</span>
              </div>
              <div className="text-xs text-gray-600">
                Subido por {m.subido_por.nombre} {m.subido_por.apellido}
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
