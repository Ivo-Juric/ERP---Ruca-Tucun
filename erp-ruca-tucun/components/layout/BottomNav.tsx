"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  Users,
  MoreHorizontal,
  BookOpen,
  Package,
  GitBranch,
  BarChart2,
  Settings,
  X,
  LogOut,
} from "lucide-react";
import { createClientComponentClient } from "@/lib/supabase";
import { checkPermiso, type Modulo } from "@/lib/permissions";
import { useUsuario } from "./UserContext";

interface NavEntry {
  label: string;
  href: string;
  modulo: Modulo;
  Icon: React.ElementType;
}

const BOTTOM_ITEMS: NavEntry[] = [
  { label: "Dashboard", href: "/dashboard", modulo: "DASHBOARD", Icon: LayoutDashboard },
  { label: "Comunic.", href: "/comunicacion", modulo: "COMUNICACION", Icon: MessageSquare },
  { label: "Calendario", href: "/calendario", modulo: "CALENDARIO", Icon: Calendar },
  { label: "Miembros", href: "/miembros", modulo: "MIEMBROS", Icon: Users },
];

const DRAWER_ITEMS: NavEntry[] = [
  { label: "Formación", href: "/formacion", modulo: "FORMACION", Icon: BookOpen },
  { label: "Intendencia", href: "/intendencia", modulo: "INTENDENCIA", Icon: Package },
  { label: "Secciones", href: "/secciones", modulo: "SECCIONES", Icon: GitBranch },
  { label: "Reportes", href: "/reportes", modulo: "REPORTES", Icon: BarChart2 },
  { label: "Admin", href: "/admin", modulo: "ADMIN", Icon: Settings },
];

export default function BottomNav() {
  const usuario = useUsuario();
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const bottomVisible = BOTTOM_ITEMS.filter((item) =>
    checkPermiso(usuario.rol, item.modulo, "ver"),
  );

  const drawerVisible = DRAWER_ITEMS.filter((item) => {
    if (item.modulo === "ADMIN" && usuario.rol !== "JEFE_RUCA") return false;
    return checkPermiso(usuario.rol, item.modulo, "ver");
  });

  async function handleLogout() {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Drawer overlay */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={[
          "fixed bottom-16 left-0 right-0 z-50 rounded-t-2xl border-t border-ruca-gray-light bg-ruca-black px-4 pb-4 pt-3 transition-transform duration-300 md:hidden",
          drawerOpen ? "translate-y-0" : "translate-y-full",
        ].join(" ")}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Más módulos
          </span>
          <button onClick={() => setDrawerOpen(false)} className="text-zinc-500">
            <X size={20} />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {drawerVisible.map(({ label, href, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setDrawerOpen(false)}
                className={[
                  "flex flex-col items-center gap-1 rounded-xl py-3 text-xs font-medium transition-colors",
                  isActive
                    ? "bg-ruca-yellow text-ruca-black"
                    : "bg-ruca-gray text-zinc-400",
                ].join(" ")}
              >
                <Icon size={20} />
                {label}
              </Link>
            );
          })}
        </div>

        <button
          onClick={handleLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm text-zinc-500 hover:bg-ruca-gray hover:text-white"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>

      {/* Bottom bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-16 items-center border-t border-ruca-gray-light bg-ruca-black md:hidden">
        {bottomVisible.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
                isActive ? "text-ruca-yellow" : "text-zinc-500",
              ].join(" ")}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
              {label}
            </Link>
          );
        })}

        {/* Botón Más */}
        <button
          onClick={() => setDrawerOpen((v) => !v)}
          className={[
            "flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
            drawerOpen ? "text-ruca-yellow" : "text-zinc-500",
          ].join(" ")}
        >
          <MoreHorizontal size={22} strokeWidth={1.8} />
          Más
        </button>
      </nav>
    </>
  );
}
