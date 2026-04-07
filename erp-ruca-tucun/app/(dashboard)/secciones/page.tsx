import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, BookOpen, Building2 } from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { obtenerOrganigrama } from "./actions";
import type { AgrupacionConSecciones, DepartamentoBasico } from "./actions";

const TIPO_COLOR: Record<string, string> = {
  MASCULINA: "border-blue-700/40 bg-blue-950/20",
  FEMENINA: "border-pink-700/40 bg-pink-950/20",
  MILICIANOS: "border-orange-700/40 bg-orange-950/20",
};

const TIPO_BADGE: Record<string, string> = {
  MASCULINA: "bg-blue-900/40 text-blue-300",
  FEMENINA: "bg-pink-900/40 text-pink-300",
  MILICIANOS: "bg-orange-900/40 text-orange-300",
};

const TIPO_LABEL: Record<string, string> = {
  MASCULINA: "Agrupación Masculina",
  FEMENINA: "Agrupación Femenina",
  MILICIANOS: "Milicianos",
};

function SeccionCard({
  seccion,
}: {
  seccion: AgrupacionConSecciones["secciones"][number];
}) {
  return (
    <Link
      href={`/secciones/${seccion.id}`}
      className="group block rounded-xl border border-ruca-gray-light bg-ruca-black p-4 transition-colors hover:border-ruca-yellow/40"
    >
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h3 className="font-semibold text-white group-hover:text-ruca-yellow">
            {seccion.nombre}
          </h3>
          <p className="text-xs text-gray-500">Patrono: {seccion.patrono}</p>
        </div>
        <span className="rounded-full bg-ruca-gray px-2 py-0.5 text-xs text-gray-400">
          {seccion.nivel_escolar_desde}°–{seccion.nivel_escolar_hasta}° año
        </span>
      </div>

      <div className="mt-3 space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={11} />
          <span>
            <span className="font-semibold text-white">
              {seccion.miembros_activos}
            </span>{" "}
            miembros activos
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <BookOpen size={11} />
          <span>
            {seccion.jefe_actual ? (
              <>
                Jefe:{" "}
                <span className="text-gray-300">
                  {seccion.jefe_actual.nombre} {seccion.jefe_actual.apellido}
                </span>
              </>
            ) : (
              <span className="italic text-gray-600">Sin jefe asignado</span>
            )}
          </span>
        </div>
      </div>
    </Link>
  );
}

function AgrupacionCard({ agr }: { agr: AgrupacionConSecciones }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${TIPO_COLOR[agr.tipo] ?? "border-ruca-gray-light bg-ruca-gray"}`}
    >
      {/* Header agrupación */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">{agr.nombre}</h2>
          <p className="text-xs text-gray-500">Patrono: {agr.patrono}</p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-xs font-medium ${TIPO_BADGE[agr.tipo]}`}
        >
          {TIPO_LABEL[agr.tipo]}
        </span>
      </div>

      {/* Secciones */}
      {agr.secciones.length === 0 ? (
        <p className="text-xs text-gray-600 italic">Sin secciones cargadas.</p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {agr.secciones.map((sec) => (
            <SeccionCard key={sec.id} seccion={sec} />
          ))}
        </div>
      )}
    </div>
  );
}

function DepartamentoCard({ depto }: { depto: DepartamentoBasico }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-ruca-gray-light bg-ruca-black p-4">
      <div className="flex items-center gap-3">
        <div className="rounded-lg bg-ruca-gray p-2">
          <Building2 size={16} className="text-ruca-yellow" />
        </div>
        <div>
          <p className="font-medium text-white">{depto.nombre}</p>
          {depto.descripcion && (
            <p className="text-xs text-gray-500">{depto.descripcion}</p>
          )}
        </div>
      </div>
      <span className="text-sm text-gray-400">
        <span className="font-semibold text-white">{depto.miembros_count}</span>{" "}
        jefes
      </span>
    </div>
  );
}

export default async function SeccionesPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "SECCIONES", "ver")) redirect("/dashboard");

  const { agrupaciones, departamentos } = await obtenerOrganigrama();

  const totalMiembros = agrupaciones
    .flatMap((a) => a.secciones)
    .reduce((acc, s) => acc + s.miembros_activos, 0);
  const totalSecciones = agrupaciones.reduce(
    (acc, a) => acc + a.secciones.length,
    0,
  );

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Secciones</h1>
          <p className="mt-1 text-sm text-gray-500">
            Organigrama de Grupo Scout Ruca Tucún —{" "}
            <span className="text-ruca-yellow">{totalSecciones} secciones</span>,{" "}
            <span className="text-ruca-yellow">{totalMiembros} miembros activos</span>
          </p>
        </div>
      </div>

      {/* Árbol de agrupaciones */}
      <div className="space-y-4">
        {agrupaciones.map((agr) => (
          <AgrupacionCard key={agr.id} agr={agr} />
        ))}
      </div>

      {/* Departamentos */}
      {departamentos.length > 0 && (
        <div>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Departamentos
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {departamentos.map((d) => (
              <DepartamentoCard key={d.id} depto={d} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
