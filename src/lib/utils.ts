export { cn } from "cn";

/**
 * Format a number as currency ($ or VES).
 */
export function formatCurrency(
  amount: number,
  currency: "USD" | "VES" = "USD"
): string {
  if (currency === "USD") {
    return `$${amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return new Intl.NumberFormat("es-VE", {
    style: "currency",
    currency: "VES",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Convert USD to VES using the given exchange rate.
 */
export function usdToVes(amountUsd: number, exchangeRate: number): number {
  return amountUsd * exchangeRate;
}

/**
 * Format a date in Venezuelan Spanish format (America/Caracas).
 */
export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(d);
}
/**
 * Get date string in YYYY-MM-DD format using America/Caracas timezone.
 */
export function getLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Caracas",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/**
 * Format a short date (dd/mm/yyyy) in America/Caracas.
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

/**
 * Format time (HH:mm) in America/Caracas.
 */
export function formatTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Format date and time in America/Caracas.
 */
export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("es-VE", {
    timeZone: "America/Caracas",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(d);
}

/**
 * Generate a booking code like "AS-20250922-A3X7".
 */
export function generateBookingCode(): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `AS-${dateStr}-${random}`;
}

/**
 * Get display label for booking status.
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Borrador",
    pending_payment: "Pendiente de pago",
    confirmed: "Confirmada",
    assigned: "Técnico asignado",
    en_route: "En camino",
    arrived: "En el lugar",
    in_progress: "En proceso",
    quality_check: "Control de calidad",
    completed: "Finalizada",
    invoiced: "Facturada",
    closed: "Cerrada",
    cancelled: "Cancelada",
    rescheduled: "Reprogramada",
    no_show: "No atendida",
  };
  return labels[status] || status;
}

/**
 * Get color class for booking status.
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-700",
    pending_payment: "bg-amber-100 text-amber-700",
    confirmed: "bg-blue-100 text-blue-700",
    assigned: "bg-indigo-100 text-indigo-700",
    en_route: "bg-cyan-100 text-cyan-700",
    arrived: "bg-teal-100 text-teal-700",
    in_progress: "bg-sky-100 text-sky-700",
    quality_check: "bg-purple-100 text-purple-700",
    completed: "bg-green-100 text-green-700",
    invoiced: "bg-emerald-100 text-emerald-700",
    closed: "bg-gray-200 text-gray-600",
    cancelled: "bg-red-100 text-red-700",
    rescheduled: "bg-orange-100 text-orange-700",
    no_show: "bg-rose-100 text-rose-700",
  };
  return colors[status] || "bg-gray-100 text-gray-700";
}

/**
 * Get vehicle type display label.
 */
export function getVehicleTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    sedan: "Sedán",
    suv: "SUV",
    pickup: "Camioneta",
    van: "Van",
    motorcycle: "Moto",
    coupe: "Coupé",
    hatchback: "Hatchback",
    truck: "Camión",
  };
  return labels[type] || type;
}

/**
 * Capitalize first letter of a string.
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Truncate text with ellipsis.
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Get initials from a person's full name (e.g. "Victor Romero" -> "VR").
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "U";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Convierte minutos del día (0-1440) a formato HH:mm 24 horas.
 */
export function minutesToTimeString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Convierte minutos del día a formato 12 horas con AM/PM (ej. 510 -> "08:30 AM").
 */
export function minutesTo12HourString(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${String(h12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
}

/**
 * Parsea cualquier formato de franja o ID a minutos de inicio y fin dentro del día.
 */
export function parseTimeSlotRange(slot?: string): { startMinutes: number; endMinutes: number } | null {
  if (!slot) return null;
  const s = slot.trim().toLowerCase();

  // IDs heredados estándar
  if (s === "ts_0") return { startMinutes: 7 * 60, endMinutes: 9 * 60 };
  if (s === "ts_1") return { startMinutes: 9 * 60, endMinutes: 11 * 60 };
  if (s === "ts_2") return { startMinutes: 11 * 60, endMinutes: 13 * 60 };
  if (s === "ts_3") return { startMinutes: 13 * 60, endMinutes: 15 * 60 };
  if (s === "ts_4") return { startMinutes: 15 * 60, endMinutes: 17 * 60 };

  // Formato "HH:mm - HH:mm" o "HH:mm-HH:mm" (24h o 12h)
  const match = s.match(/(\d{1,2}):(\d{2})\s*(am|pm)?\s*-\s*(\d{1,2}):(\d{2})\s*(am|pm)?/i);
  if (match) {
    let h1 = parseInt(match[1], 10);
    const m1 = parseInt(match[2], 10);
    const p1 = match[3]?.toLowerCase();

    let h2 = parseInt(match[4], 10);
    const m2 = parseInt(match[5], 10);
    const p2 = match[6]?.toLowerCase();

    if (p1 === "pm" && h1 < 12) h1 += 12;
    if (p1 === "am" && h1 === 12) h1 = 0;
    if (p2 === "pm" && h2 < 12) h2 += 12;
    if (p2 === "am" && h2 === 12) h2 = 0;

    return {
      startMinutes: h1 * 60 + m1,
      endMinutes: h2 * 60 + m2,
    };
  }

  // Coincidencias heurísticas de horas fijas viejas
  if (s.includes("07:00") || s.includes("7:00")) return { startMinutes: 7 * 60, endMinutes: 9 * 60 };
  if (s.includes("09:00") || s.includes("9:00")) return { startMinutes: 9 * 60, endMinutes: 11 * 60 };
  if (s.includes("11:00")) return { startMinutes: 11 * 60, endMinutes: 13 * 60 };
  if (s.includes("13:00") || s.includes("1:00")) return { startMinutes: 13 * 60, endMinutes: 15 * 60 };
  if (s.includes("15:00") || s.includes("3:00")) return { startMinutes: 15 * 60, endMinutes: 17 * 60 };

  return null;
}

/**
 * Retorna los minutos de inicio de un turno para ordenamiento cronológico.
 */
export function getTimeSlotStartMinutes(slot?: string): number {
  const range = parseTimeSlotRange(slot);
  return range ? range.startMinutes : 9999;
}

/**
 * Calcula la duración estimada en minutos de una sesión según el paciente y los servicios/extras.
 */
export function calculateSessionDuration(
  vehicleType?: string,
  serviceId?: string,
  hasInspectionExtras: boolean = false
): number {
  const vType = (vehicleType || '').toLowerCase();
  const isMoto = vType.includes('moto') || serviceId === 's_moto';
  if (isMoto) return 45;

  const isLarge = vType.includes('suv') || vType.includes('pickup') || vType.includes('van') || vType.includes('camioneta');

  let baseDuration = 60; // Base: Carro Gold 22K (60 min)

  if (serviceId === 's_gold_22k') {
    baseDuration = isLarge ? 75 : 60;
  } else if (serviceId === 's_gold_24k') {
    baseDuration = isLarge ? 90 : 75;
  }

  // Si tiene sesiones extras para cotizar bajo inspección, añadimos 15 min de colchón preventivo
  if (hasInspectionExtras) {
    baseDuration += 15;
  }

  return baseDuration;
}

export interface DynamicSlot {
  id: string; // e.g. "08:00 - 08:45"
  start_time: string; // "08:00"
  end_time: string; // "08:45"
  label: string; // "08:00 AM - 08:45 AM"
  duration_minutes: number;
  is_available: boolean;
  unavailability_reason: 'occupied' | 'past' | 'insufficient_time' | null;
}

/**
 * Genera turnos dinámicos en intervalos de 30 min garantizando el colchón de traslado en moto (40 min).
 */
export function generateDynamicTimeSlots(options: {
  date: string;
  durationMinutes: number;
  bufferMinutes?: number;
  activeBookings: Array<{ id?: string; slot?: string }>;
  workDayStart?: string;
  workDayEnd?: string;
  stepMinutes?: number;
  minLeadMinutes?: number;
}): DynamicSlot[] {
  const {
    date,
    durationMinutes,
    bufferMinutes = 40,
    activeBookings,
    workDayStart = "08:00",
    workDayEnd = "17:00",
    stepMinutes = 30,
    minLeadMinutes = 60,
  } = options;

  const [startH, startM] = workDayStart.split(":").map(Number);
  const [endH, endM] = workDayEnd.split(":").map(Number);
  const workStartMin = (startH || 8) * 60 + (startM || 0);
  const workEndMin = (endH || 17) * 60 + (endM || 0);

  // Parsear rangos de citas existentes activas
  const busyRanges: Array<{ start: number; end: number }> = [];
  for (const b of activeBookings) {
    if (!b || !b.slot) continue;
    const range = parseTimeSlotRange(b.slot);
    if (range) {
      busyRanges.push({ start: range.startMinutes, end: range.endMinutes });
    }
  }

  const todayStr = getLocalDateString(new Date());
  const isToday = date === todayStr;
  const isPastDate = date < todayStr;
  const { hours: curH, minutes: curM } = getCaracasTime();
  const currentMinutes = curH * 60 + curM;

  const slots: DynamicSlot[] = [];

  for (let sMin = workStartMin; sMin + durationMinutes <= workEndMin; sMin += stepMinutes) {
    const eMin = sMin + durationMinutes;
    const startStr = minutesToTimeString(sMin);
    const endStr = minutesToTimeString(eMin);
    const slotId = `${startStr} - ${endStr}`;
    const label = `${minutesTo12HourString(sMin)} - ${minutesTo12HourString(eMin)}`;

    let unavailability_reason: 'occupied' | 'past' | 'insufficient_time' | null = null;

    if (isPastDate) {
      unavailability_reason = 'past';
    } else if (isToday) {
      if (sMin <= currentMinutes) {
        unavailability_reason = 'past';
      } else if (sMin - currentMinutes < minLeadMinutes) {
        unavailability_reason = 'insufficient_time';
      }
    }

    if (!unavailability_reason) {
      // Verificar colisión y traslado en moto contra todas las citas agendadas
      for (const booked of busyRanges) {
        // Solapamiento directo
        const overlaps = !(eMin <= booked.start || sMin >= booked.end);
        if (overlaps) {
          unavailability_reason = 'occupied';
          break;
        }

        // Colchón de traslado (40 min):
        // Si el turno candidato inicia después de que la cita agendada termina:
        if (sMin >= booked.end) {
          if (sMin < booked.end + bufferMinutes) {
            unavailability_reason = 'occupied';
            break;
          }
        }
        // Si el turno candidato termina antes de que la cita agendada comience:
        if (eMin <= booked.start) {
          if (booked.start < eMin + bufferMinutes) {
            unavailability_reason = 'occupied';
            break;
          }
        }
      }
    }

    slots.push({
      id: slotId,
      start_time: startStr,
      end_time: endStr,
      label,
      duration_minutes: durationMinutes,
      is_available: !unavailability_reason,
      unavailability_reason,
    });
  }

  return slots;
}

/**
 * Format time slot code (e.g. "ts_0" -> "07:00 - 09:00" o "08:00 - 08:45" -> "08:00 AM - 08:45 AM").
 */
export function formatTimeSlot(slot?: string): string {
  if (!slot) return "09:00 - 11:00";
  const map: Record<string, string> = {
    ts_0: "07:00 AM - 09:00 AM",
    ts_1: "09:00 AM - 11:00 AM",
    ts_2: "11:00 AM - 01:00 PM",
    ts_3: "01:00 PM - 03:00 PM",
    ts_4: "03:00 PM - 05:00 PM",
  };
  if (map[slot]) return map[slot];

  const range = parseTimeSlotRange(slot);
  if (range) {
    return `${minutesTo12HourString(range.startMinutes)} - ${minutesTo12HourString(range.endMinutes)}`;
  }
  return slot;
}

/**
 * Normaliza cualquier formato de turno a su ID estándar ("ts_0", "ts_1", etc.)
 */
export function normalizeTimeSlotId(slot?: string): string {
  if (!slot) return "";
  const s = slot.trim().toLowerCase();
  if (s === "ts_0" || s === "ts_1" || s === "ts_2" || s === "ts_3" || s === "ts_4") return s;
  if (s.includes("07:00") || s.includes("7:00")) return "ts_0";
  if (s.includes("09:00") || s.includes("9:00")) return "ts_1";
  if (s.includes("11:00")) return "ts_2";
  if (s.includes("13:00") || s.includes("1:00")) return "ts_3";
  if (s.includes("15:00") || s.includes("3:00")) return "ts_4";
  return s;
}

/**
 * Retorna la hora y minutos actuales en la zona horaria de Caracas (America/Caracas).
 */
export function getCaracasTime(): { hours: number; minutes: number } {
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Caracas",
      hour: "numeric",
      minute: "numeric",
      hour12: false,
    });
    const parts = formatter.formatToParts(new Date());
    const hours = parseInt(parts.find(p => p.type === "hour")?.value || "0", 10);
    const minutes = parseInt(parts.find(p => p.type === "minute")?.value || "0", 10);
    return { hours, minutes };
  } catch {
    const now = new Date();
    return { hours: now.getHours(), minutes: now.getMinutes() };
  }
}

/**
 * Determina si una franja horaria ya pasó o no cumple con el tiempo mínimo de anticipación
 * (en minutos) para una fecha dada en la hora de Caracas. Por defecto: 120 minutos (2 horas).
 */
export function isTimeSlotInThePast(
  slotStartTime: string, 
  targetDateStr: string, 
  minLeadMinutes: number = 120
): boolean {
  if (!slotStartTime || !targetDateStr) return false;
  const todayStr = getLocalDateString(new Date());

  if (targetDateStr < todayStr) return true;
  if (targetDateStr > todayStr) return false;

  const [slotH, slotM] = slotStartTime.split(":").map(Number);
  const { hours: curH, minutes: curM } = getCaracasTime();

  const slotMinutes = (slotH || 0) * 60 + (slotM || 0);
  const currentMinutes = curH * 60 + curM;

  // Si faltan menos de minLeadMinutes (2 horas) para que comience el turno, queda bloqueado
  return (slotMinutes - currentMinutes) < minLeadMinutes;
}

/**
 * Retorna la razón por la que un turno no está disponible:
 * - 'occupied': Ya está reservado por otro cliente
 * - 'past': Ya terminó o transcurrió su hora
 * - 'insufficient_time': Falta menos de la anticipación mínima (2 horas)
 * - null: Está libre y disponible
 */
export function getTimeSlotUnavailabilityReason(
  slotStartTime: string,
  targetDateStr: string,
  isOccupied: boolean,
  minLeadMinutes: number = 120
): 'occupied' | 'past' | 'insufficient_time' | null {
  if (isOccupied) return 'occupied';
  if (!slotStartTime || !targetDateStr) return null;
  const todayStr = getLocalDateString(new Date());

  if (targetDateStr < todayStr) return 'past';
  if (targetDateStr > todayStr) return null;

  const [slotH, slotM] = slotStartTime.split(":").map(Number);
  const { hours: curH, minutes: curM } = getCaracasTime();

  const slotMinutes = (slotH || 0) * 60 + (slotM || 0);
  const currentMinutes = curH * 60 + curM;

  if (slotMinutes <= currentMinutes) return 'past';
  if (slotMinutes - currentMinutes < minLeadMinutes) return 'insufficient_time';
  return null;
}

/**
 * Determina si el cliente puede reprogramar una cita según la política de anticipación mínima
 * (por defecto: 12 horas antes del inicio del turno en hora de Caracas).
 */
export function canClientRescheduleBooking(
  scheduledDate: string,
  scheduledTimeSlot: string,
  minHoursNotice: number = 12
): { allowed: boolean; hoursRemaining: number; minHoursNotice: number } {
  if (!scheduledDate || !scheduledTimeSlot) {
    return { allowed: false, hoursRemaining: 0, minHoursNotice };
  }

  const slotMap: Record<string, string> = {
    ts_0: "07:00",
    ts_1: "09:00",
    ts_2: "11:00",
    ts_3: "13:00",
    ts_4: "15:00",
  };
  const normId = normalizeTimeSlotId(scheduledTimeSlot);
  const startTime = slotMap[normId] || "08:00";
  const [slotH, slotM] = startTime.split(":").map(Number);

  // Fecha y hora del turno
  const [year, month, day] = scheduledDate.split("-").map(Number);
  
  // Obtener fecha actual en hora de Caracas
  const now = new Date();
  const caracasDateStr = getLocalDateString(now);
  const [curY, curM, curD] = caracasDateStr.split("-").map(Number);
  const { hours: curH, minutes: curMin } = getCaracasTime();

  // Comparación en milisegundos
  const targetUtc = Date.UTC(year, month - 1, day, slotH || 8, slotM || 0, 0);
  const currentUtc = Date.UTC(curY, curM - 1, curD, curH, curMin, 0);

  const diffMs = targetUtc - currentUtc;
  const hoursRemaining = Math.max(0, diffMs / (1000 * 60 * 60));

  return {
    allowed: hoursRemaining >= minHoursNotice,
    hoursRemaining: Math.round(hoursRemaining * 10) / 10,
    minHoursNotice,
  };
}

/**
 * Mobile-unlocked Web Audio Chime
 */
let globalAudioCtx: AudioContext | null = null;

if (typeof window !== "undefined") {
  const unlockAudio = () => {
    try {
      if (!globalAudioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) globalAudioCtx = new AudioContextClass();
      }
      if (globalAudioCtx && globalAudioCtx.state === "suspended") {
        globalAudioCtx.resume().catch(() => {});
      }
    } catch {}
  };
  window.addEventListener("click", unlockAudio, { passive: true });
  window.addEventListener("touchstart", unlockAudio, { passive: true });
}

export function playAudioChime(type: "subtle" | "prominent" = "prominent") {
  if (typeof window === "undefined") return;
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    if (!globalAudioCtx) {
      globalAudioCtx = new AudioContextClass();
    }
    if (globalAudioCtx.state === "suspended") {
      globalAudioCtx.resume().catch(() => {});
    }
    const ctx = globalAudioCtx;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";

    if (type === "subtle") {
      // E5 (659.25Hz) -> B5 (987.77Hz) for client
      osc.frequency.setValueAtTime(659.25, ctx.currentTime);
      osc.frequency.setValueAtTime(987.77, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.45);
    } else {
      // D5 (587.33Hz) -> A5 (880Hz) for admin & tech
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.35, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    }
  } catch {}
}

/**
 * Parsea las horas de inicio y fin de una franja horaria.
 */
export function getTimeSlotBounds(slot?: string): { startHour: number; startMin: number; endHour: number; endMin: number } {
  const norm = normalizeTimeSlotId(slot);
  const bounds: Record<string, [number, number, number, number]> = {
    ts_0: [7, 0, 9, 0],
    ts_1: [9, 0, 11, 0],
    ts_2: [11, 0, 13, 0],
    ts_3: [13, 0, 15, 0],
    ts_4: [15, 0, 17, 0],
  };
  if (norm && bounds[norm]) {
    const [sh, sm, eh, em] = bounds[norm];
    return { startHour: sh, startMin: sm, endHour: eh, endMin: em };
  }
  if (slot && slot.includes("-")) {
    const parts = slot.split("-").map((p) => p.trim());
    if (parts.length === 2) {
      const [sh, sm] = parts[0].split(":").map(Number);
      const [eh, em] = parts[1].split(":").map(Number);
      if (!isNaN(sh) && !isNaN(eh)) {
        return { startHour: sh, startMin: sm || 0, endHour: eh, endMin: em || 0 };
      }
    }
  }
  return { startHour: 9, startMin: 0, endHour: 11, endMin: 0 };
}

export interface BookingTimeStatus {
  isOverdue: boolean;
  isToday: boolean;
  isUpcoming: boolean;
  isInProgress: boolean;
  isCompletedOrCancelled: boolean;
  timeRemainingText: string;
  urgencyLevel: 'normal' | 'soon' | 'active' | 'overdue';
  overdueMinutes: number;
  formattedStart: string;
  // Métricas de cuenta regresiva en vivo
  countdown: {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    totalSeconds: number;
    targetTimestamp: number;
    label: string;
  };
}

/**
 * Calcula con precisión si una orden está vencida, en curso, o cuánto tiempo falta para su inicio.
 */
export function getBookingTimeStatus(booking?: {
  scheduled_date?: string;
  scheduled_time_slot?: string;
  status?: string;
}): BookingTimeStatus {
  const emptyCountdown = {
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    totalSeconds: 0,
    targetTimestamp: 0,
    label: "",
  };

  const defResult: BookingTimeStatus = {
    isOverdue: false,
    isToday: false,
    isUpcoming: false,
    isInProgress: false,
    isCompletedOrCancelled: false,
    timeRemainingText: "Programada",
    urgencyLevel: "normal",
    overdueMinutes: 0,
    formattedStart: "",
    countdown: emptyCountdown,
  };

  if (!booking?.scheduled_date) return defResult;

  const terminalStatuses = ["completed", "cancelled", "invoiced", "closed"];
  const isTerminal = terminalStatuses.includes(booking.status || "");
  if (isTerminal) {
    return {
      ...defResult,
      isCompletedOrCancelled: true,
      timeRemainingText: booking.status === "completed" ? "Completada" : "Cancelada",
      urgencyLevel: "normal",
      countdown: {
        ...emptyCountdown,
        label: booking.status === "completed" ? "Completada" : "Cancelada",
      },
    };
  }

  const { startHour, startMin, endHour, endMin } = getTimeSlotBounds(booking.scheduled_time_slot);
  const dateStr = booking.scheduled_date.slice(0, 10);
  const pad = (n: number) => n.toString().padStart(2, "0");

  // Fechas en zona horaria de Caracas (UTC-4)
  const slotStart = new Date(`${dateStr}T${pad(startHour)}:${pad(startMin)}:00-04:00`);
  const slotEnd = new Date(`${dateStr}T${pad(endHour)}:${pad(endMin)}:00-04:00`);

  if (isNaN(slotStart.getTime()) || isNaN(slotEnd.getTime())) {
    return defResult;
  }

  const now = new Date();
  const toleranceMinutes = 15;
  const slotEndWithTolerance = new Date(slotEnd.getTime() + toleranceMinutes * 60 * 1000);

  const diffMs = now.getTime() - slotEndWithTolerance.getTime();
  const todayStr = getLocalDateString(now);
  const isToday = dateStr === todayStr;

  // 1. Caso: Vencida / Retrasada (Overdue)
  if (now.getTime() > slotEndWithTolerance.getTime()) {
    const overdueTotalSec = Math.floor(diffMs / 1000);
    const overdueMinutes = Math.floor(overdueTotalSec / 60);
    const overdueHours = Math.floor(overdueMinutes / 60);
    const overdueDays = Math.floor(overdueHours / 24);

    let text = "";
    if (overdueDays >= 1) {
      text = `Vencida hace ${overdueDays} día${overdueDays > 1 ? "s" : ""}`;
    } else if (overdueHours >= 1) {
      text = `Vencida hace ${overdueHours}h`;
    } else {
      text = `Vencida hace ${overdueMinutes} min`;
    }

    return {
      isOverdue: true,
      isToday,
      isUpcoming: false,
      isInProgress: false,
      isCompletedOrCancelled: false,
      timeRemainingText: text,
      urgencyLevel: "overdue",
      overdueMinutes,
      formattedStart: `${pad(startHour)}:${pad(startMin)}`,
      countdown: {
        days: overdueDays,
        hours: overdueHours % 24,
        minutes: overdueMinutes % 60,
        seconds: overdueTotalSec % 60,
        totalSeconds: overdueTotalSec,
        targetTimestamp: slotEndWithTolerance.getTime(),
        label: `Expiró hace ${overdueHours > 0 ? `${overdueHours}h ` : ''}${overdueMinutes % 60}m`,
      },
    };
  }

  // 2. Caso: Ventana de servicio actual (En curso)
  if (now >= slotStart && now <= slotEndWithTolerance) {
    const remainingInSlotMs = slotEndWithTolerance.getTime() - now.getTime();
    const remainingTotalSec = Math.max(0, Math.floor(remainingInSlotMs / 1000));
    const remMin = Math.floor(remainingTotalSec / 60);
    const remHrs = Math.floor(remMin / 60);

    return {
      isOverdue: false,
      isToday: true,
      isUpcoming: false,
      isInProgress: true,
      isCompletedOrCancelled: false,
      timeRemainingText: "Turno en curso",
      urgencyLevel: "active",
      overdueMinutes: 0,
      formattedStart: `${pad(startHour)}:${pad(startMin)}`,
      countdown: {
        days: 0,
        hours: remHrs,
        minutes: remMin % 60,
        seconds: remainingTotalSec % 60,
        totalSeconds: remainingTotalSec,
        targetTimestamp: slotEndWithTolerance.getTime(),
        label: `Cierre de turno en ${remHrs > 0 ? `${remHrs}h ` : ''}${remMin % 60}m`,
      },
    };
  }

  // 3. Caso: Futura / Próxima (Cuenta regresiva hasta el inicio)
  const msUntilStart = Math.max(0, slotStart.getTime() - now.getTime());
  const totalSecondsUntilStart = Math.floor(msUntilStart / 1000);
  const minutesUntilStart = Math.floor(totalSecondsUntilStart / 60);
  const hoursUntilStart = Math.floor(minutesUntilStart / 60);
  const daysUntilStart = Math.floor(hoursUntilStart / 24);

  let text = "";
  let urgencyLevel: "normal" | "soon" = "normal";

  if (isToday) {
    if (minutesUntilStart <= 120) {
      urgencyLevel = "soon";
      text = `Inicia en ${minutesUntilStart} min`;
    } else {
      text = `Hoy a las ${pad(startHour)}:${pad(startMin)}`;
    }
  } else if (daysUntilStart === 1) {
    text = `Mañana a las ${pad(startHour)}:${pad(startMin)}`;
  } else if (daysUntilStart > 1) {
    text = `En ${daysUntilStart} días`;
  } else {
    text = `Próximamente`;
  }

  // Etiqueta legible de cuenta regresiva
  let countdownLabel = "";
  if (daysUntilStart > 0) {
    countdownLabel = `${daysUntilStart}d ${hoursUntilStart % 24}h ${minutesUntilStart % 60}m`;
  } else if (hoursUntilStart > 0) {
    countdownLabel = `${hoursUntilStart}h ${minutesUntilStart % 60}m ${totalSecondsUntilStart % 60}s`;
  } else {
    countdownLabel = `${minutesUntilStart}m ${totalSecondsUntilStart % 60}s`;
  }

  return {
    isOverdue: false,
    isToday,
    isUpcoming: true,
    isInProgress: false,
    isCompletedOrCancelled: false,
    timeRemainingText: text,
    urgencyLevel,
    overdueMinutes: 0,
    formattedStart: `${pad(startHour)}:${pad(startMin)}`,
    countdown: {
      days: daysUntilStart,
      hours: hoursUntilStart % 24,
      minutes: minutesUntilStart % 60,
      seconds: totalSecondsUntilStart % 60,
      totalSeconds: totalSecondsUntilStart,
      targetTimestamp: slotStart.getTime(),
      label: countdownLabel,
    },
  };
}
