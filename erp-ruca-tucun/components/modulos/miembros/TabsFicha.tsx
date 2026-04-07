"use client";

import { useState } from "react";
import { Lock } from "lucide-react";
import { EstadoMiembro } from "@prisma/client";
import { editarMiembro } from "@/app/(dashboard)/miembros/actions";

// ─── Tipos serializables (sin Date) ──────────────────────────────────────────

export interface DatosPersonales {
  id: string;
  nombre: string;
  apellido: string;
  fecha_nacimiento: string; // ISO string
  anio_ingreso: number;
  telefono: string | null;
  email: string | null;
  telefono_tutor: string | null;
  email_tutor: string | null;
  estado: EstadoMiembro;
  seccion: { nombre: string };
}

export interface RegistroAsistencia {
  id: string;
  presente: boolean;
  actividad: {
    id: string;
    titulo: string;
    fecha_inicio: string; // ISO string
    tipo: string;
  };
}

export interface RegistroFDoc {
  id: string;
  presente: boolean;
  sesion: {
    id: string;
    tema: string;
    fecha: string; // ISO string
  };
}

interface TabsFichaProps {
  datos: DatosPersonales;
  asistencias: RegistroAsistencia[];
  fdoc: RegistroFDoc[];
  puedeEditar: boolean;
  puedeVerObservaciones: boolean;
  observaciones: string | null;
}

type Tab = "datos" | "asistencia" | "fdoc" | "observaciones";

const TIPO_ACTIVIDAD_LABEL: Record<string, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada de Formación",
  JORNADA_JEFES: "Jornada de Jefes",
  REUNION_JEFES: "Reunión de Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

