"use client";

import { useState } from "react";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useUsuario } from "./UserContext";
import Sidebar from "./Sidebar";
import CampanaNotificaciones from "./CampanaNotificaciones";

export default function TopBar() {
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
          type="button"
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
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="text-zinc-400 hover:text-white"
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        {/* Logo centrado */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <Image
            src="/logo-ruca-tucun.png"
            alt="Logo Ruca Tucún"
            width={28}
            height={28}
          />
          <span className="text-base font-bold tracking-wide text-white">Ruca Tucún</span>
        </div>

        {/* Notificaciones */}
        <CampanaNotificaciones />
      </header>
    </>
  );
}
