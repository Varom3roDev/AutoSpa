import {
  Organization,
  User,
  Customer,
  Vehicle,
  CustomerAddress,
  ServiceCategory,
  Service,
  ServiceAddon,
  ServiceZone,
  TimeSlot,
  Booking,
  ExchangeRate
} from '../types';

export const EXCHANGE_RATE: ExchangeRate = {
  id: 'er_1',
  from_currency: 'USD',
  to_currency: 'VES',
  rate: 36.50,
  effective_date: new Date().toISOString()
};

export const ORGANIZATION: Organization = {
  id: 'org_1',
  name: 'AutoSpa Caracas',
  slug: 'autospa',
  phone: '+584121234567',
  email: 'contacto@autospa.com.ve',
  address: 'Av. Principal de Las Mercedes, Caracas',
  currency: 'USD',
  tax_rate: 0,
  settings: {
    working_hours: {
      0: { open: '08:00', close: '14:00', is_closed: false },
      1: { open: '07:00', close: '17:00', is_closed: false },
      2: { open: '07:00', close: '17:00', is_closed: false },
      3: { open: '07:00', close: '17:00', is_closed: false },
      4: { open: '07:00', close: '17:00', is_closed: false },
      5: { open: '07:00', close: '17:00', is_closed: false },
      6: { open: '08:00', close: '16:00', is_closed: false },
    },
    timezone: 'America/Caracas',
    booking_advance_hours: 2,
    cancellation_hours: 24,
    max_bookings_per_slot: 3
  }
};

export const MOCK_USERS: User[] = [
  {
    id: 'u_1',
    email: 'admin@autospa.com.ve',
    full_name: 'Carlos Rodríguez',
    phone: '+584141234567',
    role: 'admin'
  },
  {
    id: 'u_2',
    email: 'miguel@autospa.com.ve',
    full_name: 'Miguel Pérez',
    phone: '+584161234567',
    role: 'technician'
  },
  {
    id: 'u_3',
    email: 'jose@autospa.com.ve',
    full_name: 'José Hernández',
    phone: '+584241234567',
    role: 'technician'
  }
];

export const MOCK_ADDRESSES: CustomerAddress[] = [
  {
    id: 'addr_1',
    customer_id: 'c_1',
    label: 'Casa',
    address_line: 'Av. Francisco de Miranda, Edif. Parque',
    reference: 'Al lado de la panadería',
    city: 'Caracas',
    municipality: 'Chacao',
    zone_id: 'z_1',
    is_default: true
  },
  {
    id: 'addr_2',
    customer_id: 'c_1',
    label: 'Oficina',
    address_line: 'Calle París, Torre Empresarial',
    city: 'Caracas',
    municipality: 'Baruta',
    zone_id: 'z_2',
    is_default: false
  }
];

export const MOCK_VEHICLES: Vehicle[] = [
  {
    id: 'v_1',
    customer_id: 'c_1',
    plate: 'AB123CD',
    brand: 'Toyota',
    model: 'Corolla',
    year: 2020,
    color: 'Blanco',
    type: 'sedan',
    size_category: 'medium',
    is_default: true
  },
  {
    id: 'v_2',
    customer_id: 'c_1',
    plate: 'XYZ987',
    brand: 'Ford',
    model: 'Explorer',
    year: 2022,
    color: 'Negro',
    type: 'suv',
    size_category: 'large',
    is_default: false
  },
  {
    id: 'v_3',
    customer_id: 'c_1',
    plate: 'MOTO123',
    brand: 'Honda',
    model: 'CBR',
    year: 2021,
    color: 'Roja',
    type: 'motorcycle',
    size_category: 'small',
    is_default: false
  }
];

export const CUSTOMER: Customer = {
  id: 'c_1',
  email: 'ana@gmail.com',
  full_name: 'Ana Martínez',
  phone: '+584129876543',
  role: 'client',
  addresses: MOCK_ADDRESSES,
  vehicles: MOCK_VEHICLES
};

export const SERVICE_CATEGORIES: ServiceCategory[] = [
  {
    id: 'cat_1',
    name: 'Lavado Exterior',
    sort_order: 1,
    is_active: true
  },
  {
    id: 'cat_2',
    name: 'Limpieza Integral',
    sort_order: 2,
    is_active: true
  }
];

