"use client";
// Nota: página Cliente que carga datos vía server actions.
// El guard de JEFE_RUCA se valida en cada action del servidor.

import { useEffect, useState, useTransition } from "react";
import { ShieldCheck, Ban, RefreshCw, KeyRound } from "lucide-react";
import {
  obtenerUsuarios,
  obtenerOpcionesFormulario,
  suspenderUsuario,
  reactivarUsuario,
  restablecerContrasena,
} from "./actions";
import FormularioUsuario from "@/components/modulos/admin/FormularioUsuario";
import type {
  UsuarioAdmin,
  SeccionOpcion,
  DepartamentoOpcion,
} from "./actions";
import type { Rol } from "@prisma/client";

const ROL_LABEL: Record<Rol, string> = {
  JEFE_RUCA: "Jefe de Ruca",
  SECRETARIO: "Secretario",
  JEFE_INTENDENCIA: "Jefe Intendencia",
  SUBJEFE_INTENDENCIA: "Subjefe Intendencia",
  JEFE_COMUNICACIONES: "Jefe Comunicaciones",
  SUBJEFE_COMUNICACIONES: "Subjefe Comunicaciones",
  JEFE_FDOC: "Jefe FDoc",
  SUBJEFE_FDOC: "Subjefe FDoc",
  JEFE_MILICIANOS: "Jefe Milicianos",
  JEFE_AGRUP_MASCULINA: "Jefe Agrup. Masculina",
  JEFE_AGRUP_FEMENINA: "Jefe Agrup. Femenina",
  JEFE_SECCION: "Jefe de Sección",
  SUBJEFE_SECCION: "Subjefe de Sección",
};

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/40 text-green-300",
  INACTIVO: "bg-zinc-800 text-zinc-400",
  SUSPENDIDO: "bg-red-900/40 text-red-300",
};

