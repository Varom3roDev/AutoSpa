/**
 * Application-wide constants for AutoSpa.
 */

/** Booking status flow (ordered) */
export const BOOKING_STATUS_FLOW = [
  "draft",
  "pending_payment",
  "confirmed",
  "assigned",
  "en_route",
  "arrived",
  "in_progress",
  "quality_check",
  "completed",
  "invoiced",
  "closed",
] as const;

/** Vehicle size labels in Spanish */
export const VEHICLE_SIZE_LABELS: Record<string, string> = {
  small: "Pequeño (Motos, Compactos)",
  medium: "Mediano (Sedán, Coupé)",
  large: "Grande (SUV, Camioneta)",
  xlarge: "Extra grande (Van, Camión)",
};

/** Vehicle type to size mapping */
export const VEHICLE_TYPE_SIZE_MAP: Record<string, string> = {
  motorcycle: "small",
  hatchback: "small",
  coupe: "medium",
  sedan: "medium",
  suv: "large",
  pickup: "large",
  van: "xlarge",
  truck: "xlarge",
};

/** Default IVA rate (disabled / 0%) */
export const DEFAULT_TAX_RATE = 0;

/** App contact info */
export const CONTACT = {
  phone: "+58 424 197 9461",
  email: "contacto@autospa.com.ve",
  whatsapp: "584241979461",
  whatsappUrl: "https://wa.me/584241979461?text=Hola%20AutoSpa,%20deseo%20informaci%C3%B3n%20sobre%20sus%20servicios%20de%20lavado",
  instagram: "@autospa.ccs",
};

/** Booking step names (for wizard) */
export const BOOKING_STEPS = [
  { key: "vehicle", label: "Vehículo" },
  { key: "service", label: "Servicio" },
  { key: "addons", label: "Extras" },
  { key: "address", label: "Dirección" },
  { key: "schedule", label: "Fecha y Hora" },
  { key: "summary", label: "Resumen" },
  { key: "confirmation", label: "Confirmación" },
] as const;

/** Number of booking steps */
export const TOTAL_BOOKING_STEPS = BOOKING_STEPS.length;
