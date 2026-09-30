/**
 * Tipos e interfaces de la aplicación AutoSpa
 */

/**
 * Organización (Empresa)
 */
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  phone: string;
  email: string;
  address: string;
  currency: string;
  tax_rate: number;
  settings: BusinessSettings;
}

/**
 * Configuraciones del negocio
 */
export interface BusinessSettings {
  working_hours: Record<number, { open: string; close: string; is_closed: boolean }>;
  timezone: string;
  booking_advance_hours: number;
  cancellation_hours: number;
  max_bookings_per_slot: number;
}

/**
 * Configuración Global de la Aplicación
 */
export interface AppSettings {
  id: string;
  bcv_exchange_rate: number;
  home_banner_title: string;
  home_banner_text: string;
  support_whatsapp: string;
  updated_at?: string;
}

/**
 * Rol de Usuario
 */
export type UserRole = 'client' | 'technician' | 'admin' | 'superadmin';

/**
 * Usuario Base
 */
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone: string;
  birth_date?: string;
  avatar_url?: string;
  role: UserRole;
}

/**
 * Dirección del cliente
 */
export interface CustomerAddress {
  id: string;
  customer_id: string;
  label: string;
  address_line: string;
  reference?: string;
  city: string;
  municipality: string;
  zone_id?: string;
  lat?: number;
  lng?: number;
  is_default: boolean;
}

/**
 * Cliente
 */
export interface Customer extends User {
  addresses: CustomerAddress[];
  vehicles: Vehicle[];
}

/**
 * Tipo de Vehículo
 */
export type VehicleType = 'sedan' | 'suv' | 'pickup' | 'van' | 'motorcycle' | 'coupe' | 'hatchback' | 'truck';

/**
 * Categoría de tamaño de vehículo
 */
export type VehicleSizeCategory = 'small' | 'medium' | 'large' | 'xlarge';

/**
 * Vehículo del cliente
 */
export interface Vehicle {
  id: string;
  customer_id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  type: VehicleType;
  size_category: VehicleSizeCategory;
  notes?: string;
  is_default: boolean;
}

/**
 * Categoría de Servicio
 */
export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  sort_order: number;
  is_active: boolean;
}

/**
 * Servicio
 */
export interface Service {
  id: string;
  category_id: string;
  name: string;
  description: string;
  short_description: string;
  includes: string[];
  excludes: string[];
  icon?: string;
  image_url?: string;
  base_duration_minutes: number;
  base_price_usd: number;
  price_by_vehicle_size: Record<VehicleSizeCategory, number>;
  tax_rate: number;
  min_technicians: number;
  is_active: boolean;
  sort_order: number;
}

/**
 * Adicional de Servicio (Add-on)
 */
export interface ServiceAddon {
  id: string;
  name: string;
  description?: string;
  price_usd: number;
  price_by_vehicle_size: Record<VehicleSizeCategory, number> | null;
  duration_minutes: number;
  is_active: boolean;
}

/**
 * Adicional de la Reserva
 */
export interface BookingAddon {
  addon_id: string;
  name: string;
  price_usd: number;
  quantity: number;
}

/**
 * Estado de la Reserva
 */
export type BookingStatus = 
  | 'draft' 
  | 'pending_payment' 
  | 'confirmed' 
  | 'assigned' 
  | 'en_route' 
  | 'arrived' 
  | 'in_progress' 
  | 'quality_check' 
  | 'completed' 
  | 'invoiced' 
  | 'closed' 
  | 'cancelled' 
  | 'rescheduled' 
  | 'no_show';

/**
 * Historial de Estado de la Reserva
 */
export interface BookingStatusHistory {
  id: string;
  booking_id: string;
  from_status: BookingStatus | null;
  to_status: BookingStatus;
  changed_by: string;
  notes?: string;
  timestamp: string;
}

/**
 * Reserva
 */
