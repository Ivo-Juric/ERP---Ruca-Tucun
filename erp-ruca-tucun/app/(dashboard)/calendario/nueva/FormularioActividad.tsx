"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import { crearActividad } from "@/app/(dashboard)/calendario/actions";
import { TipoActividad } from "@prisma/client";

const LABEL_TIPO: Record<TipoActividad, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada de Formación",
  JORNADA_JEFES: "Jornada de Jefes",
  REUNION_JEFES: "Reunión de Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

const TIPOS_REQUIEREN_APROBACION: TipoActividad[] = [
  TipoActividad.CAMPAMENTO,
  TipoActividad.RETIRO,
  TipoActividad.JORNADA_JEFES,
];

function Campo({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  placeholder,
  children,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label} {required && <span className="text-ruca-yellow">*</span>}
      </label>
      {children ?? (
        <input
          name={name}
          type={type}
          defaultValue={defaultValue}
          required={required}
          placeholder={placeholder}
          className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
        />
      )}
    </div>
  );
}

interface Props {
  secciones: { id: string; nombre: string }[];
  seccionPreseleccionada: string;
  esSoloSeccion: boolean;
}

export default function FormularioActividad({
  secciones,
  seccionPreseleccionada,
  esSoloSeccion,
}: Props) {
  const router = useRouter();
  const [tipo, setTipo] = useState<TipoActividad>(TipoActividad.SABADO);
  const [requiereRecursos, setRequiereRecursos] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requiereAprobacionAuto = TIPOS_REQUIEREN_APROBACION.includes(tipo);
  const esSabado = tipo === TipoActividad.SABADO;
  const esReunionJefes = tipo === TipoActividad.REUNION_JEFES;

  // Fecha límite de carga del plan de sábado (próximo jueves)
  function proximoJueves(): string {
    const hoy = new Date();
    const diasHastaJueves = (4 - hoy.getDay() + 7) % 7 || 7;
    const jueves = new Date(hoy);
    jueves.setDate(hoy.getDate() + diasHastaJueves);
    return jueves.toLocaleDateString("es-AR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCargando(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("requiere_aprobacion", String(requiereAprobacionAuto));

    const res = await crearActividad(formData);
    setCargando(false);

    if (res.ok) {
      router.push("/calendario");
      router.refresh();
    } else {
      setError(res.error);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Aviso de aprobación */}
      {requiereAprobacionAuto && (
        <div className="flex items-start gap-3 rounded-lg border border-ruca-yellow/30 bg-ruca-yellow/5 px-4 py-3">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-ruca-yellow" />
          <p className="text-sm text-ruca-yellow/90">
            Este tipo de actividad requiere aprobación del Jefe de Ruca antes de
            confirmarse. Se creará en estado <strong>Planificada</strong>.
          </p>
        </div>
      )}

      {/* Tipo + Título */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Información básica
        </h2>
        <div className="grid gap-4">
          <Campo label="Tipo de actividad" name="tipo" required>
            <select
              name="tipo"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoActividad)}
              required
              className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
            >
              {(Object.keys(LABEL_TIPO) as TipoActividad[]).map((t) => (
                <option key={t} value={t}>
                  {LABEL_TIPO[t]}
                </option>
              ))}
            </select>
          </Campo>

          <Campo
            label="Título"
            name="titulo"
            required
            placeholder={
              esSabado
                ? "Ej: Sábado de juegos al aire libre"
                : "Título de la actividad"
            }
          />

          <Campo
            label="Descripción"
            name="descripcion"
            placeholder="Descripción general de la actividad..."
          >
            <textarea
              name="descripcion"
              rows={3}
              placeholder="Descripción general de la actividad..."
              className="resize-none rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
            />
          </Campo>
        </div>
      </div>

      {/* Fechas y lugar */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Fecha y lugar
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <Campo
            label="Fecha y hora de inicio"
            name="fecha_inicio"
            type="datetime-local"
            required
          />
          <Campo
            label="Fecha y hora de fin"
            name="fecha_fin"
            type="datetime-local"
            required
          />
          <div className="col-span-2">
            <Campo
              label="Lugar"
              name="lugar"
              placeholder="Ej: Sede del grupo, Parque…"
            />
          </div>
        </div>
      </div>

      {/* Sección */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Alcance
        </h2>
        <Campo label="Sección involucrada" name="seccion_id">
          <select
            name="seccion_id"
            defaultValue={seccionPreseleccionada}
            disabled={esSoloSeccion && secciones.length === 1}
            className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow disabled:opacity-60"
          >
            <option value="">General (todo el Ruca)</option>
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </Campo>

        {esReunionJefes && (
          <p className="mt-2 text-xs text-zinc-500">
            Las Reuniones de Jefes son convocadas para todos los jefes de la agrupación.
            La agenda y el acta se gestionan desde Comunicación.
          </p>
        )}
      </div>

      {/* Plan semanal — solo para SABADO */}
      {esSabado && (
        <div>
          <h2 className="mb-4 flex items-center justify-between text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Plan de actividad
            <span className="rounded-full border border-ruca-yellow/30 bg-ruca-yellow/10 px-2 py-0.5 text-[10px] normal-case font-normal text-ruca-yellow">
              Fecha límite de carga: {proximoJueves()}
            </span>
          </h2>
          <Campo label="Plan semanal" name="plan_sabado">
            <textarea
              name="plan_sabado"
              rows={5}
              placeholder={`Describí el plan de actividades del sábado:\n- Apertura y oración\n- Actividad principal\n- Cierre y reflexión`}
              className="resize-none rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
            />
          </Campo>
        </div>
      )}

      {/* Recursos de intendencia */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Recursos
        </h2>
        <label className="flex cursor-pointer items-center gap-3">
          <button
            type="button"
            onClick={() => setRequiereRecursos((v) => !v)}
            className={[
              "relative h-6 w-11 rounded-full transition-colors",
              requiereRecursos ? "bg-ruca-yellow" : "bg-ruca-gray-light",
            ].join(" ")}
            role="switch"
            aria-checked={requiereRecursos}
          >
            <span
              className={[
                "absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                requiereRecursos ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            />
          </button>
          <span className="text-sm text-zinc-300">
            Esta actividad requiere recursos del inventario
          </span>
        </label>

        {requiereRecursos && (
          <div className="mt-3 rounded-lg border border-ruca-gray-light bg-ruca-black/60 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Podés solicitar recursos desde el módulo de{" "}
              <a href="/intendencia" className="text-ruca-yellow hover:underline">
                Intendencia
              </a>{" "}
              una vez creada la actividad.
            </p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex gap-3 pt-2 border-t border-ruca-gray-light">
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-ruca-yellow px-5 py-2.5 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors disabled:opacity-60"
        >
          {cargando ? "Creando..." : "Crear actividad"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-lg border border-ruca-gray-light px-5 py-2.5 text-sm text-zinc-400 hover:bg-ruca-gray transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
