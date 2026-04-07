"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { crearMiembro } from "@/app/(dashboard)/miembros/actions";

interface Seccion {
  id: string;
  nombre: string;
}

interface Props {
  secciones: Seccion[];
  seccionPreseleccionada: string;
}

function calcularEdadDesdeString(fechaStr: string): number {
  if (!fechaStr) return 99;
  const fecha = new Date(fechaStr);
  const hoy = new Date();
  let edad = hoy.getFullYear() - fecha.getFullYear();
  const m = hoy.getMonth() - fecha.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < fecha.getDate())) edad--;
  return edad;
}

function CampoInput({
  label,
  name,
  type = "text",
  defaultValue = "",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
        {label} {required && <span className="text-ruca-yellow">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        placeholder={placeholder}
        className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
      />
    </div>
  );
}

export default function FormularioNuevoMiembro({ secciones, seccionPreseleccionada }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);
  const [fechaNac, setFechaNac] = useState("");

  const esmenor = fechaNac ? calcularEdadDesdeString(fechaNac) < 18 : false;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setCargando(true);

    const formData = new FormData(e.currentTarget);
    const resultado = await crearMiembro(formData);

    setCargando(false);

    if (resultado.ok) {
      router.push(`/miembros/${resultado.data.id}`);
    } else {
      setError(resultado.error);
    }
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Datos básicos */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Datos personales
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <CampoInput label="Nombre" name="nombre" required placeholder="Ej: Juan" />
          <CampoInput label="Apellido" name="apellido" required placeholder="Ej: Pérez" />

          {/* Fecha de nacimiento — controlado para detectar menor */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Fecha de nacimiento <span className="text-ruca-yellow">*</span>
            </label>
            <input
              name="fecha_nacimiento"
              type="date"
              required
              value={fechaNac}
              onChange={(e) => setFechaNac(e.target.value)}
              max={new Date().toISOString().slice(0, 10)}
              className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
            />
            {fechaNac && (
              <p className="text-xs text-zinc-500">
                Edad: {calcularEdadDesdeString(fechaNac)} años
                {esmenor && (
                  <span className="ml-2 text-ruca-yellow">(menor de edad)</span>
                )}
              </p>
            )}
          </div>

          <CampoInput
            label="Año de ingreso"
            name="anio_ingreso"
            type="number"
            defaultValue={String(new Date().getFullYear())}
            required
          />
        </div>
      </div>

      {/* Sección */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Sección
        </h2>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium uppercase tracking-wider text-zinc-400">
            Sección <span className="text-ruca-yellow">*</span>
          </label>
          <select
            name="seccion_id"
            defaultValue={seccionPreseleccionada}
            required
            disabled={secciones.length === 1}
            className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white outline-none focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow disabled:opacity-60"
          >
            {secciones.length === 0 && (
              <option value="">Sin secciones disponibles</option>
            )}
            {secciones.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Contacto del miembro */}
      <div>
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Contacto del miembro
        </h2>
        <div className="grid grid-cols-2 gap-4">
          <CampoInput
            label="Teléfono"
            name="telefono"
            type="tel"
            placeholder="+54 9 11 1234-5678"
          />
          <CampoInput
            label="Email"
            name="email"
            type="email"
            placeholder="miembro@email.com"
          />
        </div>
      </div>

      {/* Contacto del tutor — condicional según edad */}
      {esmenor && (
        <div>
          <div className="mb-4 flex items-center gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              Contacto del tutor
            </h2>
            <span className="rounded-full border border-ruca-yellow/40 bg-ruca-yellow/10 px-2 py-0.5 text-[10px] font-medium text-ruca-yellow">
              Requerido — menor de edad
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <CampoInput
              label="Teléfono tutor"
              name="telefono_tutor"
              type="tel"
              placeholder="+54 9 11 1234-5678"
            />
            <CampoInput
              label="Email tutor"
              name="email_tutor"
              type="email"
              placeholder="tutor@email.com"
            />
          </div>
          <p className="mt-2 text-xs text-zinc-600">
            Al menos uno de los dos campos es obligatorio para menores de edad.
          </p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={cargando || secciones.length === 0}
          className="rounded-lg bg-ruca-yellow px-5 py-2.5 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors disabled:opacity-60"
        >
          {cargando ? "Guardando..." : "Crear miembro"}
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
