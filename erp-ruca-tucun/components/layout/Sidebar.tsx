"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Calendar,
  BookOpen,
  Users,
  Package,
  GitBranch,
  BarChart2,
  Settings,
  LogOut,
} from "lucide-react";
import { createClientComponentClient } from "@/lib/supabase";
import { checkPermiso, type Modulo } from "@/lib/permissions";
import { useUsuario } from "./UserContext";
import CampanaNotificaciones from "./CampanaNotificaciones";

// ─── Utilidades ───────────────────────────────────────────────────────────────

const LABEL_ROL: Record<string, string> = {
  JEFE_RUCA: "Jefe de Ruca",
  SECRETARIO: "Secretario/a",
  JEFE_INTENDENCIA: "Jefe de Intendencia",
  SUBJEFE_INTENDENCIA: "Subjefe de Intendencia",
  JEFE_COMUNICACIONES: "Jefe de Comunicaciones",
  SUBJEFE_COMUNICACIONES: "Subjefe de Comunicaciones",
  JEFE_FDOC: "Jefe de FDoc",
  SUBJEFE_FDOC: "Subjefe de FDoc",
  JEFE_MILICIANOS: "Jefe de Milicianos",
  JEFE_AGRUP_MASCULINA: "Jefe Agrup. Masculina",
  JEFE_AGRUP_FEMENINA: "Jefe Agrup. Femenina",
  JEFE_SECCION: "Jefe de Sección",
  SUBJEFE_SECCION: "Subjefe de Sección",
};

// ─── Ítems de navegación ─────────────────────────────────────────────────────

interface NavItem {
  label: string;
  href: string;
  modulo: Modulo;
  Icon: React.ElementType;
  soloAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", modulo: "DASHBOARD", Icon: LayoutDashboard },
  { label: "Comunicación", href: "/comunicacion", modulo: "COMUNICACION", Icon: MessageSquare },
  { label: "Calendario", href: "/calendario", modulo: "CALENDARIO", Icon: Calendar },
  { label: "Formación", href: "/formacion", modulo: "FORMACION", Icon: BookOpen },
  { label: "Miembros", href: "/miembros", modulo: "MIEMBROS", Icon: Users },
  { label: "Intendencia", href: "/intendencia", modulo: "INTENDENCIA", Icon: Package },
  { label: "Secciones", href: "/secciones", modulo: "SECCIONES", Icon: GitBranch },
  { label: "Reportes", href: "/reportes", modulo: "REPORTES", Icon: BarChart2 },
  { label: "Admin", href: "/admin", modulo: "ADMIN", Icon: Settings, soloAdmin: true },
];

// ─── Componente ───────────────────────────────────────────────────────────────

export default function Sidebar() {
  const usuario = useUsuario();
  const pathname = usePathname();
  const router = useRouter();

  const itemsVisibles = NAV_ITEMS.filter((item) => {
    if (item.soloAdmin && usuario.rol !== "JEFE_RUCA") return false;
    return checkPermiso(usuario.rol, item.modulo, "ver");
  });

  async function handleLogout() {
    const supabase = createClientComponentClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="hidden md:flex h-screen w-60 flex-col border-r border-ruca-gray-light bg-ruca-black">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-6">
        <Image
          src="/logo-ruca-tucun.png"
          alt="Logo Ruca Tucún"
          width={32}
          height={32}
        />
        <span className="text-lg font-bold tracking-wide text-white">Ruca Tucún</span>
      </div>

      {/* Navegación */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {itemsVisibles.map(({ label, href, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-ruca-yellow text-ruca-black"
                  : "text-zinc-400 hover:bg-ruca-gray hover:text-white",
              ].join(" ")}
            >
              <Icon size={18} strokeWidth={isActive ? 2.5 : 2} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Usuario + logout */}
      <div className="border-t border-ruca-gray-light p-4">
        <div className="mb-3 flex items-center justify-between gap-2 min-w-0">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">
              {usuario.nombre} {usuario.apellido}
            </p>
            <p className="truncate text-xs text-zinc-500">
              {LABEL_ROL[usuario.rol] ?? usuario.rol}
            </p>
          </div>
          <CampanaNotificaciones />
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-500 transition-colors hover:bg-ruca-gray hover:text-white"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
