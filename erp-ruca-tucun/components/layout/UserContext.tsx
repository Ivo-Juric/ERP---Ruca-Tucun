"use client";

import { createContext, useContext } from "react";
import type { Rol, EstadoUsuario } from "@prisma/client";

// Tipo serializable del usuario (sin Date objects — se pasan desde Server Component)
export interface UsuarioContexto {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  rol: Rol;
  estado: EstadoUsuario;
  seccion_id: string | null;
  departamento_id: string | null;
  seccion: {
    id: string;
    nombre: string;
    agrupacion: {
      id: string;
      nombre: string;
    };
  } | null;
  departamento: {
    id: string;
    nombre: string;
  } | null;
}

const UserContext = createContext<UsuarioContexto | null>(null);

export function UserProvider({
  usuario,
  children,
}: {
  usuario: UsuarioContexto;
  children: React.ReactNode;
}) {
  return <UserContext.Provider value={usuario}>{children}</UserContext.Provider>;
}

export function useUsuario(): UsuarioContexto {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUsuario debe usarse dentro de UserProvider");
  return ctx;
}