function AccionesUsuario({
  usuario,
  onActualizar,
}: {
  usuario: UsuarioAdmin;
  onActualizar: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const [mensajeOk, setMensajeOk] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function ejecutar(
    fn: () => Promise<{ ok: boolean; error?: string }>,
    mensajeExito: string,
  ) {
    setError(null);
    setMensajeOk(null);
    startTransition(async () => {
      const res = await fn();
      if (res.ok) {
        setMensajeOk(mensajeExito);
        onActualizar();
        setTimeout(() => setMensajeOk(null), 3000);
      } else {
        setError(res.error ?? "Error.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-1">
        {/* Suspender / Reactivar */}
        {usuario.estado === "ACTIVO" ? (
          <button
            onClick={() =>
              ejecutar(
                () =>
                  suspenderUsuario(usuario.id).then((r) => ({
                    ok: r.ok,
                    error: r.ok ? undefined : r.error,
                  })),
                "Usuario suspendido.",
              )
            }
            type="button"
            disabled={isPending}
            title="Suspender usuario"
            className="flex items-center gap-1 rounded-lg border border-red-700/50 px-2 py-1.5 text-xs text-red-400 hover:bg-red-900/20 disabled:opacity-50"
          >
            <Ban size={12} />
            Suspender
          </button>
        ) : (
          <button
            onClick={() =>
              ejecutar(
                () =>
                  reactivarUsuario(usuario.id).then((r) => ({
                    ok: r.ok,
                    error: r.ok ? undefined : r.error,
                  })),
                "Usuario reactivado.",
              )
            }
            type="button"
            disabled={isPending}
            title="Reactivar usuario"
            className="flex items-center gap-1 rounded-lg border border-green-700/50 px-2 py-1.5 text-xs text-green-400 hover:bg-green-900/20 disabled:opacity-50"
          >
            <RefreshCw size={12} />
            Reactivar
          </button>
        )}

        {/* Restablecer contraseña */}
        <button
          onClick={() =>
            ejecutar(
              () =>
                restablecerContrasena(usuario.email).then((r) => ({
                  ok: r.ok,
                  error: r.ok ? undefined : r.error,
                })),
              "Email de recuperación enviado.",
            )
          }
          type="button"
          disabled={isPending}
          title="Restablecer contraseña"
          className="flex items-center gap-1 rounded-lg border border-ruca-gray-light px-2 py-1.5 text-xs text-gray-400 hover:text-white disabled:opacity-50"
        >
          <KeyRound size={12} />
          Restablecer
        </button>
      </div>

      {mensajeOk && (
        <p className="text-xs text-green-400">{mensajeOk}</p>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export default function AdminPage() {
  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [secciones, setSecciones] = useState<SeccionOpcion[]>([]);
  const [departamentos, setDepartamentos] = useState<DepartamentoOpcion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState("");

  async function cargar() {
    setCargando(true);
    const [usuariosRes, opciones] = await Promise.all([
      obtenerUsuarios(),
      obtenerOpcionesFormulario(),
    ]);

    if (usuariosRes.ok) {
      setUsuarios(usuariosRes.data);
    } else {
      setError(usuariosRes.error);
    }

    setSecciones(opciones.secciones);
    setDepartamentos(opciones.departamentos);
    setCargando(false);
  }

  useEffect(() => {
    void cargar();
  }, []);

  const usuariosFiltrados = usuarios.filter((u) => {
    const q = filtro.toLowerCase();
    return (
      u.nombre.toLowerCase().includes(q) ||
      u.apellido.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      ROL_LABEL[u.rol].toLowerCase().includes(q)
    );
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-ruca-yellow" />
          <h1 className="text-2xl font-bold text-white">Administración</h1>
        </div>
        <FormularioUsuario
          secciones={secciones}
          departamentos={departamentos}
        />
      </div>

      {error && (
        <div className="rounded-xl bg-red-900/20 p-4 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Búsqueda */}
      <input
        type="text"
        placeholder="Buscar por nombre, email o rol..."
        value={filtro}
        onChange={(e) => setFiltro(e.target.value)}
        className="w-full rounded-xl border border-ruca-gray-light bg-ruca-black px-4 py-2.5 text-sm text-white placeholder:text-gray-600 focus:border-ruca-yellow focus:outline-none"
      />

      {/* Tabla */}
      {cargando ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-12 text-center text-sm text-gray-500">
          Cargando usuarios...
        </div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="rounded-xl border border-ruca-gray-light bg-ruca-gray p-12 text-center text-sm text-gray-500">
          {filtro ? "Sin resultados para esa búsqueda." : "No hay usuarios registrados."}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ruca-gray-light">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ruca-gray-light bg-ruca-gray-light text-left">
                <th className="px-4 py-3 font-semibold text-gray-300">Usuario</th>
                <th className="px-4 py-3 font-semibold text-gray-300">Rol</th>
                <th className="px-4 py-3 font-semibold text-gray-300">
                  Sección / Dpto.
                </th>
                <th className="px-4 py-3 font-semibold text-gray-300">Estado</th>
                <th className="px-4 py-3 font-semibold text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {usuariosFiltrados.map((u, i) => (
                <tr
                  key={u.id}
                  className={`border-b border-ruca-gray-light/50 ${
                    i % 2 === 0 ? "bg-ruca-black" : "bg-ruca-gray/30"
                  } ${u.estado === "SUSPENDIDO" ? "opacity-60" : ""}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-ruca-gray text-xs font-bold text-ruca-yellow">
                        {u.nombre[0]}
                        {u.apellido[0]}
                      </div>
                      <div>
                        <p className="font-medium text-white">
                          {u.apellido}, {u.nombre}
                        </p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-300">
                    {ROL_LABEL[u.rol]}
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {u.seccion?.nombre ?? u.departamento?.nombre ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${ESTADO_BADGE[u.estado]}`}
                    >
                      {u.estado.charAt(0) + u.estado.slice(1).toLowerCase()}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <AccionesUsuario usuario={u} onActualizar={cargar} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-right text-xs text-gray-600">
        {usuariosFiltrados.length} de {usuarios.length} usuarios
      </p>
    </div>
  );
}
