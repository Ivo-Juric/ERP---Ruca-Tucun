import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const prisma = new PrismaClient();

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// ─── Datos ───────────────────────────────────────────────────────────────────

const AGRUPACIONES = [
  { nombre: "Agrupación Masculina", patrono: "San Jorge", tipo: "MASCULINA" as const },
  { nombre: "Agrupación Femenina", patrono: "Santa Teresa de Lisieux", tipo: "FEMENINA" as const },
  { nombre: "Milicianos", patrono: "San Miguel Arcángel", tipo: "MILICIANOS" as const },
];

const DEPARTAMENTOS = [
  { nombre: "Intendencia", descripcion: "Gestión de recursos materiales y logística del grupo" },
  { nombre: "Comunicaciones", descripcion: "Comunicación interna y publicaciones del grupo" },
  { nombre: "Formación Doctrinal", descripcion: "Planificación y seguimiento de la formación espiritual" },
];

// Secciones por agrupación (nombre_agrupacion -> secciones)
const SECCIONES_POR_AGRUPACION: Record<string, {
  nombre: string;
  patrono: string;
  nivel_escolar_desde: number;
  nivel_escolar_hasta: number;
}[]> = {
  "Agrupación Masculina": [
    { nombre: "Manada", patrono: "San Juan Bosco", nivel_escolar_desde: 1, nivel_escolar_hasta: 5 },
    { nombre: "Scout", patrono: "San Jorge", nivel_escolar_desde: 6, nivel_escolar_hasta: 9 },
    { nombre: "Caminante", patrono: "San Francisco de Asís", nivel_escolar_desde: 10, nivel_escolar_hasta: 12 },
  ],
  "Agrupación Femenina": [
    { nombre: "Brownies", patrono: "Santa Teresa del Niño Jesús", nivel_escolar_desde: 1, nivel_escolar_hasta: 5 },
    { nombre: "Guías", patrono: "Santa Bernardita", nivel_escolar_desde: 6, nivel_escolar_hasta: 9 },
    { nombre: "Pioneras", patrono: "Santa Catalina de Siena", nivel_escolar_desde: 10, nivel_escolar_hasta: 12 },
  ],
  "Milicianos": [
    { nombre: "Clan", patrono: "San Miguel Arcángel", nivel_escolar_desde: 13, nivel_escolar_hasta: 17 },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Iniciando seed del ERP Ruca Tucún...\n");

  // ── 1. Agrupaciones ────────────────────────────────────────────────────────

  console.log("📦 Creando agrupaciones...");
  const agrupacionesCreadas: Record<string, string> = {};

  for (const agr of AGRUPACIONES) {
    const existing = await prisma.agrupacion.findFirst({ where: { tipo: agr.tipo } });
    if (existing) {
      agrupacionesCreadas[agr.nombre] = existing.id;
      console.log(`  ⟳ Agrupación ya existe: ${agr.nombre}`);
      continue;
    }
    const created = await prisma.agrupacion.create({ data: agr });
    agrupacionesCreadas[agr.nombre] = created.id;
    console.log(`  ✓ Agrupación creada: ${agr.nombre}`);
  }

  // ── 2. Departamentos ───────────────────────────────────────────────────────

  console.log("\n🏢 Creando departamentos...");
  const departamentosCreados: Record<string, string> = {};

  for (const dep of DEPARTAMENTOS) {
    const existing = await prisma.departamento.findFirst({ where: { nombre: dep.nombre } });
    if (existing) {
      departamentosCreados[dep.nombre] = existing.id;
      console.log(`  ⟳ Departamento ya existe: ${dep.nombre}`);
      continue;
    }
    const created = await prisma.departamento.create({ data: dep });
    departamentosCreados[dep.nombre] = created.id;
    console.log(`  ✓ Departamento creado: ${dep.nombre}`);
  }

  // ── 3. Secciones ───────────────────────────────────────────────────────────

  console.log("\n🏷️  Creando secciones...");
  const seccionesCreadas: { id: string; nombre: string }[] = [];

  for (const [nombreAgr, secciones] of Object.entries(SECCIONES_POR_AGRUPACION)) {
    const agrupacionId = agrupacionesCreadas[nombreAgr];
    if (!agrupacionId) {
      console.warn(`  ✗ No se encontró agrupación: ${nombreAgr}`);
      continue;
    }

    for (const sec of secciones) {
      const existing = await prisma.seccion.findFirst({
        where: { nombre: sec.nombre, agrupacion_id: agrupacionId },
      });
      if (existing) {
        seccionesCreadas.push({ id: existing.id, nombre: existing.nombre });
        console.log(`  ⟳ Sección ya existe: ${sec.nombre} (${nombreAgr})`);
        continue;
      }
      const created = await prisma.seccion.create({
        data: { ...sec, agrupacion_id: agrupacionId },
      });
      seccionesCreadas.push({ id: created.id, nombre: created.nombre });
      console.log(`  ✓ Sección creada: ${sec.nombre} (${nombreAgr})`);
    }
  }

  // ── 4. Canales del sistema ─────────────────────────────────────────────────

  console.log("\n💬 Creando canales del sistema...");

  const canalesBase: { nombre: string; descripcion: string; tipo: string }[] = [
    { nombre: "general", descripcion: "Canal general del grupo", tipo: "GENERAL" },
    { nombre: "jefes-generales", descripcion: "Canal exclusivo para jefaturas", tipo: "JEFES_GENERALES" },
    { nombre: "masculina", descripcion: "Canal de la Agrupación Masculina", tipo: "AGRUPACION" },
    { nombre: "femenina", descripcion: "Canal de la Agrupación Femenina", tipo: "AGRUPACION" },
    { nombre: "milicianos", descripcion: "Canal de Milicianos", tipo: "AGRUPACION" },
    { nombre: "intendencia", descripcion: "Canal del departamento de Intendencia", tipo: "DEPARTAMENTO" },
    { nombre: "comunicaciones", descripcion: "Canal del departamento de Comunicaciones", tipo: "DEPARTAMENTO" },
  ];

  // Canales por sección
  for (const sec of seccionesCreadas) {
    canalesBase.push({
      nombre: sec.nombre.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-"),
      descripcion: `Canal de la sección ${sec.nombre}`,
      tipo: "SECCION",
    });
  }

  for (const canal of canalesBase) {
    const existing = await prisma.canal.findFirst({ where: { nombre: canal.nombre } });
    if (existing) {
      console.log(`  ⟳ Canal ya existe: #${canal.nombre}`);
      continue;
    }
    await prisma.canal.create({
      data: {
        nombre: canal.nombre,
        descripcion: canal.descripcion,
        tipo: canal.tipo as "GENERAL" | "JEFES_GENERALES" | "AGRUPACION" | "SECCION" | "DEPARTAMENTO",
      },
    });
    console.log(`  ✓ Canal creado: #${canal.nombre}`);
  }

  // ── 5. Usuario administrador ───────────────────────────────────────────────

  console.log("\n👤 Creando usuario administrador...");

  const adminEmail = "admin@rucatucun.com";
  const adminPassword = "RucaTucun2026!";

  const existingAdmin = await prisma.usuario.findUnique({ where: { email: adminEmail } });

  if (existingAdmin) {
    console.log("  ⟳ Usuario admin ya existe, omitiendo.");
  } else {
    // Crear en Supabase Auth
    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email: adminEmail,
        password: adminPassword,
        email_confirm: true,
      });

    if (authError || !authData.user) {
      console.error("  ✗ Error al crear usuario en Supabase Auth:", authError?.message);
      console.log("  ℹ  Creá el usuario manualmente en Supabase Auth y ejecutá el seed de nuevo.");
    } else {
      await prisma.usuario.create({
        data: {
          id: authData.user.id,
          email: adminEmail,
          nombre: "Administrador",
          apellido: "Ruca Tucún",
          rol: "JEFE_RUCA",
          estado: "ACTIVO",
        },
      });
      console.log(`  ✓ Usuario admin creado: ${adminEmail}`);
      console.log(`  🔑 Contraseña temporal: ${adminPassword}`);
    }
  }

  console.log("\n✅ Seed completado exitosamente.");
  console.log("\n📋 Resumen:");
  console.log(`   Agrupaciones: ${AGRUPACIONES.length}`);
  console.log(`   Departamentos: ${DEPARTAMENTOS.length}`);
  console.log(`   Secciones: ${seccionesCreadas.length}`);
  console.log(`   Canales: ${canalesBase.length}`);
}

main()
  .catch((e) => {
    console.error("❌ Error en el seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
