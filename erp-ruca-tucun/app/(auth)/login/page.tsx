import Image from "next/image";
import { AlertCircle } from "lucide-react";
import { loginAction } from "@/app/(auth)/actions";

// ─── Mensajes de error ────────────────────────────────────────────────────────

const ERRORES: Record<string, string> = {
  credenciales_invalidas: "Email o contraseña incorrectos.",
  error_servidor: "Error del servidor. Intentá de nuevo en unos momentos.",
  sin_acceso: "Tu cuenta no tiene acceso al sistema. Consultá al Jefe de Ruca o al Administrador (Ivo).",
};

// ─── Página ───────────────────────────────────────────────────────────────────

interface LoginPageProps {
  searchParams: { error?: string; redirect?: string };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const mensajeError = searchParams.error ? (ERRORES[searchParams.error] ?? "Error inesperado.") : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <Image
            src="/logo-ruca-tucun.png"
            alt="Logo Ruca Tucún"
            width={80}
            height={80}
            className="mx-auto mb-2"
          />
          <h1 className="text-2xl font-bold tracking-wide text-ruca-yellow">
            Ruca Tucún
          </h1>
          <p className="text-sm text-zinc-400">Sistema de Gestión Interna</p>
        </div>

        {/* Formulario */}
        <div className="rounded-xl border border-ruca-yellow/30 bg-ruca-gray p-8 shadow-xl">
          <h2 className="mb-6 text-center text-lg font-semibold text-white">
            Iniciar sesión
          </h2>

          {/* Error */}
          {mensajeError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-red-500/60 bg-red-950/60 px-4 py-3 text-sm text-red-300">
              <AlertCircle size={16} className="mt-0.5 flex-none text-red-400" />
              <span>{mensajeError}</span>
            </div>
          )}

          <form action={loginAction} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="tu@email.com"
                className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
              />
            </div>

            {/* Contraseña */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-xs font-medium uppercase tracking-wider text-zinc-400">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                className="rounded-lg border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-ruca-yellow focus:ring-1 focus:ring-ruca-yellow"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="mt-2 rounded-lg bg-ruca-yellow px-4 py-2.5 text-sm font-bold text-ruca-black transition hover:bg-ruca-yellow-light active:scale-[0.98]"
            >
              Ingresar
            </button>
          </form>
        </div>

        {/* Pie */}
        <p className="mt-6 text-center text-xs text-zinc-600">
          No existe registro público. Contactá al Jefe de Ruca.
        </p>
      </div>
    </main>
  );
}
