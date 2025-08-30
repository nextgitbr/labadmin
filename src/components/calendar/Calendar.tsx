"use client";
import React, { useState, useRef, useEffect } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import {
  EventInput,
  DateSelectArg,
  EventClickArg,
  EventContentArg,
} from "@fullcalendar/core";
import { useModal } from "@/hooks/useModal";
import { Modal } from "@/components/ui/modal";
import { apiClient } from "@/lib/apiClient";

interface CalendarEvent extends EventInput {
  extendedProps: {
    calendar: string;
  };
}

interface CalendarProps {
  events?: CalendarEvent[];
}

const Calendar: React.FC<CalendarProps> = ({ events: eventsProp }) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null
  );
  const [eventTitle, setEventTitle] = useState("");
  const [eventStartDate, setEventStartDate] = useState("");
  const [eventEndDate, setEventEndDate] = useState("");
  const [eventLevel, setEventLevel] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>(eventsProp || []);
  const calendarRef = useRef<FullCalendar>(null);
  const { isOpen, openModal, closeModal } = useModal();
  const [isDark, setIsDark] = useState(false);
  const [stages, setStages] = useState<any[]>([]);

  // Theme detection (live updates)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      setIsDark(document.documentElement.classList.contains('dark'));
    }
    const html = document.documentElement;
    const updateDark = () => setIsDark(html.classList.contains('dark'));
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.type === 'attributes' && m.attributeName === 'class') updateDark();
      }
    });
    observer.observe(html, { attributes: true, attributeFilter: ['class'] });
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)');
    const onMqChange = () => updateDark();
    if (mq) {
      try { mq.addEventListener?.('change', onMqChange); } catch { mq.addListener?.(onMqChange as any); }
    }
    return () => {
      observer.disconnect();
      if (mq) {
        try { mq.removeEventListener?.('change', onMqChange); } catch { mq.removeListener?.(onMqChange as any); }
      }
    };
  }, []);

  // Color utilities
  const hexToRgb = (hex: string) => {
    const clean = hex.replace('#', '');
    const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
    const bigint = parseInt(full, 16);
    return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
  };
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  const parseColor = (input: string) => {
    if (!input) return { r: 255, g: 255, b: 255 };
    if (input.startsWith('#')) return hexToRgb(input);
    const m = input.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
    if (m) return { r: parseInt(m[1]), g: parseInt(m[2]), b: parseInt(m[3]) };
    // Fallback try: named colors not supported -> assume white
    return { r: 255, g: 255, b: 255 };
  };
  const lighten = (color: string, amount: number) => {
    const { r, g, b } = parseColor(color);
    const nr = clamp(r + (255 - r) * amount);
    const ng = clamp(g + (255 - g) * amount);
    const nb = clamp(b + (255 - b) * amount);
    return `rgb(${nr}, ${ng}, ${nb})`;
  };
  const darken = (color: string, amount: number) => {
    const { r, g, b } = parseColor(color);
    const nr = clamp(r * (1 - amount));
    const ng = clamp(g * (1 - amount));
    const nb = clamp(b * (1 - amount));
    return `rgb(${nr}, ${ng}, ${nb})`;
  };
  const getReadableText = (bg: string) => {
    // bg as rgb(r,g,b) or #hex
    let r=255,g=255,b=255;
    if (bg.startsWith('#')) { ({ r, g, b } = hexToRgb(bg)); }
    else {
      const m = bg.match(/rgb\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
      if (m) { r = parseInt(m[1]); g = parseInt(m[2]); b = parseInt(m[3]); }
    }
    // luminance
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.6 ? '#111827' : '#ffffff';
  };

  // Load Kanban stages to mirror their colors in calendar events
  useEffect(() => {
    const loadStages = async () => {
      try {
        const data = await apiClient.get<any[]>('/api/stages');
        setStages(data || []);
      } catch (e) {
        console.error('Erro ao carregar etapas (calendar):', e);
      }
    };
    loadStages();
  }, []);

  const calendarsEvents = {
    Danger: "danger",
    Success: "success",
    Primary: "primary",
    Warning: "warning",
  };

  useEffect(() => {
    if (eventsProp) {
      setEvents(eventsProp);
    } else {
      // Initialize with some events
      setEvents([
        {
          id: "1",
          title: "Event Conf.",
          start: new Date().toISOString().split("T")[0],
          extendedProps: { calendar: "Danger" },
        },
        {
          id: "2",
          title: "Meeting",
          start: new Date(Date.now() + 86400000).toISOString().split("T")[0],
          extendedProps: { calendar: "Success" },
        },
        {
          id: "3",
          title: "Workshop",
          start: new Date(Date.now() + 172800000).toISOString().split("T")[0],
          end: new Date(Date.now() + 259200000).toISOString().split("T")[0],
          extendedProps: { calendar: "Primary" },
        },
      ]);
    }
  }, [eventsProp]);

  // Desabilitado: não adicionamos eventos por clique no dia
  const handleDateSelect = (_selectInfo: DateSelectArg) => {
    return;
  };

  const handleEventClick = (clickInfo: EventClickArg) => {
    const event = clickInfo.event;
    
    // Se for um pedido, redirecionar para a página de detalhes
    if (event.extendedProps.orderId) {
      window.location.href = `/orders/${event.extendedProps.orderId}`;
      return;
    }
    
    // Caso contrário, não faz nada (sem criação/edição manual)
    return;
  };

  const handleAddOrUpdateEvent = () => {
    if (selectedEvent) {
      // Update existing event
      setEvents((prevEvents) =>
        prevEvents.map((event) =>
          event.id === selectedEvent.id
            ? {
                ...event,
                title: eventTitle,
                start: eventStartDate,
                end: eventEndDate,
                extendedProps: { calendar: eventLevel },
              }
            : event
        )
      );
    } else {
      // Add new event
      const newEvent: CalendarEvent = {
        id: Date.now().toString(),
        title: eventTitle,
        start: eventStartDate,
        end: eventEndDate,
        allDay: true,
        extendedProps: { calendar: eventLevel },
      };
      setEvents((prevEvents) => [...prevEvents, newEvent]);
    }
    closeModal();
    resetModalFields();
  };

  const resetModalFields = () => {
    setEventTitle("");
    setEventStartDate("");
    setEventEndDate("");
    setEventLevel("");
    setSelectedEvent(null);
  };

  const renderEventContent = (eventInfo: EventContentArg) => {
    const status = eventInfo.event.extendedProps.status as string | undefined;
    // Tenta encontrar a etapa pelo nome do status para herdar as mesmas cores do Kanban
    const stage = status ? stages.find((s) => s.name === status) : null;
    const primary = stage ? (stage.primaryColor || stage.color) : '#3B82F6';
    const stroke = stage ? (stage.stroke || darken(primary, 0.25)) : darken('#3B82F6', 0.25);
    const cardBgBase = stage ? (stage.cardBgColor || primary) : primary;
    // Mesma lógica do Kanban: 
    // - Light: card em tom claro derivado da cor do estágio
    // - Dark: usa cardBgColor (ou lighten do primary) com borda do stroke
    const bg = isDark ? (stage ? (stage.cardBgColor || lighten(primary, 0.88)) : darken(primary, 0.1)) : lighten(cardBgBase, 0.90);
    const border = isDark ? stroke : '#e5e7eb';
    const color = getReadableText(bg);

    // Full-size inner container so we control the look regardless of FC default styles
    return (
      <div className="w-full h-full">
        <div
          className="flex flex-col items-start justify-center w-full h-full rounded-md px-2 py-1 border shadow-sm"
          style={{ backgroundColor: bg, color, borderColor: border }}
        >
          <div className="font-semibold text-[11px] leading-4 truncate w-full">
            {eventInfo.event.extendedProps.orderNumber || eventInfo.event.title}
          </div>
          {eventInfo.event.extendedProps.patientName && (
            <div className="text-[11px] leading-4/3 opacity-90 truncate w-full">
              {eventInfo.event.extendedProps.patientName}
            </div>
          )}
          {status && (
            <div className="text-[10px] leading-3 opacity-80 truncate w-full">
              {status}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border  border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="custom-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay",
          }}
          events={events}
          selectable={false}
          eventClick={handleEventClick}
          eventContent={renderEventContent}
        />
      </div>
      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        className="max-w-[700px] p-6 lg:p-10"
      >
        <div className="flex flex-col px-2 overflow-y-auto custom-scrollbar">
          <div>
            <h5 className="mb-2 font-semibold text-gray-800 modal-title text-theme-xl dark:text-white/90 lg:text-2xl">
              {selectedEvent ? "Edit Event" : "Add Event"}
            </h5>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Plan your next big moment: schedule or edit an event to stay on
              track
            </p>
          </div>
          <div className="mt-8">
            <div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                  Event Title
                </label>
                <input
                  id="event-title"
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
            <div className="mt-6">
              <label className="block mb-4 text-sm font-medium text-gray-700 dark:text-gray-400">
                Event Color
              </label>
              <div className="flex flex-wrap items-center gap-4 sm:gap-5">
                {Object.entries(calendarsEvents).map(([key, value]) => (
                  <div key={key} className="n-chk">
                    <div
                      className={`form-check form-check-${value} form-check-inline`}
                    >
                      <label
                        className="flex items-center text-sm text-gray-700 form-check-label dark:text-gray-400"
                        htmlFor={`modal${key}`}
                      >
                        <span className="relative">
                          <input
                            className="sr-only form-check-input"
                            type="radio"
                            name="event-level"
                            value={key}
                            id={`modal${key}`}
                            checked={eventLevel === key}
                            onChange={() => setEventLevel(key)}
                          />
                          <span className="flex items-center justify-center w-5 h-5 mr-2 border border-gray-300 rounded-full box dark:border-gray-700">
                            <span
                              className={`h-2 w-2 rounded-full bg-white ${
                                eventLevel === key ? "block" : "hidden"
                              }`}  
                            ></span>
                          </span>
                        </span>
                        {key}
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Enter Start Date
              </label>
              <div className="relative">
                <input
                  id="event-start-date"
                  type="date"
                  value={eventStartDate}
                  onChange={(e) => setEventStartDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">
                Enter End Date
              </label>
              <div className="relative">
                <input
                  id="event-end-date"
                  type="date"
                  value={eventEndDate}
                  onChange={(e) => setEventEndDate(e.target.value)}
                  className="dark:bg-dark-900 h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent bg-none px-4 py-2.5 pl-4 pr-11 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-6 modal-footer sm:justify-end">
            <button
              onClick={closeModal}
              type="button"
              className="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Close
            </button>
            <button
              onClick={handleAddOrUpdateEvent}
              type="button"
              className="btn btn-success btn-update-event flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 sm:w-auto"
            >
              {selectedEvent ? "Update Changes" : "Add Event"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const statusColors: Record<string, string> = {
  "Criado": "bg-blue-500",
  "Iniciado": "bg-cyan-500",
  "Em processamento": "bg-yellow-500",
  "Aguardando": "bg-orange-500",
  "Finalizado": "bg-green-600",
  "Cancelado": "bg-red-500"
};

const renderEventContent = (eventInfo: EventContentArg) => {
  const status = eventInfo.event.extendedProps.status;
  const orderNumber = eventInfo.event.extendedProps.orderNumber;
  const patientName = eventInfo.event.extendedProps.patientName;
  const assignedTo = eventInfo.event.extendedProps.assignedTo;
  
  return (
    <div className="flex flex-col items-start justify-center w-full p-1 text-white">
      <div className="font-semibold text-xs truncate w-full">
        {orderNumber || eventInfo.event.title}
      </div>
      {patientName && (
        <div className="text-xs opacity-90 truncate w-full">
          {patientName}
        </div>
      )}
      <div className="text-xs opacity-75 truncate w-full">
        {status}
      </div>
    </div>
  );
};

export default Calendar;
