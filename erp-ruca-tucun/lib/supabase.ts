import { createBrowserClient, createServerClient } from "@supabase/auth-helpers-nextjs";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Cliente para uso en Client Components.
 */
export function createClientComponentClient() {
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
}

/**
 * Cliente para uso en Server Components (solo lectura de cookies).
 */
export function createServerComponentClient() {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
    },
  });
}

/**
 * Cliente para uso en Server Actions (lectura y escritura de cookies).
 */
export function createServerActionClient() {
  const cookieStore = cookies();
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value;
      },
      set(name: string, value: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value, ...options });
      },
      remove(name: string, options: Record<string, unknown>) {
        cookieStore.set({ name, value: "", ...options });
      },
    },
  });
}

/**
 * Cliente administrativo con service role key.
 * Solo usar en contextos de servidor con permisos elevados.
 */
export const supabaseAdmin = createClient(
  supabaseUrl,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);
