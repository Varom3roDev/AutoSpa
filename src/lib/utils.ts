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
 * Format time slot code (e.g. "ts_0" -> "07:00 - 09:00").
 */
export function formatTimeSlot(slot?: string): string {
  if (!slot) return "09:00 - 11:00";
  const map: Record<string, string> = {
    ts_0: "07:00 - 09:00",
    ts_1: "09:00 - 11:00",
    ts_2: "11:00 - 13:00",
    ts_3: "13:00 - 15:00",
    ts_4: "15:00 - 17:00",
  };
  return map[slot] || slot;
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
