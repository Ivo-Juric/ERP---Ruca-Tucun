"use client";

import { useState, useRef, useCallback } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventClickArg, EventInput } from "@fullcalendar/core";
import { TipoActividad, EstadoActividad } from "@prisma/client";
import ModalActividad from "./ModalActividad";
import type { ActividadCalendario } from "@/app/(dashboard)/calendario/actions";
import { obtenerActividades } from "@/app/(dashboard)/calendario/actions";

// ─── Colores por tipo de actividad ───────────────────────────────────────────

const COLOR_TIPO: Record<TipoActividad, string> = {
  SABADO: "#D4B000",
  CAMPAMENTO: "#16a34a",
  JORNADA_FORMACION: "#2563eb",
  JORNADA_JEFES: "#7c3aed",
  REUNION_JEFES: "#9333ea",
  RETIRO: "#0891b2",
  MISA: "#ea580c",
  EXTRAORDINARIA: "#dc2626",
};

const OPACIDAD_ESTADO: Record<EstadoActividad, string> = {
  PLANIFICADA: "80",
  CONFIRMADA: "ff",
  REALIZADA: "55",
  CANCELADA: "33",
};

function actividadAEvento(a: ActividadCalendario): EventInput {
  const color = COLOR_TIPO[a.tipo];
  const opacidad = OPACIDAD_ESTADO[a.estado];
  return {
    id: a.id,
    title: a.titulo,
    start: a.fecha_inicio,
    end: a.fecha_fin,
    backgroundColor: `${color}${opacidad}`,
    borderColor: color,
    textColor: "#ffffff",
    extendedProps: { actividad: a },
  };
}

// ─── Filtros cliente ──────────────────────────────────────────────────────────

interface FiltrosClienteProps {
  secciones: { id: string; nombre: string }[];
  onFiltrar: (tipo: TipoActividad | "", seccion: string) => void;
}

const LABEL_TIPO: Record<TipoActividad, string> = {
  SABADO: "Sábado",
  CAMPAMENTO: "Campamento",
  JORNADA_FORMACION: "Jornada de Formación",
  JORNADA_JEFES: "Jornada de Jefes",
  REUNION_JEFES: "Reunión de Jefes",
  RETIRO: "Retiro",
  MISA: "Misa",
  EXTRAORDINARIA: "Extraordinaria",
};

function FiltrosCliente({ secciones, onFiltrar }: FiltrosClienteProps) {
  const [tipo, setTipo] = useState<TipoActividad | "">("");
  const [seccion, setSeccion] = useState("");

  function handleChange(nuevoTipo: TipoActividad | "", nuevaSeccion: string) {
    onFiltrar(nuevoTipo, nuevaSeccion);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select
        value={tipo}
        onChange={(e) => {
          const v = e.target.value as TipoActividad | "";
          setTipo(v);
          handleChange(v, seccion);
        }}
        className="rounded-lg border border-ruca-gray-light bg-ruca-gray px-3 py-2 text-sm text-white outline-none focus:border-ruca-yellow"
      >
        <option value="">Todos los tipos</option>
        {(Object.keys(LABEL_TIPO) as TipoActividad[]).map((t) => (
          <option key={t} value={t}>
            {LABEL_TIPO[t]}
          </option>
        ))}
      </select>

      {secciones.length > 0 && (
        <select
          value={seccion}
          onChange={(e) => {
            const v = e.target.value;
            setSeccion(v);
            handleChange(tipo, v);
          }}
          className="rounded-lg border border-ruca-gray-light bg-ruca-gray px-3 py-2 text-sm text-white outline-none focus:border-ruca-yellow"
        >
          <option value="">Todas las secciones</option>
          {secciones.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nombre}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface CalendarioClienteProps {
  actividadesIniciales: ActividadCalendario[];
  secciones: { id: string; nombre: string }[];
  puedCrear: boolean;
}

export default function CalendarioCliente({
  actividadesIniciales,
  secciones,
  puedCrear,
}: CalendarioClienteProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const [actividades, setActividades] = useState<ActividadCalendario[]>(actividadesIniciales);
  const [actividadModal, setActividadModal] = useState<ActividadCalendario | null>(null);
  const [vista, setVista] = useState<"dayGridMonth" | "timeGridWeek" | "listMonth">(
    "dayGridMonth",
  );

  const eventos: EventInput[] = actividades.map(actividadAEvento);

  function handleEventClick(info: EventClickArg) {
    const a = info.event.extendedProps["actividad"] as ActividadCalendario;
    setActividadModal(a);
  }

  const recargar = useCallback(async () => {
    const res = await obtenerActividades();
    if (res.ok) setActividades(res.data);
  }, []);

  function filtrar(tipo: TipoActividad | "", seccion_id: string) {
    setActividades(
      actividadesIniciales.filter((a) => {
        const matchTipo = !tipo || a.tipo === tipo;
        const matchSeccion = !seccion_id || a.seccion_id === seccion_id;
        return matchTipo && matchSeccion;
      }),
    );
  }

  function cambiarVista(v: typeof vista) {
    setVista(v);
    calendarRef.current?.getApi().changeView(v);
  }

  const VISTAS = [
    { key: "dayGridMonth" as const, label: "Mes" },
    { key: "timeGridWeek" as const, label: "Semana" },
    { key: "listMonth" as const, label: "Lista" },
  ];

  return (
    <div className="space-y-4">
      {/* Controles */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltrosCliente secciones={secciones} onFiltrar={filtrar} />

        <div className="flex items-center gap-2">
          {/* Toggle vista */}
          <div className="flex rounded-lg border border-ruca-gray-light overflow-hidden">
            {VISTAS.map((v) => (
              <button
                key={v.key}
                onClick={() => cambiarVista(v.key)}
                className={[
                  "px-3 py-1.5 text-xs font-medium transition-colors",
                  vista === v.key
                    ? "bg-ruca-yellow text-ruca-black"
                    : "text-zinc-400 hover:bg-ruca-gray hover:text-white",
                ].join(" ")}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* Nueva actividad */}
          {puedCrear && (
            <a
              href="/calendario/nueva"
              className="rounded-lg bg-ruca-yellow px-4 py-2 text-sm font-bold text-ruca-black hover:bg-ruca-yellow-light transition-colors"
            >
              + Nueva
            </a>
          )}
        </div>
      </div>

      {/* Calendario */}
      <div className="ruca-calendar rounded-xl border border-ruca-gray-light overflow-hidden">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="es"
          events={eventos}
          eventClick={handleEventClick}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "",
          }}
          height="auto"
          aspectRatio={1.6}
          buttonText={{ today: "Hoy" }}
          eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
          dayMaxEvents={3}
          moreLinkText={(n) => `+${n} más`}
          noEventsText="Sin actividades"
          listDayFormat={{ weekday: "long", day: "numeric", month: "long" }}
          listDaySideFormat={false}
        />
      </div>

      {/* Leyenda de tipos */}
      <div className="flex flex-wrap gap-3">
        {(Object.entries(COLOR_TIPO) as [TipoActividad, string][]).map(([tipo, color]) => (
          <div key={tipo} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: color }}
            />
            <span className="text-xs text-zinc-500">{LABEL_TIPO[tipo]}</span>
          </div>
        ))}
      </div>

      {/* Modal */}
      <ModalActividad
        actividad={actividadModal}
        onClose={() => setActividadModal(null)}
        onAccionRealizada={recargar}
      />
    </div>
  );
}
