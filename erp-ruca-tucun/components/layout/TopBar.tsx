"use client";

import { useState } from "react";
import { Bell, Menu, X } from "lucide-react";
import { useUsuario } from "./UserContext";
import Sidebar from "./Sidebar";

interface TopBarProps {
  notificacionesSinLeer?: number;
}

function EstrellaSVG() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <polygon
        points="50,5 61,35 95,35 68,57 79,91 50,70 21,91 32,57 5,35 39,35"
        fill="#D4B000"
      />
      <polygon
        points="50,2 59,32 90,32 66,52 76,84 50,66 24,84 34,52 10,32 41,32"
        fill="#D4B000"
        transform="rotate(22.5 50 50)"
      />
    </svg>
  );
}

export default function TopBar({ notificacionesSinLeer = 0 }: TopBarProps) {
  useUsuario(); // valida contexto
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Overlay del drawer mobile */}
      {drawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setDrawerOpen(false)}
        />
      )}

      {/* Drawer lateral mobile */}
      <div
        className={[
          "fixed left-0 top-0 z-50 h-full w-64 transform bg-ruca-black transition-transform duration-300 md:hidden",
          drawerOpen ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <button
          onClick={() => setDrawerOpen(false)}
          className="absolute right-3 top-4 text-zinc-500 hover:text-white"
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
        {/* Reutilizamos Sidebar — su CSS `hidden md:flex` aplica solo en ≥md,
            pero dentro del drawer necesitamos que se muestre siempre */}
        <div className="flex h-full w-full flex-col [&>aside]:flex [&>aside]:h-full [&>aside]:w-full">
          <Sidebar />
        </div>
      </div>

      {/* Barra superior — solo mobile */}
      <header className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center border-b border-ruca-gray-light bg-ruca-black px-4 md:hidden">
        {/* Hamburguesa */}
        <button
          onClick={() => setDrawerOpen(true)}
          className="text-zinc-400 hover:text-white"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        {/* Logo centrado */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <EstrellaSVG />
          <span className="text-base font-bold tracking-wide text-white">Ruca Tucún</span>
        </div>

        {/* Notificaciones */}
        <div className="relative">
          <button className="text-zinc-400 hover:text-white" aria-label="Notificaciones">
            <Bell size={22} />
          </button>
          {notificacionesSinLeer > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-ruca-yellow px-1 text-[10px] font-bold text-ruca-black">
              {notificacionesSinLeer > 99 ? "99+" : notificacionesSinLeer}
            </span>
          )}
        </div>
      </header>
    </>
  );
}
