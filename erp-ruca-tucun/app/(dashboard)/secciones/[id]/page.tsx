export const revalidate = 60;

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  BookOpen,
  BarChart2,
  Calendar,
} from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { obtenerSeccionDetalle } from "../actions";

const ROL_LABEL: Record<string, string> = {
  JEFE_SECCION: "Jefe de Sección",
  SUBJEFE_SECCION: "Subjefe de Sección",
};

const TIPO_AGRUPACION: Record<string, string> = {
  MASCULINA: "Agrupación Masculina",
  FEMENINA: "Agrupación Femenina",
  MILICIANOS: "Milicianos",
};

interface PageProps {
  params: { id: string };
}

export default async function SeccionDetallePage({ params }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "SECCIONES", "ver")) redirect("/dashboard");

  const seccion = await obtenerSeccionDetalle(params.id);
  if (!seccion) notFound();

  const puedeEditar = usuario.rol === "JEFE_RUCA";

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Back + Header */}
      <div>
        <Link
          href="/secciones"
          className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-white"
        >
          <ArrowLeft size={14} />
          Volver al organigrama
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">{seccion.nombre}</h1>
            <p className="mt-1 text-sm text-gray-500">
              {TIPO_AGRUPACION[seccion.agrupacion.tipo] ?? seccion.agrupacion.tipo}{" "}
              — {seccion.agrupacion.nombre}
            </p>
          </div>
          {puedeEditar && (
            <button className="rounded-xl border border-ruca-gray-light px-4 py-2 text-sm font-medium text-gray-300 hover:bg-ruca-gray-light">
              Editar ficha
            </button>
          )}
        </div>
      </div>

      {/* Fichas de datos */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Info básica */}
        <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
            Información general
          </h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Patrono</dt>
              <dd className="font-medium text-white">{seccion.patrono}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Nivel escolar</dt>
              <dd className="font-medium text-white">
                {seccion.nivel_escolar_desde}° – {seccion.nivel_escolar_hasta}° año
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Agrupación</dt>
              <dd className="font-medium text-white">{seccion.agrupacion.nombre}</dd>
            </div>
          </dl>
        </div>

        {/* Estadísticas rápidas */}
        <div className="grid grid-cols-2 gap-3">
          <StatBox
            icon={<Users size={18} />}
            valor={String(seccion.miembros_activos)}
            etiqueta="Miembros activos"
          />
          <StatBox
            icon={<BarChart2 size={18} />}
            valor={
              seccion.porcentaje_asistencia_promedio !== null
                ? `${seccion.porcentaje_asistencia_promedio}%`
                : "—"
            }
            etiqueta="Asistencia promedio"
          />
          <StatBox
            icon={<BookOpen size={18} />}
            valor={String(seccion.sesiones_fdoc_este_anio)}
            etiqueta="Sesiones FDoc este año"
          />
          <StatBox
            icon={<Calendar size={18} />}
            valor={String(new Date().getFullYear())}
            etiqueta="Año en curso"
          />
        </div>
      </div>

      {/* Jefaturas actuales */}
      <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-5">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Jefaturas actuales
        </h2>
        {seccion.jefes.length === 0 ? (
          <p className="text-sm text-gray-600 italic">
            No hay jefes asignados a esta sección.
          </p>
        ) : (
          <div className="space-y-3">
            {seccion.jefes.map((jefe) => (
              <div
                key={jefe.id}
                className="flex items-center gap-3 rounded-xl border border-ruca-gray-light bg-ruca-black p-3"
              >
                <div className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-ruca-gray text-sm font-bold text-ruca-yellow">
                  {jefe.nombre[0]}
                  {jefe.apellido[0]}
                </div>
                <div>
                  <p className="font-medium text-white">
                    {jefe.nombre} {jefe.apellido}
                  </p>
                  <p className="text-xs text-gray-500">
                    {ROL_LABEL[jefe.rol] ?? jefe.rol}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Historial de jefaturas */}
      <div className="rounded-2xl border border-ruca-gray-light bg-ruca-gray p-5">
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-gray-400">
          Historial de jefaturas
        </h2>
        <p className="text-sm text-gray-600 italic">
          El historial de jefaturas anteriores requiere una tabla de registro
          dedicada. Próximamente disponible.
        </p>
      </div>
    </div>
  );
}

function StatBox({
  icon,
  valor,
  etiqueta,
}: {
  icon: React.ReactNode;
  valor: string;
  etiqueta: string;
}) {
  return (
    <div className="flex flex-col justify-between rounded-xl border border-ruca-yellow-light/20 bg-ruca-black p-4">
      <div className="mb-2 text-gray-500">{icon}</div>
      <p className="text-2xl font-bold text-ruca-yellow">{valor}</p>
      <p className="mt-0.5 text-xs text-gray-500">{etiqueta}</p>
    </div>
  );
}
