import { createServerClient } from "@supabase/ssr";
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
  "/notificaciones",
];

function esRutaProtegida(pathname: string): boolean {
  return RUTAS_PROTEGIDAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );
}

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value),
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  // Ya autenticado intentando entrar a /login → ir al dashboard
  if (user && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Sin sesión intentando acceder a ruta protegida → ir a /login
  if (!user && esRutaProtegida(pathname)) {
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
    "/notificaciones/:path*",
    "/login",
  ],
};
