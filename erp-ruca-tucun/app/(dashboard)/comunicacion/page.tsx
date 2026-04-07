import { redirect } from "next/navigation";
import { getUsuarioActual } from "@/lib/auth";
import { obtenerCanalesDelUsuario, obtenerConversaciones } from "./actions";
import ComunicacionLayout from "@/components/modulos/comunicacion/ComunicacionLayout";

export default async function ComunicacionPage() {
  const usuario = await getUsuarioActual();
  if (!usuario) redirect("/login");

  const [canalesRes, conversacionesRes] = await Promise.all([
    obtenerCanalesDelUsuario(),
    obtenerConversaciones(),
  ]);

  return (
    <ComunicacionLayout
      canalesIniciales={canalesRes.ok ? canalesRes.data : []}
      conversacionesIniciales={conversacionesRes.ok ? conversacionesRes.data : []}
      usuarioId={usuario.id}
      usuarioNombre={usuario.nombre}
      usuarioApellido={usuario.apellido}
      usuarioFoto={usuario.foto_url}
    />
  );
}
