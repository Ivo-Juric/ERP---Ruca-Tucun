"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual, checkPermiso } from "@/lib/auth";
import { CategoriaAnuncio, Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type CanalConAcceso = {
  id: string;
  canal_id: string;
  puede_escribir: boolean;
  canal: {
    id: string;
    nombre: string;
    descripcion: string | null;
    tipo: string;
  };
  ultimo_mensaje: {
    contenido: string;
    creado_en: string;
    autor_nombre: string;
  } | null;
};

export type MensajeItem = {
  id: string;
  contenido: string;
  canal_id: string;
  autor_id: string;
  creado_en: string;
  autor: {
    id: string;
    nombre: string;
    apellido: string;
    foto_url: string | null;
  };
};

export type MensajeDMItem = {
  id: string;
  contenido: string;
  emisor_id: string;
  receptor_id: string;
  leido: boolean;
  creado_en: string;
  emisor: { id: string; nombre: string; apellido: string; foto_url: string | null };
  receptor: { id: string; nombre: string; apellido: string; foto_url: string | null };
};

export type ConversacionDM = {
  interlocutor_id: string;
  nombre: string;
  apellido: string;
  foto_url: string | null;
  ultimo_mensaje: string;
  ultimo_mensaje_en: string;
  no_leidos: number;
};

export type AnuncioItem = {
  id: string;
  titulo: string;
  contenido: string;
  categoria: CategoriaAnuncio;
  fijado: boolean;
  creado_en: string;
  autor: { nombre: string; apellido: string };
};

export type CircularItem = {
  id: string;
  titulo: string;
  contenido: string;
  enviada: boolean;
  programada_para: string | null;
  creado_en: string;
  autor: { id: string; nombre: string; apellido: string };
  lecturas_count: number;
  yo_lei: boolean;
};

export type UsuarioBasico = {
  id: string;
  nombre: string;
  apellido: string;
  rol: string;
  foto_url: string | null;
  seccion: { nombre: string } | null;
};

// ─── Roles con permisos especiales ──────────────────────────────────────────

const ROLES_TABLON: Rol[] = ["JEFE_RUCA", "SECRETARIO", "JEFE_COMUNICACIONES"];

const ROLES_CIRCULAR: Rol[] = [
  "JEFE_RUCA",
  "SECRETARIO",
  "JEFE_COMUNICACIONES",
  "SUBJEFE_COMUNICACIONES",
];

// ─── Canales ─────────────────────────────────────────────────────────────────

export async function obtenerCanalesDelUsuario(): Promise<
  ActionResult<CanalConAcceso[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "COMUNICACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  try {
    const miembroCanales = await prisma.miembroCanal.findMany({
      where: { usuario_id: usuario.id },
      include: {
        canal: {
          include: {
            mensajes: {
              orderBy: { creado_en: "desc" },
              take: 1,
              include: {
                autor: { select: { nombre: true, apellido: true } },
              },
            },
          },
        },
      },
    });

    return {
      ok: true,
      data: miembroCanales.map((mc) => {
        const ultimo = mc.canal.mensajes[0] ?? null;
        return {
          id: mc.id,
          canal_id: mc.canal_id,
          puede_escribir: mc.puede_escribir,
          canal: {
            id: mc.canal.id,
            nombre: mc.canal.nombre,
            descripcion: mc.canal.descripcion,
            tipo: mc.canal.tipo,
          },
          ultimo_mensaje: ultimo
            ? {
                contenido: ultimo.contenido,
                creado_en: ultimo.creado_en.toISOString(),
                autor_nombre: `${ultimo.autor.nombre} ${ultimo.autor.apellido}`,
              }
            : null,
        };
      }),
    };
  } catch {
    return { ok: false, error: "Error al obtener canales." };
  }
}

