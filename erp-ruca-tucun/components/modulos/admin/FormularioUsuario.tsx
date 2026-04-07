"use client";

import { useRef, useState, useTransition } from "react";
import { Plus, X, Eye, EyeOff } from "lucide-react";
import { crearUsuario } from "@/app/(dashboard)/admin/actions";
import { useRouter } from "next/navigation";
import type { Rol } from "@prisma/client";
import type {
  SeccionOpcion,
  DepartamentoOpcion,
} from "@/app/(dashboard)/admin/actions";

// Roles que requieren sección
const ROLES_CON_SECCION: Rol[] = [
  "JEFE_SECCION",
  "SUBJEFE_SECCION",
];

// Roles que requieren departamento
const ROLES_CON_DEPARTAMENTO: Rol[] = [
  "JEFE_INTENDENCIA",
  "SUBJEFE_INTENDENCIA",
  "JEFE_COMUNICACIONES",
  "SUBJEFE_COMUNICACIONES",
  "JEFE_FDOC",
  "SUBJEFE_FDOC",
];

const TODOS_LOS_ROLES: { value: Rol; label: string }[] = [
  { value: "JEFE_RUCA", label: "Jefe de Ruca" },
  { value: "SECRETARIO", label: "Secretario" },
  { value: "JEFE_INTENDENCIA", label: "Jefe de Intendencia" },
  { value: "SUBJEFE_INTENDENCIA", label: "Subjefe de Intendencia" },
  { value: "JEFE_COMUNICACIONES", label: "Jefe de Comunicaciones" },
  { value: "SUBJEFE_COMUNICACIONES", label: "Subjefe de Comunicaciones" },
  { value: "JEFE_FDOC", label: "Jefe FDoc" },
  { value: "SUBJEFE_FDOC", label: "Subjefe FDoc" },
  { value: "JEFE_MILICIANOS", label: "Jefe de Milicianos" },
  { value: "JEFE_AGRUP_MASCULINA", label: "Jefe Agrup. Masculina" },
  { value: "JEFE_AGRUP_FEMENINA", label: "Jefe Agrup. Femenina" },
  { value: "JEFE_SECCION", label: "Jefe de Sección" },
  { value: "SUBJEFE_SECCION", label: "Subjefe de Sección" },
];

type Props = {
  secciones: SeccionOpcion[];
  departamentos: DepartamentoOpcion[];
};

export default function FormularioUsuario({ secciones, departamentos }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [rolSeleccionado, setRolSeleccionado] = useState<Rol>("JEFE_SECCION");
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const router = useRouter();

  const necesitaSeccion = ROLES_CON_SECCION.includes(rolSeleccionado);
  const necesitaDepto = ROLES_CON_DEPARTAMENTO.includes(rolSeleccionado);

  function handleClose() {
    setAbierto(false);
    setError(null);
    setRolSeleccionado("JEFE_SECCION");
    formRef.current?.reset();
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;

    const email = (form.elements.namedItem("email") as HTMLInputElement).value.trim();
    const nombre = (form.elements.namedItem("nombre") as HTMLInputElement).value.trim();
    const apellido = (form.elements.namedItem("apellido") as HTMLInputElement).value.trim();
    const password_temporal = (form.elements.namedItem("password_temporal") as HTMLInputElement).value;
    const seccion_id =
      (form.elements.namedItem("seccion_id") as HTMLSelectElement)?.value || null;
    const departamento_id =
      (form.elements.namedItem("departamento_id") as HTMLSelectElement)?.value || null;

    if (!email || !nombre || !apellido) {
      setError("Email, nombre y apellido son requeridos.");
      return;
    }
    if (necesitaSeccion && !seccion_id) {
      setError("Seleccioná una sección para este rol.");
      return;
    }
    if (necesitaDepto && !departamento_id) {
      setError("Seleccioná un departamento para este rol.");
      return;
    }

    setError(null);

    startTransition(async () => {
      const res = await crearUsuario({
        email,
        nombre,
        apellido,
        rol: rolSeleccionado,
        seccion_id,
        departamento_id,
        password_temporal,
      });

      if (res.ok) {
        router.refresh();
        handleClose();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="flex items-center gap-2 rounded-xl bg-ruca-yellow px-4 py-2 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light"
      >
        <Plus size={16} />
        Crear usuario
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-ruca-gray-light bg-ruca-gray shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-ruca-gray-light px-6 py-4">
              <h2 className="font-semibold text-white">Crear nuevo usuario</h2>
              <button
                onClick={handleClose}
                disabled={isPending}
                className="rounded-lg p-1 text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="space-y-4 p-6"
            >
              {/* Nombre + Apellido */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Nombre <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="nombre"
                    type="text"
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Apellido <span className="text-red-400">*</span>
                  </label>
                  <input
                    name="apellido"
                    type="text"
                    autoComplete="off"
                    required
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  name="email"
                  type="email"
                  autoComplete="off"
                  required
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                />
              </div>

              {/* Rol */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Rol <span className="text-red-400">*</span>
                </label>
                <select
                  name="rol"
                  value={rolSeleccionado}
                  onChange={(e) => setRolSeleccionado(e.target.value as Rol)}
                  className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                >
                  {TODOS_LOS_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sección (condicional) */}
              {necesitaSeccion && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Sección <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="seccion_id"
                    defaultValue=""
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  >
                    <option value="" disabled>
                      Seleccioná una sección...
                    </option>
                    {secciones.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Departamento (condicional) */}
              {necesitaDepto && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Departamento <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="departamento_id"
                    defaultValue=""
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white focus:border-ruca-yellow focus:outline-none"
                  >
                    <option value="" disabled>
                      Seleccioná un departamento...
                    </option>
                    {departamentos.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Contraseña temporal */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Contraseña temporal <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <input
                    name="password_temporal"
                    type={mostrarPassword ? "text" : "password"}
                    minLength={8}
                    required
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 pr-10 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  >
                    {mostrarPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                <p className="mt-1 text-xs text-gray-600">
                  El usuario deberá cambiarla en su primer acceso.
                </p>
              </div>

              {error && (
                <p className="rounded-xl bg-red-900/30 px-4 py-2.5 text-sm text-red-400">
                  {error}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isPending}
                  className="flex-1 rounded-xl border border-ruca-gray-light py-2.5 text-sm font-medium text-gray-300 hover:bg-ruca-gray-light disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 rounded-xl bg-ruca-yellow py-2.5 text-sm font-semibold text-ruca-black hover:bg-ruca-yellow-light disabled:opacity-50"
                >
                  {isPending ? "Creando..." : "Crear usuario"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
