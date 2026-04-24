# ERP Ruca Tucún

Sistema de gestión interna de **Ruca Tucún**. Cubre comunicación interna, calendario de actividades, control de asistencia, formación doctrinal, gestión de inventario y recursos, reportes y administración de usuarios.

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Framework | Next.js 14 (App Router, Server Components) |
| Lenguaje | TypeScript 5 (strict mode) |
| Base de datos | PostgreSQL vía Supabase |
| ORM | Prisma 5 |
| Autenticación | Supabase Auth |
| Realtime | Supabase Realtime (postgres_changes) |
| Estilos | Tailwind CSS 3 |
| Gráficos | Recharts |
| Íconos | Lucide React |
| Storage | Supabase Storage (`materiales-fdoc`) |

---

## Variables de entorno

Creá un archivo `.env.local` en la raíz del proyecto con:

```env
# Supabase — obtenés estos valores en Project Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Base de datos — en Project Settings > Database > Connection string
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?pgbouncer=true&connection_limit=1
DIRECT_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Cron — token secreto para proteger el endpoint /api/cron/alertas
CRON_SECRET=un-token-seguro-y-aleatorio
```

---

## Setup local

### Requisitos previos

- Node.js 18+
- Una cuenta en [Supabase](https://supabase.com) con un proyecto creado

### Pasos

```bash
# 1. Clonar e instalar dependencias
git clone <repo>
cd erp-ruca-tucun
npm install

# 2. Instalar recharts (gráficos en módulo de Reportes)
npm install recharts

# 3. Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con los valores de tu proyecto Supabase

# 4. Aplicar el schema a la base de datos
npx prisma migrate dev --name init

# 5. Cargar datos iniciales
npm run seed

# 6. Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### Usuario inicial

| Campo | Valor |
|-------|-------|
| Email | `admin@rucatucun.com` |
| Contraseña | `RucaTucun2026!` |
| Rol | `JEFE_RUCA` (acceso total) |

> **Importante:** cambiá la contraseña del usuario administrador inmediatamente después del primer acceso.

---

## Datos iniciales (seed)

El seed crea automáticamente:

- **3 agrupaciones**: Masculina (San Jorge), Femenina (Santa Teresa de Lisieux), Milicianos (San Miguel Arcángel)
- **7 secciones**: Manada, Scout, Caminante (Masculina) · Brownies, Guías, Pioneras (Femenina) · Clan (Milicianos)
- **3 departamentos**: Intendencia, Comunicaciones, Formación Doctrinal
- **14 canales** del sistema predefinidos (General, Jefes, por Agrupación, por Sección, por Departamento)
- **1 usuario administrador** (`admin@rucatucun.com`)

---

## Estructura del proyecto

```
erp-ruca-tucun/
├── app/
│   ├── (auth)/              # Login, recuperación de contraseña
│   ├── (dashboard)/         # Módulos protegidos
│   │   ├── dashboard/       # Dashboard principal con widgets
│   │   ├── comunicacion/    # M2: Chat + Tablón + Circulares
│   │   ├── calendario/      # M3: Calendario de actividades
│   │   ├── formacion/       # M4: Formación Doctrinal + materiales
│   │   ├── miembros/        # M5: Gestión de miembros
│   │   ├── intendencia/     # M6: Inventario + solicitudes + préstamos
│   │   ├── secciones/       # M7: Organigrama del grupo
│   │   ├── reportes/        # M8: Reportes con gráficos y CSV
│   │   ├── admin/           # Gestión de usuarios (solo JEFE_RUCA)
│   │   └── notificaciones/  # Historial de notificaciones
│   └── api/
│       └── cron/alertas/    # Endpoint de alertas automáticas (8am UTC)
├── components/
│   ├── layout/              # Sidebar, TopBar, CampanaNotificaciones
│   └── modulos/             # Componentes por módulo
├── lib/
│   ├── auth.ts              # getUsuarioActual, checkPermiso, PERMISOS
│   ├── prisma.ts            # Cliente Prisma singleton
│   ├── supabase.ts          # Clientes Supabase (browser/server/admin)
│   └── notificaciones.ts    # crearNotificacion, obtenerNotificaciones
├── prisma/
│   ├── schema.prisma        # Schema de la base de datos
│   └── seed.ts              # Datos iniciales
├── public/
│   ├── manifest.json        # Configuración PWA
│   └── icons/               # Íconos SVG 192×192 y 512×512
└── vercel.json              # Cron jobs de Vercel
```

---

## Deploy en Vercel + Supabase

### Supabase

1. Crear proyecto en [supabase.com](https://supabase.com)
2. En **Storage** → crear bucket `materiales-fdoc` con acceso público
3. En **Authentication** → configurar email provider (SMTP o el built-in de Supabase)
4. En **Database** → copiar los strings de conexión para `DATABASE_URL` y `DIRECT_URL`

### Vercel

1. Importar el repositorio en [vercel.com](https://vercel.com)
2. Configurar todas las variables de entorno del `.env.local`
3. El cron job (`/api/cron/alertas`) se ejecuta automáticamente a las **8:00 AM UTC** todos los días gracias a `vercel.json`
4. Vercel inyecta el header `Authorization: Bearer $CRON_SECRET` en cada invocación del cron

---

## RBAC — Matriz de roles

| Rol | Módulos principales |
|-----|-------------------|
| `JEFE_RUCA` | Acceso total a todos los módulos |
| `SECRETARIO` | Comunicación, Calendario, Miembros, Reportes |
| `JEFE_INTENDENCIA` | Intendencia (completo) |
| `SUBJEFE_INTENDENCIA` | Intendencia (sin eliminar) |
| `JEFE_COMUNICACIONES` | Comunicación (completo) |
| `SUBJEFE_COMUNICACIONES` | Comunicación (sin aprobar) |
| `JEFE_FDOC` | Formación Doctrinal (completo) |
| `SUBJEFE_FDOC` | Formación Doctrinal (sin crear plan) |
| `JEFE_MILICIANOS` | Miembros + Calendario + Secciones |
| `JEFE_AGRUP_MASCULINA` / `JEFE_AGRUP_FEMENINA` | Miembros + Calendario de su agrupación |
| `JEFE_SECCION` | Acceso completo sobre su sección |
| `SUBJEFE_SECCION` | Ver + editar en su sección |

---

## Alertas automáticas (cron)

El endpoint `GET /api/cron/alertas` ejecuta cuatro verificaciones diarias:

1. **Asistencia baja** — miembros con < 50% en las últimas 4 semanas → notifica al Jefe de Sección
2. **Sin sesión FDoc** — secciones sin sesión en las últimas 3 semanas → notifica al Jefe de FDoc
3. **Stock bajo** — ítems con `cantidad_disponible ≤ stock_minimo` → notifica al Jefe de Intendencia
4. **Plan de sábado sin cargar** — evaluado solo los jueves → notifica a Jefes de Sección sin actividad del sábado siguiente

---

## Comandos útiles

```bash
# Generar cliente Prisma después de cambios en el schema
npx prisma generate

# Crear una nueva migración
npx prisma migrate dev --name descripcion_del_cambio

# Ver la base de datos en el browser
npx prisma studio

# Ejecutar el seed manualmente
npm run seed

# Build de producción
npm run build
```