export async function obtenerMensajes(
  canal_id: string,
): Promise<ActionResult<MensajeItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const acceso = await prisma.miembroCanal.findUnique({
    where: { canal_id_usuario_id: { canal_id, usuario_id: usuario.id } },
  });
  if (!acceso) return { ok: false, error: "Sin acceso a este canal." };

  try {
    const mensajes = await prisma.mensaje.findMany({
      where: { canal_id },
      include: {
        autor: {
          select: { id: true, nombre: true, apellido: true, foto_url: true },
        },
      },
      orderBy: { creado_en: "asc" },
      take: 100,
    });

    return {
      ok: true,
      data: mensajes.map((m) => ({
        ...m,
        creado_en: m.creado_en.toISOString(),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener mensajes." };
  }
}

export async function enviarMensaje(
  canal_id: string,
  contenido: string,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "El mensaje no puede estar vacío." };

  const acceso = await prisma.miembroCanal.findUnique({
    where: { canal_id_usuario_id: { canal_id, usuario_id: usuario.id } },
  });
  if (!acceso) return { ok: false, error: "Sin acceso a este canal." };
  if (!acceso.puede_escribir)
    return { ok: false, error: "Este canal es de solo lectura para vos." };

  try {
    const mensaje = await prisma.mensaje.create({
      data: { contenido: texto, canal_id, autor_id: usuario.id },
      select: { id: true },
    });
    return { ok: true, data: { id: mensaje.id } };
  } catch {
    return { ok: false, error: "Error al enviar el mensaje." };
  }
}

// ─── Mensajes directos ────────────────────────────────────────────────────────

export async function obtenerConversaciones(): Promise<
  ActionResult<ConversacionDM[]>
> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const mensajes = await prisma.mensajeDirecto.findMany({
      where: {
        OR: [{ emisor_id: usuario.id }, { receptor_id: usuario.id }],
      },
      include: {
        emisor: {
          select: { id: true, nombre: true, apellido: true, foto_url: true },
        },
        receptor: {
          select: { id: true, nombre: true, apellido: true, foto_url: true },
        },
      },
      orderBy: { creado_en: "desc" },
      take: 300,
    });

    const convMap = new Map<string, ConversacionDM>();
    for (const m of mensajes) {
      const interlocutor = m.emisor_id === usuario.id ? m.receptor : m.emisor;
      if (!convMap.has(interlocutor.id)) {
        const noLeidos = mensajes.filter(
          (x) =>
            x.emisor_id === interlocutor.id &&
            x.receptor_id === usuario.id &&
            !x.leido,
        ).length;
        convMap.set(interlocutor.id, {
          interlocutor_id: interlocutor.id,
          nombre: interlocutor.nombre,
          apellido: interlocutor.apellido,
          foto_url: interlocutor.foto_url,
          ultimo_mensaje: m.contenido,
          ultimo_mensaje_en: m.creado_en.toISOString(),
          no_leidos: noLeidos,
        });
      }
    }

    return { ok: true, data: Array.from(convMap.values()) };
  } catch {
    return { ok: false, error: "Error al obtener conversaciones." };
  }
}

export async function obtenerMensajesDirectos(
  interlocutor_id: string,
): Promise<ActionResult<MensajeDMItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    // Marcar como leídos los mensajes recibidos de este interlocutor
    await prisma.mensajeDirecto.updateMany({
      where: {
        emisor_id: interlocutor_id,
        receptor_id: usuario.id,
        leido: false,
      },
      data: { leido: true },
    });

    const mensajes = await prisma.mensajeDirecto.findMany({
      where: {
        OR: [
          { emisor_id: usuario.id, receptor_id: interlocutor_id },
          { emisor_id: interlocutor_id, receptor_id: usuario.id },
        ],
      },
      include: {
        emisor: {
          select: { id: true, nombre: true, apellido: true, foto_url: true },
        },
        receptor: {
          select: { id: true, nombre: true, apellido: true, foto_url: true },
        },
      },
      orderBy: { creado_en: "asc" },
      take: 100,
    });

    return {
      ok: true,
      data: mensajes.map((m) => ({
        ...m,
        creado_en: m.creado_en.toISOString(),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener mensajes directos." };
  }
}

export async function enviarMensajeDirecto(
  receptor_id: string,
  contenido: string,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  const texto = contenido.trim();
  if (!texto) return { ok: false, error: "El mensaje no puede estar vacío." };
  if (receptor_id === usuario.id)
    return { ok: false, error: "No podés enviarte mensajes a vos mismo." };

  const receptor = await prisma.usuario.findUnique({
    where: { id: receptor_id, estado: "ACTIVO" },
    select: { id: true },
  });
  if (!receptor) return { ok: false, error: "Usuario no encontrado." };

  try {
    const mensaje = await prisma.mensajeDirecto.create({
      data: { contenido: texto, emisor_id: usuario.id, receptor_id },
      select: { id: true },
    });
    return { ok: true, data: { id: mensaje.id } };
  } catch {
    return { ok: false, error: "Error al enviar el mensaje." };
  }
}

export async function obtenerUsuarios(): Promise<ActionResult<UsuarioBasico[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    const usuarios = await prisma.usuario.findMany({
      where: { id: { not: usuario.id }, estado: "ACTIVO" },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        rol: true,
        foto_url: true,
        seccion: { select: { nombre: true } },
      },
      orderBy: [{ apellido: "asc" }, { nombre: "asc" }],
    });
    return { ok: true, data: usuarios };
  } catch {
    return { ok: false, error: "Error al obtener usuarios." };
  }
}

// ─── Tablón ───────────────────────────────────────────────────────────────────