export const SERVICES: Service[] = [
  {
    id: 's_1',
    category_id: 'cat_1',
    name: 'Lavado Express',
    description: 'Lavado exterior rápido y eficiente.',
    short_description: 'Lavado exterior básico',
    includes: ['Lavado de carrocería', 'Limpieza de rines', 'Secado rápido'],
    excludes: ['Aspirado interior', 'Cera'],
    base_duration_minutes: 45,
    base_price_usd: 10,
    price_by_vehicle_size: {
      small: 8,
      medium: 10,
      large: 12,
      xlarge: 15
    },
    tax_rate: 0,
    min_technicians: 1,
    is_active: true,
    sort_order: 1
  },
  {
    id: 's_2',
    category_id: 'cat_2',
    name: 'Lavado Completo',
    description: 'Limpieza profunda de interior y exterior.',
    short_description: 'Exterior + Interior',
    includes: ['Lavado Express', 'Aspirado profundo', 'Limpieza de vidrios por dentro'],
    excludes: ['Cera', 'Desmanchado de tapicería'],
    base_duration_minutes: 90,
    base_price_usd: 20,
    price_by_vehicle_size: {
      small: 15,
      medium: 20,
      large: 25,
      xlarge: 30
    },
    tax_rate: 0,
    min_technicians: 1,
    is_active: true,
    sort_order: 2
  },
  {
    id: 's_3',
    category_id: 'cat_2',
    name: 'Lavado Premium',
    description: 'Detailing básico para tu vehículo.',
    short_description: 'El mejor cuidado para tu auto',
    includes: ['Lavado Completo', 'Aplicación de cera', 'Hidratación de plásticos'],
    excludes: ['Pulitura mecánica'],
    base_duration_minutes: 120,
    base_price_usd: 35,
    price_by_vehicle_size: {
      small: 25,
      medium: 35,
      large: 45,
      xlarge: 55
    },
    tax_rate: 0,
    min_technicians: 2,
    is_active: true,
    sort_order: 3
  },
  {
    id: 's_4',
    category_id: 'cat_2',
    name: 'Aspirado Profundo',
    description: 'Solo limpieza interior exhaustiva.',
    short_description: 'Interior impecable',
    includes: ['Aspirado de asientos', 'Aspirado de alfombras', 'Limpieza de tablero'],
    excludes: ['Lavado exterior'],
    base_duration_minutes: 45,
    base_price_usd: 15,
    price_by_vehicle_size: {
      small: 12,
      medium: 15,
      large: 20,
      xlarge: 25
    },
    tax_rate: 0,
    min_technicians: 1,
    is_active: true,
    sort_order: 4
  },
  {
    id: 's_5',
    category_id: 'cat_2',
    name: 'Desinfección Interior',
    description: 'Sanitización del habitáculo contra virus y bacterias.',
    short_description: 'Interior sanitizado',
    includes: ['Aplicación de ozono', 'Limpieza con desinfectante'],
    excludes: ['Aspirado profundo'],
    base_duration_minutes: 30,
    base_price_usd: 12,
    price_by_vehicle_size: {
      small: 10,
      medium: 12,
      large: 15,
      xlarge: 18
    },
    tax_rate: 0,
    min_technicians: 1,
    is_active: true,
    sort_order: 5
  }
];

export const ADDONS: ServiceAddon[] = [
  { id: 'ad_1', name: 'Aromatizante Premium', price_usd: 3, price_by_vehicle_size: null, duration_minutes: 0, is_active: true },
  { id: 'ad_2', name: 'Cera Líquida', price_usd: 8, price_by_vehicle_size: { small: 5, medium: 8, large: 10, xlarge: 12 }, duration_minutes: 15, is_active: true },
  { id: 'ad_3', name: 'Limpieza de Maletero', price_usd: 5, price_by_vehicle_size: null, duration_minutes: 10, is_active: true },
  { id: 'ad_4', name: 'Protección de Cauchos', price_usd: 6, price_by_vehicle_size: null, duration_minutes: 10, is_active: true },
  { id: 'ad_5', name: 'Limpieza de Motor', description: 'Realizada bajo riesgo del cliente', price_usd: 15, price_by_vehicle_size: null, duration_minutes: 30, is_active: true },
  { id: 'ad_6', name: 'Desmanchado de Tapicería', price_usd: 12, price_by_vehicle_size: null, duration_minutes: 40, is_active: true }
];

export const SERVICE_ZONES: ServiceZone[] = [
  { id: 'z_1', name: 'Chacao', municipalities: ['Chacao'], surcharge_usd: 0, avg_travel_minutes: 15, is_active: true },
  { id: 'z_2', name: 'Baruta', municipalities: ['Baruta'], surcharge_usd: 2, avg_travel_minutes: 20, is_active: true },
  { id: 'z_3', name: 'El Hatillo', municipalities: ['El Hatillo'], surcharge_usd: 5, avg_travel_minutes: 30, is_active: true },
  { id: 'z_4', name: 'Libertador Este', municipalities: ['Libertador'], surcharge_usd: 2, avg_travel_minutes: 20, is_active: true },
  { id: 'z_5', name: 'Libertador Oeste', municipalities: ['Libertador'], surcharge_usd: 3, avg_travel_minutes: 25, is_active: true },
  { id: 'z_6', name: 'Los Salias / San Antonio', municipalities: ['Los Salias'], surcharge_usd: 8, avg_travel_minutes: 45, is_active: true }
];

