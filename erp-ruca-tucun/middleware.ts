import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Rutas del grupo (dashboard) — URL real sin el prefijo del route group
const RUTAS_PROTEGIDAS = [
  "/dashboard",
  "/comunicacion",
  "/calendario",
  "/formacion",
  "/miembros",
  "/intendencia",
  "/secciones",
  "/reportes",
  "/admin",
];

function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          req.cookies.set(name, value);
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set(name, value, options as Parameters<typeof res.cookies.set>[2]);
        },
        remove(name: string, options: Record<string, unknown>) {
          req.cookies.set(name, "");
          res = NextResponse.next({ request: { headers: req.headers } });
          res.cookies.set(name, "", options as Parameters<typeof res.cookies.set>[2]);
        },
      },
    },
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = req.nextUrl;

  // Ya autenticado intentando entrar a /login → ir al dashboard
  if (session && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Sin sesión intentando acceder a ruta protegida → ir a /login
  if (!session && esRutaProtegida(pathname)) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/comunicacion/:path*",
    "/calendario/:path*",
    "/formacion/:path*",
    "/miembros/:path*",
    "/intendencia/:path*",
    "/secciones/:path*",
    "/reportes/:path*",
    "/admin/:path*",
    "/login",
  ],
};
