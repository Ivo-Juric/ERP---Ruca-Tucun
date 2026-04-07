import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { obtenerCirculares } from "../actions";
import { FileText, CheckCircle, Clock } from "lucide-react";
import FormularioCircular from "@/components/modulos/comunicacion/FormularioCircular";
import BtnMarcarLeida from "@/components/modulos/comunicacion/BtnMarcarLeida";
import type { Rol } from "@prisma/client";

const ROLES_CIRCULAR: Rol[] = [
  "JEFE_RUCA",
  "SECRETARIO",
  "JEFE_COMUNICACIONES",
  "SUBJEFE_COMUNICACIONES",
];

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function CircularesPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");

  const res = await obtenerCirculares();
  const circulares = res.ok ? res.data : [];
  const puedeCrear = ROLES_CIRCULAR.includes(usuario.rol);
  const esSub = usuario.rol === "SUBJEFE_COMUNICACIONES";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Circulares</h1>
        {puedeCrear && <FormularioCircular esSub={esSub} />}
      </div>

      {!res.ok && (
        <div className="rounded-xl bg-red-900/20 p-4 text-sm text-red-400">
          {res.error}
        </div>
      )}

      {circulares.length === 0 ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-14 text-center text-sm text-gray-500">
          No hay circulares disponibles.
        </div>
      ) : (
        <div className="space-y-4">
          {circulares.map((circular) => {
            const esAutor = circular.autor.id === usuario.id;

            return (
              <article
                key={circular.id}
                className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-5"
              >
                {/* Cabecera */}
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-start gap-3">
                    <FileText
                      size={18}
                      className="mt-0.5 flex-none text-ruca-yellow"
                    />
                    <div className="min-w-0">
                      <h2 className="font-semibold text-white">
                        {circular.titulo}
                      </h2>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {circular.autor.nombre} {circular.autor.apellido} ·{" "}
                        {formatFecha(circular.creado_en)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-none flex-col items-end gap-1">
                    {circular.enviada ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={12} />
                        Enviada
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-400">
                        <Clock size={12} />
                        Pendiente aprobación
                      </span>
                    )}
                    {circular.programada_para && (
                      <span className="text-xs text-gray-500">
                        Programa: {formatFecha(circular.programada_para)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contenido */}
                <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                  {circular.contenido}
                </p>

                {/* Pie */}
                <div className="flex items-center justify-between">
                  <div>
                    {esAutor && circular.enviada && (
                      <span className="text-xs text-gray-500">
                        {circular.lecturas_count} lectura
                        {circular.lecturas_count !== 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <div>
                    {circular.yo_lei ? (
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle size={12} />
                        Leída
                      </span>
                    ) : !esAutor && circular.enviada ? (
                      <BtnMarcarLeida circularId={circular.id} />
                    ) : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