export const TIME_SLOTS: TimeSlot[] = [
  { id: 'ts_0', start_time: '07:00', end_time: '09:00', label: 'Mañana Temprano' },
  { id: 'ts_1', start_time: '09:00', end_time: '11:00', label: 'Media Mañana' },
  { id: 'ts_2', start_time: '11:00', end_time: '13:00', label: 'Mediodía' },
  { id: 'ts_3', start_time: '13:00', end_time: '15:00', label: 'Tarde Temprano' },
  { id: 'ts_4', start_time: '15:00', end_time: '17:00', label: 'Media Tarde' }
];

export const MOCK_BOOKINGS: Booking[] = [
  {
    id: 'b_1',
    code: 'BK-1001',
    customer_id: 'c_1',
    vehicle_id: 'v_1',
    address_id: 'addr_1',
    service_id: 's_2',
    addons: [{ addon_id: 'ad_1', name: 'Aromatizante Premium', price_usd: 3, quantity: 1 }],
    assigned_technician_id: 'u_2',
    status: 'completed',
    scheduled_date: '2026-09-21',
    scheduled_time_slot: '09:00-11:00',
    estimated_duration: 90,
    subtotal_usd: 23,
    discount_usd: 0,
    tax_usd: 0,
    total_usd: 23,
    total_ves: 839.50,
    exchange_rate: 36.50,
    created_at: '2026-09-20T10:00:00Z',
    updated_at: '2026-09-21T11:00:00Z'
  },
  {
    id: 'b_2',
    code: 'BK-1002',
    customer_id: 'c_1',
    vehicle_id: 'v_2',
    address_id: 'addr_1',
    service_id: 's_3',
    addons: [],
    assigned_technician_id: 'u_3',
    status: 'in_progress',
    scheduled_date: '2026-09-22',
    scheduled_time_slot: '15:00-17:00',
    estimated_duration: 120,
    subtotal_usd: 45,
    discount_usd: 0,
    tax_usd: 0,
    total_usd: 45,
    total_ves: 1642.50,
    exchange_rate: 36.50,
    created_at: '2026-09-21T15:00:00Z',
    updated_at: '2026-09-22T15:30:00Z'
  },
  {
    id: 'b_3',
    code: 'BK-1003',
    customer_id: 'c_1',
    vehicle_id: 'v_3',
    address_id: 'addr_2',
    service_id: 's_1',
    addons: [],
    status: 'confirmed',
    scheduled_date: '2026-09-23',
    scheduled_time_slot: '11:00-13:00',
    estimated_duration: 45,
    subtotal_usd: 10,
    discount_usd: 0,
    tax_usd: 0,
    total_usd: 10,
    total_ves: 365.00,
    exchange_rate: 36.50,
    created_at: '2026-09-22T08:00:00Z',
    updated_at: '2026-09-22T08:15:00Z'
  },
  {
    id: 'b_4',
    code: 'BK-1004',
    customer_id: 'c_1',
    vehicle_id: 'v_1',
    address_id: 'addr_1',
    service_id: 's_4',
    addons: [],
    status: 'pending_payment',
    scheduled_date: '2026-09-25',
    scheduled_time_slot: '09:00-11:00',
    estimated_duration: 45,
    subtotal_usd: 15,
    discount_usd: 0,
    tax_usd: 0,
    total_usd: 15,
    total_ves: 547.50,
    exchange_rate: 36.50,
    created_at: '2026-09-22T12:00:00Z',
    updated_at: '2026-09-22T12:00:00Z'
  },
  {
    id: 'b_5',
    code: 'BK-1005',
    customer_id: 'c_1',
    vehicle_id: 'v_2',
    address_id: 'addr_2',
    service_id: 's_2',
    addons: [{ addon_id: 'ad_4', name: 'Protección de Cauchos', price_usd: 6, quantity: 1 }],
    status: 'cancelled',
    scheduled_date: '2026-09-18',
    scheduled_time_slot: '13:00-15:00',
    estimated_duration: 90,
    subtotal_usd: 33,
    discount_usd: 0,
    tax_usd: 0,
    total_usd: 33,
    total_ves: 1204.50,
    exchange_rate: 36.50,
    created_at: '2026-09-15T10:00:00Z',
    updated_at: '2026-09-17T09:00:00Z'
  }
];
