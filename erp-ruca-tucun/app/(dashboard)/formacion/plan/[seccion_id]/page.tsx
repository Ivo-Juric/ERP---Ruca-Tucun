import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { ChevronLeft, Check, Circle, Calendar } from "lucide-react";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import {
  obtenerPlanSeccion,
  obtenerSesionesPorSeccion,
} from "../../actions";
import FormularioItemPlan from "@/components/modulos/formacion/FormularioItemPlan";
import FormularioSesion from "@/components/modulos/formacion/FormularioSesion";
import BtnCrearPlan from "@/components/modulos/formacion/BtnCrearPlan";
import BtnCompletarItem from "@/components/modulos/formacion/BtnCompletarItem";
import type { Rol } from "@prisma/client";

const ROLES_CREAR_PLAN: Rol[] = ["JEFE_RUCA", "JEFE_FDOC"];
const ROLES_REGISTRAR_SESION: Rol[] = [
  "JEFE_RUCA",
  "JEFE_FDOC",
  "SUBJEFE_FDOC",
  "JEFE_SECCION",
  "SUBJEFE_SECCION",
];

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "long",
  });
}

interface PageProps {
  params: { seccion_id: string };
}

export default async function PlanSeccionPage({ params }: PageProps) {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");
  if (!checkPermiso(usuario.rol, "FORMACION", "ver")) redirect("/dashboard");

  const { seccion_id } = params;

  const [planRes, sesionesRes] = await Promise.all([
    obtenerPlanSeccion(seccion_id),
    obtenerSesionesPorSeccion(seccion_id),
  ]);

  if (!planRes.ok) {
    if (planRes.error.includes("Sin acceso")) redirect("/formacion");
    notFound();
  }

  const plan = planRes.ok ? planRes.data : null;
  const sesiones = sesionesRes.ok ? sesionesRes.data : [];

  const puedeCrearPlan = ROLES_CREAR_PLAN.includes(usuario.rol);
  const puedeRegistrarSesion = ROLES_REGISTRAR_SESION.includes(usuario.rol);
  const anioActual = new Date().getFullYear();

  const seccionNombre = plan?.seccion.nombre ?? `Sección ${seccion_id}`;

  const itemsSinCompletar = plan?.items.filter((i) => !i.completado) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Encabezado */}
      <div className="flex items-center gap-4">
        <Link
          href="/formacion"
          className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-3 py-1.5 text-sm text-gray-400 hover:bg-ruca-gray hover:text-white"
        >
          <ChevronLeft size={16} />
          Volver
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-white">{seccionNombre}</h1>
          <p className="text-sm text-gray-500">
            Plan de Formación Doctrinal {anioActual}
          </p>
        </div>
      </div>

      {/* Sin plan */}
      {!plan && (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-10 text-center">
          <p className="mb-4 text-gray-400">
            No hay plan de formación cargado para {anioActual}.
          </p>
          {puedeCrearPlan && (
            <BtnCrearPlan seccionId={seccion_id} anio={anioActual} />
          )}
        </div>
      )}

      {/* Plan con ítems */}
      {plan && (
        <div className="space-y-6">
          {/* Estadísticas */}
          <div className="flex items-center gap-6 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">
                {plan.items.length}
              </div>
              <div className="text-xs text-gray-500">Temas totales</div>
            </div>
            <div className="h-10 w-px bg-ruca-gray-light" />
            <div className="text-center">
              <div className="text-2xl font-bold text-green-400">
                {plan.items.filter((i) => i.completado).length}
              </div>
              <div className="text-xs text-gray-500">Completados</div>
            </div>
            <div className="h-10 w-px bg-ruca-gray-light" />
            <div className="text-center">
              <div className="text-2xl font-bold text-ruca-yellow">
                {plan.items.filter((i) => !i.completado).length}
              </div>
              <div className="text-xs text-gray-500">Pendientes</div>
            </div>
            <div className="ml-auto flex gap-2">
              {puedeRegistrarSesion && (
                <FormularioSesion
                  seccionId={seccion_id}
                  planId={plan.id}
                  itemsPlan={itemsSinCompletar}
                  trigger="global"
                />
              )}
              {puedeCrearPlan && (
                <FormularioItemPlan planId={plan.id} />
              )}
            </div>
          </div>

          {/* Lista de ítems del plan */}
          <div className="space-y-2">
            {plan.items.length === 0 ? (
              <div className="rounded-xl border border-dashed border-ruca-gray-light p-10 text-center text-sm text-gray-500">
                El plan no tiene ítems todavía.
                {puedeCrearPlan && (
                  <span className="block mt-1 text-ruca-yellow">
                    Usá &ldquo;Agregar tema&rdquo; para empezar.
                  </span>
                )}
              </div>
            ) : (
              plan.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-start gap-4 rounded-xl border p-4 transition-colors ${
                    item.completado
                      ? "border-green-800/40 bg-green-900/10"
                      : "border-ruca-gray-light bg-ruca-gray"
                  }`}
                >
                  {/* Icono estado */}
                  <div className="mt-0.5 flex-none">
                    {item.completado ? (
                      <Check size={18} className="text-green-400" />
                    ) : (
                      <Circle size={18} className="text-gray-600" />
                    )}
                  </div>

                  {/* Contenido */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h3
                        className={`font-medium ${
                          item.completado
                            ? "text-gray-400 line-through decoration-gray-600"
                            : "text-white"
                        }`}
                      >
                        {item.semana_estimada && (
                          <span className="mr-2 text-xs font-normal text-gray-500">
                            Sem. {item.semana_estimada}
                          </span>
                        )}
                        {item.tema}
                      </h3>
                      <div className="flex flex-none items-center gap-2">
                        {!item.completado && puedeRegistrarSesion && (
                          <FormularioSesion
                            seccionId={seccion_id}
                            planId={plan.id}
                            itemsPlan={itemsSinCompletar}
                            preseleccionadoId={item.id}
                            trigger="item"
                          />
                        )}
                        {puedeCrearPlan && (
                          <BtnCompletarItem
                            itemId={item.id}
                            completado={item.completado}
                          />
                        )}
                      </div>
                    </div>
                    {item.texto_referencia && (
                      <p className="mt-1 text-xs text-gray-500">
                        Referencia: {item.texto_referencia}
                      </p>
                    )}
                    {item.objetivo && (
                      <p className="mt-0.5 text-xs text-gray-600">
                        {item.objetivo}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {puedeCrearPlan && (
            <div className="flex justify-center">
              <FormularioItemPlan planId={plan.id} variant="outline" />
            </div>
          )}
        </div>
      )}

      {/* Sesiones recientes */}
      {sesiones.length > 0 && (
        <div className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-gray-500">
            <Calendar size={14} />
            Sesiones registradas ({sesiones.length})
          </h2>
          <div className="space-y-2">
            {sesiones.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-4 rounded-xl border border-ruca-gray-light bg-ruca-gray px-4 py-3"
              >
                <div className="text-sm text-gray-400 w-28 flex-none">
                  {formatFecha(s.fecha)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {s.tema}
                    </span>
                    {s.es_extra && (
                      <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-400">
                        Extra
                      </span>
                    )}
                  </div>
                  {s.plan_item && (
                    <p className="text-xs text-gray-500">
                      Plan: {s.plan_item.tema}
                    </p>
                  )}
                </div>
                <div className="flex-none text-sm font-mono text-gray-400">
                  {s.total_asistencias > 0
                    ? `${s.presentes}/${s.total_asistencias}`
                    : "—"}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