const LABEL_ESTADO: Record<EstadoMiembro, string> = {
  ACTIVO: "Activo",
  INACTIVO: "Inactivo",
  EGRESADO: "Egresado",
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Tab: Datos personales ────────────────────────────────────────────────────

function TabDatos({
  datos,
  puedeEditar,
}: {
  datos: DatosPersonales;
  puedeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(null);
    setExito(false);
    const res = await editarMiembro(datos.id, formData);
    if (res.ok) {
      setExito(true);
      setEditando(false);
    } else {
      setError(res.error);
    }
  }

  const campo = (label: string, value: string | null | undefined) => (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-white">{value ?? "—"}</dd>
    </div>
  );

  if (!editando) {
    return (
      <div className="space-y-6">
        {exito && (
          <div className="rounded-lg border border-green-700/40 bg-green-900/30 px-4 py-2.5 text-sm text-green-400">
            Cambios guardados correctamente.
          </div>
        )}
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {campo("Nombre", datos.nombre)}
          {campo("Apellido", datos.apellido)}
          {campo("Fecha de nacimiento", formatFecha(datos.fecha_nacimiento))}
          {campo("Año de ingreso", String(datos.anio_ingreso))}
          {campo("Sección", datos.seccion.nombre)}
          {campo("Estado", LABEL_ESTADO[datos.estado])}
          {campo("Teléfono", datos.telefono)}
          {campo("Email", datos.email)}
          {campo("Teléfono tutor", datos.telefono_tutor)}
          {campo("Email tutor", datos.email_tutor)}
        </dl>
        {puedeEditar && (
          <button
            onClick={() => setEditando(true)}
            className="rounded-lg border border-ruca-yellow/50 px-4 py-2 text-sm font-medium text-ruca-yellow hover:bg-ruca-gray transition-colors"
          >
            Editar datos
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Campos ocultos necesarios */}
      <input type="hidden" name="seccion_id" value={datos.seccion_id ?? ""} />

      <div className="grid grid-cols-2 gap-4">
        <Campo label="Nombre" name="nombre" defaultValue={datos.nombre} required />
        <Campo label="Apellido" name="apellido" defaultValue={datos.apellido} required />
        <Campo
          label="Fecha de nacimiento"
          name="fecha_nacimiento"
          type="date"
          defaultValue={datos.fecha_nacimiento.slice(0, 10)}
          required
        />
        <Campo
          label="Año de ingreso"
          name="anio_ingreso"
          type="number"
          defaultValue={String(datos.anio_ingreso)}
          required
        />
        <Campo label="Teléfono" name="telefono" defaultValue={datos.telefono ?? ""} />
        <Campo label="Email" name="email" type="email" defaultValue={datos.email ?? ""} />
        <Campo
          label="Teléfono tutor"
          name="telefono_tutor"
          defaultValue={datos.telefono_tutor ?? ""}
        />
        <Campo
          label="Email tutor"
          name="email_tutor"
          type="email"
          defaultValue={datos.email_tutor ?? ""}
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          className="rounded-lg bg-ruca-yellow px-4 py-2 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors"
        >
          Guardar cambios
        </button>
        <button
          type="button"
          onClick={() => { setEditando(false); setError(null); }}
          className="rounded-lg border border-ruca-gray-light px-4 py-2 text-sm text-zinc-400 hover:bg-ruca-gray transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── Tab: Asistencia ──────────────────────────────────────────────────────────

function TabAsistencia({ asistencias }: { asistencias: RegistroAsistencia[] }) {
  if (asistencias.length === 0) {
    return <p className="text-sm text-zinc-500">Sin registros de asistencia aún.</p>;
  }

  const presentes = asistencias.filter((a) => a.presente).length;
  const pct = Math.round((presentes / asistencias.length) * 100);

  return (
    <div className="space-y-4">
      {/* Resumen */}
      <div className="flex items-center gap-4 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4">
        <div className="text-3xl font-bold text-ruca-yellow">{pct}%</div>
        <div className="text-sm text-zinc-400">
          {presentes} presente{presentes !== 1 ? "s" : ""} de {asistencias.length} actividade
          {asistencias.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Historial */}
      <div className="space-y-1">
        {asistencias.map((a) => (
          <div
            key={a.id}
            className="flex items-center justify-between rounded-lg border border-ruca-gray-light/50 px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-white">{a.actividad.titulo}</p>
              <p className="text-xs text-zinc-500">
                {TIPO_ACTIVIDAD_LABEL[a.actividad.tipo] ?? a.actividad.tipo} ·{" "}
                {formatFecha(a.actividad.fecha_inicio)}
              </p>
            </div>
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                a.presente
                  ? "bg-green-900/50 text-green-400"
                  : "bg-zinc-800 text-zinc-500",
              ].join(" ")}
            >
              {a.presente ? "Presente" : "Ausente"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: FDoc ────────────────────────────────────────────────────────────────

function TabFDoc({ fdoc }: { fdoc: RegistroFDoc[] }) {
  if (fdoc.length === 0) {
    return <p className="text-sm text-zinc-500">Sin registros de FDoc aún.</p>;
  }

  const presentes = fdoc.filter((r) => r.presente).length;
  const pct = Math.round((presentes / fdoc.length) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 rounded-xl border border-ruca-gray-light bg-ruca-gray p-4">
        <div className="text-3xl font-bold text-ruca-yellow">{pct}%</div>
        <div className="text-sm text-zinc-400">
          {presentes} presente{presentes !== 1 ? "s" : ""} de {fdoc.length} sesión
          {fdoc.length !== 1 ? "es" : ""}
        </div>
      </div>

      <div className="space-y-1">
        {fdoc.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between rounded-lg border border-ruca-gray-light/50 px-4 py-2.5"
          >
            <div>
              <p className="text-sm font-medium text-white">{r.sesion.tema}</p>
              <p className="text-xs text-zinc-500">{formatFecha(r.sesion.fecha)}</p>
            </div>
            <span
              className={[
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                r.presente
                  ? "bg-green-900/50 text-green-400"
                  : "bg-zinc-800 text-zinc-500",
              ].join(" ")}
            >
              {r.presente ? "Presente" : "Ausente"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Tab: Observaciones ───────────────────────────────────────────────────────

function TabObservaciones({
  miembro_id,
  observaciones,
  puedeEditar,
}: {
  miembro_id: string;
  observaciones: string | null;
  puedeEditar: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(observaciones ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);

  async function handleGuardar() {
    setGuardando(true);
    setError(null);
    const fd = new FormData();
    fd.append("observaciones", texto);
    // Necesitamos campos mínimos para pasar la validación de editarMiembro
    // La sección se mantiene, así que enviamos un marcador
    const res = await editarMiembro(miembro_id, fd);
    setGuardando(false);
    if (res.ok) {
      setEditando(false);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-ruca-yellow/20 bg-ruca-yellow/5 px-4 py-2.5">
        <Lock size={14} className="text-ruca-yellow" />
        <p className="text-xs text-ruca-yellow/80">
          Confidencial — no exportable ni visible fuera de este módulo
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-2.5 text-sm text-red-400">
          {error}
        </div>
      )}

      {editando ? (
        <div className="space-y-3">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={6}
            className="w-full rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow resize-none"
            placeholder="Observaciones sobre el miembro..."
          />
          <div className="flex gap-3">
            <button
              onClick={handleGuardar}
              disabled={guardando}
              className="rounded-lg bg-ruca-yellow px-4 py-2 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Guardar"}
            </button>
            <button
              onClick={() => { setEditando(false); setTexto(observaciones ?? ""); }}
              className="rounded-lg border border-ruca-gray-light px-4 py-2 text-sm text-zinc-400 hover:bg-ruca-gray transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="min-h-24 whitespace-pre-wrap rounded-lg border border-ruca-gray-light bg-ruca-gray px-4 py-3 text-sm text-zinc-300">
            {texto || <span className="text-zinc-600 italic">Sin observaciones registradas.</span>}
          </p>
          {puedeEditar && (
            <button
              onClick={() => setEditando(true)}
              className="rounded-lg border border-ruca-yellow/50 px-4 py-2 text-sm font-medium text-ruca-yellow hover:bg-ruca-gray transition-colors"
            >
              Editar observaciones
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helper de campo de formulario ───────────────────────────────────────────

function Campo({
  label,
  name,
  type = "text",
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        className="rounded-lg border border-ruca-gray-light bg-ruca-black px-3 py-2 text-sm text-white outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
      />
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

// Extender DatosPersonales para incluir seccion_id en el contexto de TabDatos
declare module "./TabsFicha" {
  interface DatosPersonales {
    seccion_id?: string;
  }
}

export default function TabsFicha({
  datos,
  asistencias,
  fdoc,
  puedeEditar,
  puedeVerObservaciones,
  observaciones,
}: TabsFichaProps) {
  const [tabActivo, setTabActivo] = useState<Tab>("datos");

  const tabs: { id: Tab; label: string; oculto?: boolean }[] = [
    { id: "datos", label: "Datos personales" },
    { id: "asistencia", label: "Asistencia" },
    { id: "fdoc", label: "FDoc" },
    { id: "observaciones", label: "Observaciones", oculto: !puedeVerObservaciones },
  ];

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 border-b border-ruca-gray-light mb-6">
        {tabs
          .filter((t) => !t.oculto)
          .map((tab) => (
            <button
              key={tab.id}
              onClick={() => setTabActivo(tab.id)}
              className={[
                "px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px",
                tabActivo === tab.id
                  ? "border-ruca-yellow text-ruca-yellow"
                  : "border-transparent text-zinc-500 hover:text-zinc-300",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
      </div>

      {/* Contenido */}
      {tabActivo === "datos" && (
        <TabDatos datos={datos} puedeEditar={puedeEditar} />
      )}
      {tabActivo === "asistencia" && <TabAsistencia asistencias={asistencias} />}
      {tabActivo === "fdoc" && <TabFDoc fdoc={fdoc} />}
      {tabActivo === "observaciones" && puedeVerObservaciones && (
        <TabObservaciones
          miembro_id={datos.id}
          observaciones={observaciones}
          puedeEditar={puedeEditar}
        />
      )}
    </div>
  );
}
