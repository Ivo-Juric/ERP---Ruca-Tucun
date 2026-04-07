import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { crearNotificacion } from "@/lib/notificaciones";

// ─── Guard: Bearer token ──────────────────────────────────────────────────────

function verificarToken(req: NextRequest): boolean {
  const auth = req.headers.get("authorization");
  if (!auth) return false;
  const token = auth.replace("Bearer ", "").trim();
  return token === process.env.CRON_SECRET;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function semanaAtras(semanas: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - semanas * 7);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  if (!verificarToken(req)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const resultados: string[] = [];

  try {
    // ── 1. Miembros con asistencia < 50% en últimas 4 semanas ─────────────────

    const hace4Semanas = semanaAtras(4);

    const asistencias = await prisma.asistencia.findMany({
      where: {
        actividad: {
          estado: "REALIZADA",
          fecha_inicio: { gte: hace4Semanas },
          tipo: { in: ["SABADO", "CAMPAMENTO", "JORNADA_FORMACION"] },
        },
      },
      include: {
        miembro: {
          include: {
            seccion: {
              include: {
                usuarios: {
                  where: { rol: "JEFE_SECCION", estado: "ACTIVO" },
                  select: { id: true },
                },
              },
            },
          },
        },
      },
    });

    // Agrupar por miembro
    const porMiembro = new Map<
      string,
      { nombre: string; apellido: string; presentes: number; total: number; jefesIds: string[] }
    >();

    for (const a of asistencias) {
      const key = a.miembro_id;
      if (!porMiembro.has(key)) {
        porMiembro.set(key, {
          nombre: a.miembro.nombre,
          apellido: a.miembro.apellido,
          presentes: 0,
          total: 0,
          jefesIds: a.miembro.seccion.usuarios.map((u) => u.id),
        });
      }
      const entry = porMiembro.get(key)!;
      entry.total++;
      if (a.presente) entry.presentes++;
    }

    let alertasMiembros = 0;
    for (const datos of Array.from(porMiembro.values())) {
      if (datos.total < 2) continue; // con menos de 2 actividades no alertamos
      const pct = (datos.presentes / datos.total) * 100;
      if (pct < 50) {
        for (const jefeId of datos.jefesIds) {
          await crearNotificacion(jefeId, {
            titulo: "Asistencia baja",
            contenido: `${datos.nombre} ${datos.apellido} tiene ${Math.round(pct)}% de asistencia en las últimas 4 semanas.`,
            tipo: "ALERTA",
            url_destino: "/miembros",
          });
          alertasMiembros++;
        }
      }
    }

    resultados.push(`Asistencia baja: ${alertasMiembros} alertas creadas.`);

    // ── 2. Secciones sin sesión FDoc en últimas 3 semanas ─────────────────────

    const hace3Semanas = semanaAtras(3);

    const secciones = await prisma.seccion.findMany({
      include: {
        sesiones_fdoc: {
          where: { fecha: { gte: hace3Semanas } },
          select: { id: true },
          take: 1,
        },
      },
    });

    const seccionesSinSesion = secciones.filter(
      (s) => s.sesiones_fdoc.length === 0,
    );

    const jefesFDoc = await prisma.usuario.findMany({
      where: {
        rol: { in: ["JEFE_FDOC", "JEFE_RUCA"] },
        estado: "ACTIVO",
      },
      select: { id: true },
    });

    let alertasFDoc = 0;
    for (const seccion of seccionesSinSesion) {
      for (const jefe of jefesFDoc) {
        await crearNotificacion(jefe.id, {
          titulo: "Sin sesión FDoc",
          contenido: `La sección "${seccion.nombre}" no registró ninguna sesión de Formación Doctrinal en las últimas 3 semanas.`,
          tipo: "ALERTA",
          url_destino: `/formacion`,
        });
        alertasFDoc++;
      }
    }

    resultados.push(`FDoc sin sesión: ${alertasFDoc} alertas creadas.`);

    // ── 3. Ítems con stock bajo → Jefe de Intendencia ────────────────────────

    const items = await prisma.itemInventario.findMany();
    const itemsConStockBajo = items.filter(
      (i) => i.cantidad_disponible <= i.stock_minimo,
    );

    if (itemsConStockBajo.length > 0) {
      const jefesIntendencia = await prisma.usuario.findMany({
        where: {
          rol: { in: ["JEFE_INTENDENCIA", "JEFE_RUCA"] },
          estado: "ACTIVO",
        },
        select: { id: true },
      });

      for (const jefe of jefesIntendencia) {
        await crearNotificacion(jefe.id, {
          titulo: `Stock bajo: ${itemsConStockBajo.length} ítem${itemsConStockBajo.length !== 1 ? "s" : ""}`,
          contenido: itemsConStockBajo
            .slice(0, 3)
            .map((i) => `${i.nombre} (${i.cantidad_disponible}/${i.cantidad_total})`)
            .join(", ") + (itemsConStockBajo.length > 3 ? " y más..." : ""),
          tipo: "ALERTA",
          url_destino: "/intendencia?tab=inventario",
        });
      }

      resultados.push(
        `Stock bajo: ${itemsConStockBajo.length} ítems — ${jefesIntendencia.length} alertas creadas.`,
      );
    } else {
      resultados.push("Stock bajo: sin alertas.");
    }

    // ── 4. Jefes sin cargar actividad del próximo sábado ─────────────────────
    // Ejecutar los jueves (el cron está configurado para todos los días,
    // pero la lógica solo aplica si hoy es jueves).

    const hoy = new Date();
    const esJueves = hoy.getDay() === 4;

    if (esJueves) {
      // Calcular el próximo sábado
      const proximoSabado = new Date(hoy);
      proximoSabado.setDate(hoy.getDate() + 2);
      proximoSabado.setHours(0, 0, 0, 0);
      const sabadoFin = new Date(proximoSabado);
      sabadoFin.setHours(23, 59, 59, 999);

      const todasLasSecciones = await prisma.seccion.findMany({
        include: {
          actividades: {
            where: {
              tipo: "SABADO",
              fecha_inicio: { gte: proximoSabado, lte: sabadoFin },
            },
            select: { id: true },
            take: 1,
          },
          usuarios: {
            where: { rol: "JEFE_SECCION", estado: "ACTIVO" },
            select: { id: true, nombre: true },
          },
        },
      });

      let alertasSabado = 0;
      for (const seccion of todasLasSecciones) {
        if (seccion.actividades.length === 0) {
          for (const jefe of seccion.usuarios) {
            await crearNotificacion(jefe.id, {
              titulo: "Plan de sábado sin cargar",
              contenido: `No hay actividad cargada para el próximo sábado en "${seccion.nombre}".`,
              tipo: "ACCION_REQUERIDA",
              url_destino: "/calendario/nueva",
            });
            alertasSabado++;
          }
        }
      }

      resultados.push(`Plan sábado: ${alertasSabado} alertas creadas.`);
    } else {
      resultados.push("Plan sábado: no es jueves, omitido.");
    }

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      resultados,
    });
  } catch (error) {
    console.error("[cron/alertas]", error);
    return NextResponse.json(
      { ok: false, error: "Error interno al procesar alertas." },
      { status: 500 },
    );
  }
}