export interface Booking {
  id: string;
  code: string;
  customer_id: string;
  vehicle_id: string;
  address_id: string;
  service_id: string;
  addons: BookingAddon[];
  assigned_technician_id?: string;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time_slot: string;
  estimated_duration: number;
  subtotal_usd: number;
  discount_usd: number;
  tax_usd: number;
  total_usd: number;
  total_ves: number;
  exchange_rate: number;
  payment_method?: string;
  payment_reference?: string;
  payment_bank?: string;
  payment_amount?: number;
  payment_status?: 'unpaid' | 'pending_verification' | 'verified' | 'rejected';
  payment_reported_at?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Zona de Servicio
 */
export interface ServiceZone {
  id: string;
  name: string;
  municipalities: string[];
  surcharge_usd: number;
  avg_travel_minutes: number;
  is_active: boolean;
}

/**
 * Franja Horaria
 */
export interface TimeSlot {
  id: string;
  start_time: string;
  end_time: string;
  label: string;
}

/**
 * Disponibilidad
 */
export interface AvailabilitySlot {
  date: string;
  time_slot_id: string;
  zone_id: string;
  available_capacity: number;
  booked_count: number;
}

/**
 * Fechas Bloqueadas
 */
export interface BlockedDate {
  id: string;
  date: string;
  reason: string;
  is_recurring: boolean;
}

/**
 * Tasa de Cambio
 */
export interface ExchangeRate {
  id: string;
  from_currency: 'USD';
  to_currency: 'VES';
  rate: number;
  effective_date: string;
}

/**
 * Registro de Auditoría
 */
export interface AuditLog {
  id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, any>;
  user_id: string;
  timestamp: string;
}

/**
 * Estadísticas del Dashboard
 */
export interface DashboardStats {
  today_bookings: number;
  today_revenue_usd: number;
  pending_bookings: number;
  in_progress_bookings: number;
  completed_today: number;
  cancelled_today: number;
  active_technicians: number;
  avg_ticket_usd: number;
}

/**
 * Método de Pago
 */
export type PaymentMethodType = 
  | 'pago_movil' 
  | 'efectivo_usd' 
  | 'efectivo_ves' 
  | 'zelle' 
  | 'transferencia'
  | 'punto_venta';

/**
 * Registro de Pago / Caja
 */
export interface PaymentRecord {
  id: string;
  booking_id?: string;
  booking_code?: string;
  customer_name: string;
  customer_phone?: string;
  service_name: string;
  amount_usd: number;
  amount_ves: number;
  payment_method: PaymentMethodType;
  reference?: string;
  bank?: string;
  status: 'verified' | 'pending_verification' | 'rejected';
  notes?: string;
  created_at: string;
}

/**
 * Insumos e Inventario
 */
export type InventoryCategory = 
  | 'quimicos' 
  | 'accesorios' 
  | 'herramientas' 
  | 'aromaterapia' 
  | 'otros';

export type InventoryUnit = 
  | 'litros' 
  | 'galones' 
  | 'unidades' 
  | 'paquetes' 
  | 'frascos'
  | 'cajas';

export interface InventoryItem {
  id: string;
  name: string;
  category: InventoryCategory;
  quantity: number;
  unit: InventoryUnit;
  min_stock_alert: number;
  cost_usd: number;
  supplier?: string;
  notes?: string;
  last_restocked?: string;
}

/**
 * Cuentas Receptoras de Pago AutoSpa
 */
export interface PaymentAccountConfig {
  pago_movil: {
    bank: string;
    phone: string;
    id_doc: string;
    account_holder: string;
  };
  zelle: {
    email: string;
    account_holder: string;
  };
  bank_transfer: {
    bank: string;
    account_number: string;
    account_holder: string;
    id_doc?: string;
  };
  binance_pay?: {
    pay_id: string;
    nickname: string;
  };
}

/**
 * Notificaciones y Alertas del Sistema
 */
export type NotificationType = 'booking' | 'payment' | 'stock' | 'tech' | 'system';

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  created_at: string;
  is_read: boolean;
  link?: string;
}

export interface NotificationSettingsConfig {
  whatsapp_enabled: boolean;
  whatsapp_business_phone: string;
  notify_on_new_booking: boolean;
  notify_on_tech_assigned: boolean;
  notify_on_tech_en_route: boolean;
  notify_on_service_completed: boolean;
  notify_on_payment_pending: boolean;
  notify_on_low_stock: boolean;
  email_notifications_enabled: boolean;
  admin_notification_email: string;
  sound_alerts_enabled: boolean;
  templates: {
    booking_confirmed: string;
    tech_en_route: string;
    service_completed: string;
  };
}




