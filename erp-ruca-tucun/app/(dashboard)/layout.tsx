import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { UserProvider, type UsuarioContexto } from "@/components/layout/UserContext";
import Sidebar from "@/components/layout/Sidebar";
import TopBar from "@/components/layout/TopBar";
import BottomNav from "@/components/layout/BottomNav";
import RealtimeProvider from "@/components/layout/RealtimeProvider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const usuario = await getUsuarioActual();

  if (!usuario) {
    redirect("/login");
  }

  // Serializar el usuario para el contexto cliente (quitar fechas no serializables)
  const usuarioContexto: UsuarioContexto = {
    id: usuario.id,
    email: usuario.email,
    nombre: usuario.nombre,
    apellido: usuario.apellido,
    foto_url: usuario.foto_url,
    rol: usuario.rol,
    estado: usuario.estado,
    seccion_id: usuario.seccion_id,
    departamento_id: usuario.departamento_id,
    seccion: usuario.seccion
      ? {
          id: usuario.seccion.id,
          nombre: usuario.seccion.nombre,
          agrupacion: {
            id: usuario.seccion.agrupacion.id,
            nombre: usuario.seccion.agrupacion.nombre,
          },
        }
      : null,
    departamento: usuario.departamento
      ? {
          id: usuario.departamento.id,
          nombre: usuario.departamento.nombre,
        }
      : null,
  };

  return (
    <UserProvider usuario={usuarioContexto}>
      <RealtimeProvider userId={usuario.id}>
      <div className="flex min-h-screen bg-ruca-black">
        {/* Sidebar — solo desktop */}
        <Sidebar />

        {/* Contenido principal */}
        <div className="flex flex-1 flex-col">
          {/* TopBar — solo mobile */}
          <TopBar />

          {/* Página */}
          <main className="flex-1 overflow-y-auto px-4 py-6 pt-20 md:px-8 md:pt-6 pb-20 md:pb-6">
            {children}
          </main>

          {/* BottomNav — solo mobile */}
          <BottomNav />
        </div>
      </div>
      </RealtimeProvider>
    </UserProvider>
  );
}