export async function obtenerAnuncios(): Promise<ActionResult<AnuncioItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "COMUNICACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  try {
    const anuncios = await prisma.anuncio.findMany({
      where: { activo: true },
      include: { autor: { select: { nombre: true, apellido: true } } },
      orderBy: [{ fijado: "desc" }, { creado_en: "desc" }],
    });

    return {
      ok: true,
      data: anuncios.map((a) => ({
        ...a,
        creado_en: a.creado_en.toISOString(),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener anuncios." };
  }
}

export async function publicarAnuncio(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_TABLON.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para publicar anuncios." };

  const titulo = (formData.get("titulo") as string | null)?.trim() ?? "";
  const contenido = (formData.get("contenido") as string | null)?.trim() ?? "";
  const categoriaRaw = (formData.get("categoria") as string | null) ?? "INFORMATIVO";
  const fijado = formData.get("fijado") === "true";

  if (!titulo) return { ok: false, error: "El título es requerido." };
  if (!contenido) return { ok: false, error: "El contenido es requerido." };

  const categoria = Object.values(CategoriaAnuncio).includes(
    categoriaRaw as CategoriaAnuncio,
  )
    ? (categoriaRaw as CategoriaAnuncio)
    : CategoriaAnuncio.INFORMATIVO;

  try {
    const anuncio = await prisma.anuncio.create({
      data: {
        titulo,
        contenido,
        categoria,
        fijado,
        autor_id: usuario.id,
        activo: true,
      },
      select: { id: true },
    });
    revalidatePath("/comunicacion/tablon");
    return { ok: true, data: { id: anuncio.id } };
  } catch {
    return { ok: false, error: "Error al publicar el anuncio." };
  }
}

// ─── Circulares ───────────────────────────────────────────────────────────────

export async function obtenerCirculares(): Promise<ActionResult<CircularItem[]>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!checkPermiso(usuario.rol, "COMUNICACION", "ver"))
    return { ok: false, error: "Sin permiso." };

  try {
    const where = ROLES_CIRCULAR.includes(usuario.rol) ? {} : { enviada: true };

    const circulares = await prisma.circular.findMany({
      where,
      include: {
        autor: { select: { id: true, nombre: true, apellido: true } },
        lecturas: { select: { usuario_id: true } },
      },
      orderBy: { creado_en: "desc" },
    });

    return {
      ok: true,
      data: circulares.map((c) => ({
        id: c.id,
        titulo: c.titulo,
        contenido: c.contenido,
        enviada: c.enviada,
        programada_para: c.programada_para?.toISOString() ?? null,
        creado_en: c.creado_en.toISOString(),
        autor: c.autor,
        lecturas_count: c.lecturas.length,
        yo_lei: c.lecturas.some((l) => l.usuario_id === usuario.id),
      })),
    };
  } catch {
    return { ok: false, error: "Error al obtener circulares." };
  }
}

export async function crearCircular(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };
  if (!ROLES_CIRCULAR.includes(usuario.rol))
    return { ok: false, error: "Sin permiso para crear circulares." };

  const titulo = (formData.get("titulo") as string | null)?.trim() ?? "";
  const contenido = (formData.get("contenido") as string | null)?.trim() ?? "";
  const programadaParaStr =
    (formData.get("programada_para") as string | null)?.trim() || null;

  if (!titulo) return { ok: false, error: "El título es requerido." };
  if (!contenido) return { ok: false, error: "El contenido es requerido." };

  const programada_para =
    programadaParaStr && !isNaN(Date.parse(programadaParaStr))
      ? new Date(programadaParaStr)
      : null;

  // SUBJEFE_COMUNICACIONES siempre queda pendiente de aprobación
  const enviada = usuario.rol !== "SUBJEFE_COMUNICACIONES";

  try {
    const circular = await prisma.circular.create({
      data: {
        titulo,
        contenido,
        autor_id: usuario.id,
        programada_para,
        enviada,
      },
      select: { id: true },
    });
    revalidatePath("/comunicacion/circulares");
    return { ok: true, data: { id: circular.id } };
  } catch {
    return { ok: false, error: "Error al crear la circular." };
  }
}

export async function marcarCircularLeida(
  circular_id: string,
): Promise<ActionResult<undefined>> {
  const usuario = await getUsuarioActual();
  if (!usuario) return { ok: false, error: "No autenticado." };

  try {
    await prisma.lecturaCircular.upsert({
      where: {
        circular_id_usuario_id: { circular_id, usuario_id: usuario.id },
      },
      create: { circular_id, usuario_id: usuario.id },
      update: { leido_en: new Date() },
    });
    revalidatePath("/comunicacion/circulares");
    return { ok: true, data: undefined };
  } catch {
    return { ok: false, error: "Error al marcar como leída." };
  }
}
