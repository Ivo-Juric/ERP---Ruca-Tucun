"use server";

import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import type { Rol } from "@prisma/client";

// ─── Tipos ───────────────────────────────────────────────────────────────────

export type SeccionCard = {
  id: string;
  nombre: string;
  patrono: string;
  nivel_escolar_desde: number;
  nivel_escolar_hasta: number;
  agrupacion_id: string;
  jefe_actual: { nombre: string; apellido: string } | null;
  miembros_activos: number;
};

export type AgrupacionConSecciones = {
  id: string;
  nombre: string;
  patrono: string;
  tipo: "MASCULINA" | "FEMENINA" | "MILICIANOS";
  secciones: SeccionCard[];
};

export type DepartamentoBasico = {
  id: string;
  nombre: string;
  descripcion: string | null;
  miembros_count: number;
};

export type OrganigramaData = {
  agrupaciones: AgrupacionConSecciones[];
  departamentos: DepartamentoBasico[];
};

export type JefeActual = {
  id: string;
  nombre: string;
  apellido: string;
  rol: Rol;
  foto_url: string | null;
};

export type SeccionDetalle = {
  id: string;
  nombre: string;
  patrono: string;
  nivel_escolar_desde: number;
  nivel_escolar_hasta: number;
  agrupacion: { nombre: string; tipo: string };
  jefes: JefeActual[];
  miembros_activos: number;
  sesiones_fdoc_este_anio: number;
  porcentaje_asistencia_promedio: number | null;
};

// ─── Acciones ─────────────────────────────────────────────────────────────────

export async function obtenerOrganigrama(): Promise<OrganigramaData> {
  const [agrupaciones, departamentos, usuarios, miembros] = await Promise.all([
    prisma.agrupacion.findMany({
      include: {
        secciones: {
          orderBy: { nombre: "asc" },
        },
      },
      orderBy: { nombre: "asc" },
    }),
    prisma.departamento.findMany({ orderBy: { nombre: "asc" } }),
    prisma.usuario.findMany({
      where: { rol: { in: ["JEFE_SECCION", "SUBJEFE_SECCION"] }, estado: "ACTIVO" },
      select: { id: true, nombre: true, apellido: true, rol: true, seccion_id: true },
    }),
    prisma.miembro.groupBy({
      by: ["seccion_id"],
      where: { estado: "ACTIVO" },
      _count: { id: true },
    }),
    prisma.usuario.groupBy({
      by: ["departamento_id"],
      where: { estado: "ACTIVO", departamento_id: { not: null } },
      _count: { id: true },
    }),
  ]);

  const miembrosPorSeccion = new Map(
    miembros.map((m) => [m.seccion_id, m._count.id]),
  );
  const jefePorSeccion = new Map(
    usuarios
      .filter((u) => u.rol === "JEFE_SECCION" && u.seccion_id)
      .map((u) => [u.seccion_id!, u]),
  );

  const [, , , , usuariosPorDepto] = await Promise.all([
    Promise.resolve(agrupaciones),
    Promise.resolve(departamentos),
    Promise.resolve(usuarios),
    Promise.resolve(miembros),
    prisma.usuario.groupBy({
      by: ["departamento_id"],
      where: { estado: "ACTIVO", departamento_id: { not: null } },
      _count: { id: true },
    }),
  ]);

  const deptoCount = new Map(
    usuariosPorDepto.map((u) => [u.departamento_id!, u._count.id]),
  );

  return {
    agrupaciones: agrupaciones.map((agr) => ({
      id: agr.id,
      nombre: agr.nombre,
      patrono: agr.patrono,
      tipo: agr.tipo,
      secciones: agr.secciones.map((sec) => ({
        id: sec.id,
        nombre: sec.nombre,
        patrono: sec.patrono,
        nivel_escolar_desde: sec.nivel_escolar_desde,
        nivel_escolar_hasta: sec.nivel_escolar_hasta,
        agrupacion_id: sec.agrupacion_id,
        jefe_actual: jefePorSeccion.get(sec.id) ?? null,
        miembros_activos: miembrosPorSeccion.get(sec.id) ?? 0,
      })),
    })),
    departamentos: departamentos.map((d) => ({
      id: d.id,
      nombre: d.nombre,
      descripcion: d.descripcion,
      miembros_count: deptoCount.get(d.id) ?? 0,
    })),
  };
}

export async function obtenerSeccionDetalle(
  id: string,
): Promise<SeccionDetalle | null> {
  const anioActual = new Date().getFullYear();

  const [seccion, jefes, miembrosActivos, sesionesFDoc, asistencias] =
    await Promise.all([
      prisma.seccion.findUnique({
        where: { id },
        include: { agrupacion: true },
      }),
      prisma.usuario.findMany({
        where: {
          seccion_id: id,
          rol: { in: ["JEFE_SECCION", "SUBJEFE_SECCION"] },
          estado: "ACTIVO",
        },
        select: { id: true, nombre: true, apellido: true, rol: true, foto_url: true },
        orderBy: { rol: "asc" },
      }),
      prisma.miembro.count({ where: { seccion_id: id, estado: "ACTIVO" } }),
      prisma.sesionFDoc.count({
        where: {
          seccion_id: id,
          fecha: {
            gte: new Date(`${anioActual}-01-01`),
            lte: new Date(`${anioActual}-12-31`),
          },
        },
      }),
      prisma.asistencia.findMany({
        where: {
          actividad: {
            seccion_id: id,
            estado: "REALIZADA",
            fecha_inicio: {
              gte: new Date(`${anioActual}-01-01`),
            },
          },
        },
        select: { presente: true },
      }),
    ]);

  if (!seccion) return null;

  const totalAsistencias = asistencias.length;
  const presentes = asistencias.filter((a) => a.presente).length;
  const porcentaje =
    totalAsistencias > 0
      ? Math.round((presentes / totalAsistencias) * 100)
      : null;

  return {
    id: seccion.id,
    nombre: seccion.nombre,
    patrono: seccion.patrono,
    nivel_escolar_desde: seccion.nivel_escolar_desde,
    nivel_escolar_hasta: seccion.nivel_escolar_hasta,
    agrupacion: { nombre: seccion.agrupacion.nombre, tipo: seccion.agrupacion.tipo },
    jefes,
    miembros_activos: miembrosActivos,
    sesiones_fdoc_este_anio: sesionesFDoc,
    porcentaje_asistencia_promedio: porcentaje,
  };
}
