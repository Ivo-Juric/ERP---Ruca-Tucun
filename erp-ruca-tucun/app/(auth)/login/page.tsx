import { loginAction } from "@/app/(auth)/actions";

// ─── Ícono: estrella de 8 puntas ─────────────────────────────────────────────

function EstrellaSVG() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon
        points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
        fill="#D4B000"
      />
      {/* Segunda capa rotada 22.5° para simular 8 puntas */}
      <polygon
        points="50,2 59,32 90,32 66,52 76,84 50,66 24,84 34,52 10,32 41,32"
        fill="#D4B000"
        transform="rotate(22.5 50 50)"
      />
    </svg>
  );
}

// ─── Mensajes de error ────────────────────────────────────────────────────────

const ERRORES: Record<string, string> = {
  credenciales_invalidas: "Email o contraseña incorrectos.",
  error_servidor: "Error del servidor. Intentá de nuevo en unos momentos.",
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
          <EstrellaSVG />
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
            <div className="mb-5 rounded-lg border border-red-500/40 bg-red-950/50 px-4 py-3 text-sm text-red-400">
              {mensajeError}
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
