import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { obtenerAnuncios } from "../actions";
import { Pin } from "lucide-react";
import FormularioAnuncio from "@/components/modulos/comunicacion/FormularioAnuncio";
import type { Rol, CategoriaAnuncio } from "@prisma/client";

const ROLES_TABLON: Rol[] = ["JEFE_RUCA", "SECRETARIO", "JEFE_COMUNICACIONES"];

const BADGE: Record<CategoriaAnuncio, { label: string; className: string }> = {
  URGENTE: {
    label: "Urgente",
    className:
      "bg-red-900/40 text-red-300 border border-red-700/60",
  },
  INFORMATIVO: {
    label: "Informativo",
    className:
      "bg-blue-900/40 text-blue-300 border border-blue-700/60",
  },
  RECORDATORIO: {
    label: "Recordatorio",
    className:
      "bg-yellow-900/40 text-yellow-300 border border-yellow-700/60",
  },
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function TablonPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");

  const res = await obtenerAnuncios();
  const anuncios = res.ok ? res.data : [];
  const puedePublicar = ROLES_TABLON.includes(usuario.rol);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Tablón de anuncios</h1>
        {puedePublicar && <FormularioAnuncio />}
      </div>

      {!res.ok && (
        <div className="rounded-xl bg-red-900/20 p-4 text-sm text-red-400">
          {res.error}
        </div>
      )}

      {anuncios.length === 0 ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-14 text-center text-sm text-gray-500">
          No hay anuncios activos.
        </div>
      ) : (
        <div className="space-y-4">
          {anuncios.map((anuncio) => {
            const badge = BADGE[anuncio.categoria];
            return (
              <article
                key={anuncio.id}
                className={`rounded-xl border bg-ruca-gray p-5 ${
                  anuncio.fijado
                    ? "border-ruca-yellow/40"
                    : "border-ruca-gray-light"
                }`}
              >
                {/* Cabecera */}
                <div className="mb-3 flex items-start gap-3">
                  {anuncio.fijado && (
                    <Pin
                      size={15}
                      className="mt-0.5 flex-none text-ruca-yellow"
                    />
                  )}
                  <div className="flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                      {anuncio.fijado && (
                        <span className="text-xs font-medium text-ruca-yellow">
                          Fijado
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      {anuncio.titulo}
                    </h2>
                  </div>
                </div>

                {/* Contenido */}
                <p className="mb-4 whitespace-pre-wrap text-sm leading-relaxed text-gray-300">
                  {anuncio.contenido}
                </p>

                {/* Pie */}
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    {anuncio.autor.nombre} {anuncio.autor.apellido}
                  </span>
                  <span>{formatFecha(anuncio.creado_en)}</span>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
