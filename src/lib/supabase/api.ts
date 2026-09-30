import { createClient } from './client';
import type { 
  Service, 
  ServiceZone, 
  ServiceAddon, 
  Vehicle, 
  CustomerAddress, 
  Booking,
  BookingAddon,
  BookingStatus,
  AppSettings,
  Customer,
  User,
  PaymentRecord,
  PaymentAccountConfig,
  PaymentMethodType,
  InventoryItem,
  AppNotification,
  NotificationSettingsConfig
} from '@/lib/types';
import { SERVICES, SERVICE_ZONES, ADDONS } from '@/lib/data/mock-data';
import { normalizeTimeSlotId } from '@/lib/utils';

const supabase = createClient();

/**
 * SERVICIOS
 */
export async function fetchServices(): Promise<Service[]> {
  // 1. Check local storage cache
  let localList: Service[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_services_catalog');
      if (stored) {
        localList = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading autospa_services_catalog:', e);
    }
  }

  if (localList.length > 0) {
    return localList;
  }

  // 2. Fetch from Supabase
  try {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .order('sort_order', { ascending: true });

    if (!error && data && data.length > 0) {
      const servicesData = data as Service[];
      if (typeof window !== 'undefined') {
        localStorage.setItem('autospa_services_catalog', JSON.stringify(servicesData));
      }
      return servicesData;
    }
  } catch (err) {
    console.warn('Supabase fetchServices error:', err);
  }

  // 3. Fallback to mock services & seed local storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('autospa_services_catalog', JSON.stringify(SERVICES));
  }
  return SERVICES;
}

/**
 * ZONAS DE COBERTURA
 */
export async function fetchServiceZones(onlyActive: boolean = false): Promise<ServiceZone[]> {
  // 1. Check local storage cache
  let localZones: ServiceZone[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_zones_catalog');
      if (stored) {
        localZones = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading autospa_zones_catalog:', e);
    }
  }

  if (localZones.length > 0) {
    return onlyActive ? localZones.filter(z => z.is_active) : localZones;
  }

  // 2. Fetch from Supabase
  try {
    const query = supabase.from('service_zones').select('*');
    if (onlyActive) {
      query.eq('is_active', true);
    }
    const { data, error } = await query;

    if (!error && data && data.length > 0) {
      const zonesData = data as ServiceZone[];
      if (typeof window !== 'undefined') {
        localStorage.setItem('autospa_zones_catalog', JSON.stringify(zonesData));
      }
      return zonesData;
    }
  } catch (err) {
    console.warn('Supabase fetchServiceZones error:', err);
  }

  // 3. Fallback to mock zones & seed local storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('autospa_zones_catalog', JSON.stringify(SERVICE_ZONES));
  }
  return onlyActive ? SERVICE_ZONES.filter(z => z.is_active) : SERVICE_ZONES;
}

/**
 * EXTRAS / ADICIONALES
 */
export async function fetchServiceAddons(): Promise<ServiceAddon[]> {
  // 1. Check local storage cache
  let localAddons: ServiceAddon[] = [];
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_addons_catalog');
      if (stored) {
        localAddons = JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Error reading autospa_addons_catalog:', e);
    }
  }

  if (localAddons.length > 0) {
    return localAddons;
  }

  // 2. Fetch from Supabase
  try {
    const { data, error } = await supabase
      .from('service_addons')
      .select('*');

    if (!error && data && data.length > 0) {
      const addonsData = data as ServiceAddon[];
      if (typeof window !== 'undefined') {
        localStorage.setItem('autospa_addons_catalog', JSON.stringify(addonsData));
      }
      return addonsData;
    }
  } catch (err) {
    console.warn('Supabase fetchServiceAddons error:', err);
  }

  // 3. Fallback to mock addons & seed local storage
  if (typeof window !== 'undefined') {
    localStorage.setItem('autospa_addons_catalog', JSON.stringify(ADDONS));
  }
  return ADDONS;
}

/**
 * VEHÍCULOS
 */
export async function fetchCustomerVehicles(customerId?: string): Promise<Vehicle[]> {
  try {
    if (!customerId) return [];

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_customer_vehicles');
      } catch {}
    }

    // Consultar directamente a Supabase
    try {
      let query = supabase.from('vehicles').select('*');
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase fetchCustomerVehicles error:', error);
        return [];
      }
      return (data || []) as Vehicle[];
    } catch (sErr) {
      console.warn('Supabase fetchCustomerVehicles error:', sErr);
      return [];
    }
  } catch {
    return [];
  }
}

export async function insertVehicle(vehicle: Omit<Vehicle, 'id'>): Promise<Vehicle | null> {
  let createdVehicle: Vehicle | null = null;
  const tempId = `v_${Date.now()}`;

  // 1. Try Supabase insert
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .insert([vehicle])
      .select()
      .single();

    if (!error && data) {
      createdVehicle = data as Vehicle;
    }
  } catch (err) {
    console.warn('Could not insert vehicle to Supabase:', err);
  }

  if (!createdVehicle) {
    createdVehicle = {
      id: tempId,
      ...vehicle,
    };
  }

  // 2. Persist to local storage cache
  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('autospa_customer_vehicles') || '[]');
      const filtered = stored.filter((v: any) => v.plate?.toUpperCase() !== createdVehicle!.plate.toUpperCase());
      filtered.unshift(createdVehicle);
      localStorage.setItem('autospa_customer_vehicles', JSON.stringify(filtered));
    } catch (err) {
      console.warn('Error saving vehicle to local storage:', err);
    }
  }

  return createdVehicle;
}

export async function updateVehicle(vehicleId: string, updates: Partial<Vehicle>): Promise<Vehicle | null> {
  let updated: Vehicle | null = null;
  try {
    const { data, error } = await supabase
      .from('vehicles')
      .update(updates)
      .eq('id', vehicleId)
      .select()
      .single();

    if (!error && data) {
      updated = data as Vehicle;
    }
  } catch (err) {
    console.warn('Error updateVehicle in Supabase:', err);
  }

  // Update in localStorage
  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('autospa_customer_vehicles') || '[]');
      const index = stored.findIndex((v: any) => v.id === vehicleId || (updates.plate && v.plate?.toUpperCase() === updates.plate.toUpperCase()));
      if (index !== -1) {
        stored[index] = { ...stored[index], ...updates };
        updated = stored[index];
      } else if (!updated) {
        updated = { id: vehicleId, ...updates } as Vehicle;
        stored.push(updated);
      }
      localStorage.setItem('autospa_customer_vehicles', JSON.stringify(stored));
    } catch (err) {
      console.warn('Error updating vehicle in local storage:', err);
    }
  }

  return updated;
}

export async function deleteVehicle(vehicleId: string): Promise<boolean> {
  try {
    await supabase.from('vehicles').delete().eq('id', vehicleId);
  } catch (err) {
    console.warn('Error deleteVehicle Supabase:', err);
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('autospa_customer_vehicles') || '[]');
      const filtered = stored.filter((v: any) => v.id !== vehicleId);
      localStorage.setItem('autospa_customer_vehicles', JSON.stringify(filtered));
    } catch (err) {
      console.warn('Error deleting vehicle from local storage:', err);
    }
  }

  return true;
}

/**
 * DIRECCIONES
 */
export async function fetchCustomerAddresses(customerId?: string): Promise<CustomerAddress[]> {
  try {
    if (!customerId) return [];

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_customer_addresses');
      } catch {}
    }

    // Consultar directamente a Supabase
    try {
      let query = supabase.from('customer_addresses').select('*');
      if (customerId) {
        query = query.eq('customer_id', customerId);
      }
      const { data, error } = await query;
      if (error) {
        console.warn('Supabase fetchCustomerAddresses error:', error);
        return [];
      }
      return (data || []) as CustomerAddress[];
    } catch (sErr) {
      console.warn('Supabase fetchCustomerAddresses error:', sErr);
      return [];
    }
  } catch {
    return [];
  }
}

export async function insertCustomerAddress(address: Omit<CustomerAddress, 'id'>): Promise<CustomerAddress | null> {
  let createdAddr: CustomerAddress | null = null;
  const tempId = `addr_${Date.now()}`;

  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .insert([address])
      .select()
      .single();

    if (!error && data) {
      createdAddr = data as CustomerAddress;
    }
  } catch (err) {
    console.warn('Error insertCustomerAddress Supabase:', err);
  }

  if (!createdAddr) {
    createdAddr = {
      id: tempId,
      ...address,
    };
  }

  if (typeof window !== 'undefined') {
    try {
      const stored = JSON.parse(localStorage.getItem('autospa_customer_addresses') || '[]');
      const filtered = stored.filter((a: any) => a.id !== createdAddr!.id);
      filtered.unshift(createdAddr);
      localStorage.setItem('autospa_customer_addresses', JSON.stringify(filtered));
    } catch (err) {
      console.warn('Error saving address to storage:', err);
    }
  }

  return createdAddr;
}

export async function updateCustomerAddress(addressId: string, updates: Partial<CustomerAddress>): Promise<CustomerAddress | null> {
  try {
    const { data, error } = await supabase
      .from('customer_addresses')
      .update(updates)
      .eq('id', addressId)
      .select()
      .single();

    if (error) throw error;
    return data as CustomerAddress;
  } catch (err) {
    console.error('Error updateCustomerAddress:', err);
    return null;
  }
}

export async function deleteCustomerAddress(addressId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('customer_addresses')
      .delete()
      .eq('id', addressId);
    return !error;
  } catch (err) {
    console.error('Error deleteCustomerAddress:', err);
    return false;
  }
}

export async function setDefaultCustomerAddress(customerId: string, addressId: string): Promise<boolean> {
  try {
    await supabase
      .from('customer_addresses')
      .update({ is_default: false })
      .eq('customer_id', customerId);

    const { error } = await supabase
      .from('customer_addresses')
      .update({ is_default: true })
      .eq('id', addressId);

    return !error;
  } catch (err) {
    console.error('Error setDefaultCustomerAddress:', err);
    return false;
  }
}

/**
 * RESERVAS
 */
export async function fetchBookings(options?: { customerId?: string; technicianId?: string; status?: BookingStatus }): Promise<Booking[]> {
  try {
    // 1. Limpiar almacenamiento local antiguo de demo
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_customer_bookings');
      } catch {}
    }

    // 2. Consultar directamente a Supabase
    try {
      let query = supabase.from('bookings').select('*');
      if (options?.customerId) {
        query = query.eq('customer_id', options.customerId);
      }
      if (options?.technicianId) {
        query = query.eq('assigned_technician_id', options.technicianId);
      }
      if (options?.status) {
        query = query.eq('status', options.status);
      }
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.warn('Supabase fetchBookings error:', error);
        return [];
      }

      const now = Date.now();
      const HOLD_LIMIT_MS = 30 * 60 * 1000;
      const bookingsList: Booking[] = [];

      for (const b of (data || []) as Booking[]) {
        // Omitir reservas eliminadas por admin si están marcadas como tales
        if (b.status === 'cancelled' && b.notes && b.notes.includes('ORDEN_ELIMINADA_POR_ADMIN')) {
          continue;
        }

        // Auto-cancelar si expiró el plazo de 30 minutos sin pago reportado ni efectivo
        const isPaymentReported = b.notes && b.notes.includes('[PAGO_REPORTADO:');
        const isCash = b.notes && b.notes.includes('EFECTIVO-EN-SITIO');
        const createdAtMs = b.created_at ? new Date(b.created_at).getTime() : now;
        const isExpired = b.status === 'pending_payment' && !isPaymentReported && !isCash && (now - createdAtMs > HOLD_LIMIT_MS);

        if (isExpired) {
          b.status = 'cancelled';
          supabase
            .from('bookings')
            .update({ 
              status: 'cancelled', 
              notes: `${b.notes || ''}\n[AUTO_CANCELACION: 30 min expirados]` 
            })
            .eq('id', b.id)
            .then(() => {});
        }

        bookingsList.push(b);
      }

      return bookingsList;
    } catch (sErr) {
      console.warn('Supabase fetchBookings error:', sErr);
      return [];
    }
  } catch {
    return [];
  }
}

export async function fetchBookingById(id: string): Promise<Booking | null> {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) return null;
    const b = data as Booking;

    // Si fue eliminada por admin, no retornar la orden
    if (b.status === 'cancelled' && b.notes && b.notes.includes('ORDEN_ELIMINADA_POR_ADMIN')) {
      return null;
    }

    const now = Date.now();
    const HOLD_LIMIT_MS = 30 * 60 * 1000;
    const isPaymentReported = b.notes && b.notes.includes('[PAGO_REPORTADO:');
    const isCash = b.notes && b.notes.includes('EFECTIVO-EN-SITIO');
    const createdAtMs = b.created_at ? new Date(b.created_at).getTime() : now;
    const isExpired = b.status === 'pending_payment' && !isPaymentReported && !isCash && (now - createdAtMs > HOLD_LIMIT_MS);

    if (isExpired) {
      b.status = 'cancelled';
      supabase
        .from('bookings')
        .update({ 
          status: 'cancelled', 
          notes: `${b.notes || ''}\n[AUTO_CANCELACION: 30 min expirados]` 
        })
        .eq('id', b.id)
        .then(() => {});
    }

    return b;
  } catch {
    return null;
  }
}

export async function insertBooking(
  booking: Omit<Booking, 'id' | 'created_at' | 'updated_at' | 'addons'>,
  addons: BookingAddon[] = []
): Promise<Booking | null> {
  try {
    const payload: any = {
      code: booking.code,
      customer_id: booking.customer_id,
      vehicle_id: booking.vehicle_id,
      address_id: booking.address_id,
      service_id: booking.service_id,
      status: booking.status || 'pending_payment',
      scheduled_date: booking.scheduled_date,
      scheduled_time_slot: booking.scheduled_time_slot,
      estimated_duration: booking.estimated_duration || 60,
      subtotal_usd: booking.subtotal_usd,
      discount_usd: booking.discount_usd || 0,
      tax_usd: booking.tax_usd || 0,
      total_usd: booking.total_usd,
      total_ves: booking.total_ves,
      exchange_rate: booking.exchange_rate,
      notes: booking.notes || '',
    };

    if (booking.assigned_technician_id && booking.assigned_technician_id.length > 10) {
      payload.assigned_technician_id = booking.assigned_technician_id;
    }

    const { data: newBooking, error: bookingErr } = await supabase
      .from('bookings')
      .insert([payload])
      .select()
      .single();

    if (bookingErr || !newBooking) {
      console.error('Supabase bookingErr:', bookingErr);
      throw bookingErr;
    }

    if (addons.length > 0) {
      try {
        const addonRows = addons.map(a => ({
          booking_id: newBooking.id,
          addon_id: a.addon_id,
          name: a.name,
          price_usd: a.price_usd,
          quantity: a.quantity || 1,
        }));
        await supabase.from('booking_addons').insert(addonRows);
      } catch (aErr) {
        console.warn('Warning insert booking addons:', aErr);
      }
    }

    try {
      await supabase.from('booking_status_history').insert([{
        booking_id: newBooking.id,
        from_status: null,
        to_status: newBooking.status,
        notes: 'Reserva creada por el cliente',
      }]);
    } catch (hErr) {
      console.warn('Warning insert booking history:', hErr);
    }

    // Broadcast helper seguro para no bloquear canales
    sendRealtimeBroadcast('admin-dashboard-realtime', 'new_booking', { code: newBooking.code, id: newBooking.id });

    return newBooking as Booking;
  } catch (err) {
    console.error('Error insertBooking:', err);
    return null;
  }
}

function sendRealtimeBroadcast(topic: string, event: string, payload: any) {
  try {
    const existing = supabase.getChannels().find((c: any) => c.topic === `realtime:${topic}`);
    if (existing && (existing as any).state === 'joined') {
      existing.send({ type: 'broadcast', event, payload });
      return;
    }
    const temp = supabase.channel(topic);
    temp.subscribe((status: any) => {
      if (status === 'SUBSCRIBED') {
        temp.send({ type: 'broadcast', event, payload });
        setTimeout(() => {
          supabase.removeChannel(temp);
        }, 1500);
      }
    });
  } catch (err) {
    console.warn('Realtime broadcast error:', err);
  }
}

export async function updateBookingStatus(
  bookingId: string,
  newStatus: BookingStatus,
  notes?: string,
  changedBy?: string
): Promise<boolean> {
  try {
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select('code, customer_id, assigned_technician_id')
      .single();

    if (updateErr) throw updateErr;

    const bookingCode = updatedBooking?.code || `BK-${bookingId.slice(-4)}`;
    const customerId = updatedBooking?.customer_id;
    const technicianId = updatedBooking?.assigned_technician_id;

    await supabase.from('booking_status_history').insert([{
      booking_id: bookingId,
      to_status: newStatus,
      notes: notes || `Cambio de estado a ${newStatus}`,
      changed_by: changedBy,
    }]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('autospa_bookings_updated'));
    }

    // Broadcasts seguros
    sendRealtimeBroadcast('admin-dashboard-realtime', 'booking_updated', { bookingId, status: newStatus, code: bookingCode, customerId });
    sendRealtimeBroadcast('client-bookings-realtime', 'client_booking_updated', { bookingId, status: newStatus, code: bookingCode, customerId, notes });
    sendRealtimeBroadcast('tech-assignments-realtime', 'tech_order_updated', { bookingId, status: newStatus, code: bookingCode, technicianId });

    return true;
  } catch (err) {
    console.error('Error updateBookingStatus:', err);
    return false;
  }
}

export async function rescheduleBooking(
  bookingId: string,
  newDate: string,
  newTimeSlot: string,
  changedBy?: string
): Promise<boolean> {
  try {
    const b = await fetchBookingById(bookingId);
    const oldDate = b?.scheduled_date || '';
    const oldSlot = b?.scheduled_time_slot || '';
    const currentStatus = b?.status || 'confirmed';

    // Limpiar notas previas de reprogramación y añadir nota informativa
    const cleanNotes = (b?.notes || '').replace(/\[REPROGRAMADA:[\s\S]*?\]/g, '').trim();
    const updatedNotes = cleanNotes 
      ? `${cleanNotes}\n[REPROGRAMADA: de ${oldDate} (${oldSlot}) a ${newDate} (${newTimeSlot})]`
      : `[REPROGRAMADA: de ${oldDate} (${oldSlot}) a ${newDate} (${newTimeSlot})]`;

    const { error } = await supabase
      .from('bookings')
      .update({
        scheduled_date: newDate,
        scheduled_time_slot: newTimeSlot,
        notes: updatedNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId);

    if (error) throw error;

    await supabase.from('booking_status_history').insert([{
      booking_id: bookingId,
      to_status: currentStatus,
      notes: `Reserva reprogramada de ${oldDate} (${oldSlot}) para ${newDate} (${newTimeSlot})`,
      changed_by: changedBy,
    }]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('autospa_booking_updated'));
      window.dispatchEvent(new CustomEvent('autospa_booking_rescheduled', {
        detail: {
          booking_id: bookingId,
          code: b?.code || `BK-${bookingId.slice(-4)}`,
          old_date: oldDate,
          old_slot: oldSlot,
          new_date: newDate,
          new_slot: newTimeSlot,
          technician_id: b?.assigned_technician_id,
        }
      }));
    }

    try {
      const channel = supabase.channel('admin-dashboard-realtime');
      await channel.send({
        type: 'broadcast',
        event: 'booking_rescheduled',
        payload: {
          booking_id: bookingId,
          code: b?.code || `BK-${bookingId.slice(-4)}`,
          old_date: oldDate,
          old_slot: oldSlot,
          new_date: newDate,
          new_slot: newTimeSlot,
          technician_id: b?.assigned_technician_id,
        }
      });
    } catch {}

    sendRealtimeBroadcast('admin-dashboard-realtime', 'booking_updated', { bookingId, date: newDate });

    return true;
  } catch (err) {
    console.error('Error rescheduleBooking:', err);
    return false;
  }
}

/**
 * Consulta las franjas horarias ocupadas para una fecha determinada
 */
export async function fetchBookedTimeSlots(date: string, excludeBookingId?: string): Promise<string[]> {
  if (!date) return [];
  try {
    const params = new URLSearchParams({ date });
    if (excludeBookingId) params.append('excludeBookingId', excludeBookingId);

    const res = await fetch(`/api/bookings/availability?${params.toString()}`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data.bookedSlots)) {
        return data.bookedSlots;
      }
    }
  } catch (apiErr) {
    console.warn('API availability fetch failed, falling back to direct query:', apiErr);
  }

  try {
    let query = supabase
      .from('bookings')
      .select('id, scheduled_date, scheduled_time_slot, status, notes, created_at')
      .eq('scheduled_date', date)
      .neq('status', 'cancelled');

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data, error } = await query;
    if (!error && data) {
      const slots: string[] = [];
      const now = Date.now();
      const HOLD_LIMIT_MS = 30 * 60 * 1000;

      data.forEach((b: any) => {
        const isPaymentReported = b.notes && b.notes.includes('[PAGO_REPORTADO:');
        const createdAtMs = b.created_at ? new Date(b.created_at).getTime() : now;
        const isExpired = b.status === 'pending_payment' && !isPaymentReported && (now - createdAtMs > HOLD_LIMIT_MS);

        if (!isExpired) {
          const norm = normalizeTimeSlotId(b.scheduled_time_slot);
          if (norm && !slots.includes(norm)) slots.push(norm);
        }
      });
      return slots;
    }
  } catch (err) {
    console.warn('Direct Supabase booked slots query error:', err);
  }

  return [];
}

export async function assignBookingTechnician(
  bookingId: string,
  technicianId: string,
  changedBy?: string
): Promise<boolean> {
  try {
    const { data: updatedBooking, error: updateErr } = await supabase
      .from('bookings')
      .update({
        assigned_technician_id: technicianId,
        status: 'assigned',
        updated_at: new Date().toISOString(),
      })
      .eq('id', bookingId)
      .select('code, customer_id')
      .single();

    if (updateErr) throw updateErr;

    const bookingCode = updatedBooking?.code || `BK-${bookingId.slice(-4)}`;
    const customerId = updatedBooking?.customer_id;

    await supabase.from('booking_status_history').insert([{
      booking_id: bookingId,
      to_status: 'assigned',
      notes: 'Técnico asignado a la reserva',
      changed_by: changedBy,
    }]);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('autospa_bookings_updated'));
    }

    // Notificar en tiempo real al técnico asignado, admin y cliente
    sendRealtimeBroadcast('tech-assignments-realtime', 'tech_assigned', { bookingId, technicianId, code: bookingCode });
    sendRealtimeBroadcast('admin-dashboard-realtime', 'booking_updated', { bookingId, status: 'assigned', technicianId, code: bookingCode });
    sendRealtimeBroadcast('client-bookings-realtime', 'client_booking_updated', { bookingId, status: 'assigned', code: bookingCode, customerId });

    return true;
  } catch (err) {
    console.error('Error assignBookingTechnician:', err);
    return false;
  }
}

export async function deleteBooking(bookingId: string): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_customer_bookings');
        localStorage.removeItem('autospa_payments_records');
      } catch {}
    }

    // 1. Marcar como cancelada y eliminada inmediatamente en Supabase
    try {
      await supabase.from('bookings').update({
        status: 'cancelled',
        notes: 'ORDEN_ELIMINADA_POR_ADMIN',
        updated_at: new Date().toISOString()
      }).eq('id', bookingId);
    } catch (uErr) {
      console.warn('Update to cancelled warning:', uErr);
    }

    // 2. Intentar eliminación física directa desde cliente autenticado
    try {
      await supabase.from('booking_addons').delete().eq('booking_id', bookingId);
      await supabase.from('booking_status_history').delete().eq('booking_id', bookingId);
      await supabase.from('bookings').delete().eq('id', bookingId);
    } catch (bErr) {
      console.warn('Direct client delete warning:', bErr);
    }

    // 3. Llamar a ruta de servidor
    try {
      await fetch('/api/admin/bookings/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId }),
      });
    } catch (apiErr) {
      console.warn('Server delete call warning:', apiErr);
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('autospa_bookings_updated'));
      window.dispatchEvent(new Event('autospa_booking_updated'));
    }

    return true;
  } catch (err) {
    console.error('Error deleteBooking:', err);
    return false;
  }
}

export async function deleteAllBookings(): Promise<boolean> {
  try {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_customer_bookings');
        localStorage.removeItem('autospa_payments_records');
      } catch {}
    }

    const res = await fetch('/api/admin/bookings/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookingId: 'ALL' }),
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('autospa_bookings_updated'));
    }

    return res.ok;
  } catch (err) {
    console.error('Error deleteAllBookings:', err);
    return false;
  }
}

/**
 * CONFIGURACIÓN GLOBAL / TASA BCV / BANNER
 */
const DEFAULT_APP_SETTINGS: AppSettings = {
  id: 'default',
  bcv_exchange_rate: 36.50,
  home_banner_title: 'Lavado ecológico y premium',
  home_banner_text: 'Ahorramos hasta 200L de agua por servicio en Caracas',
  support_whatsapp: '+58 416 6315114',
};

export async function fetchAppSettings(): Promise<AppSettings> {
  let activeSettings = { ...DEFAULT_APP_SETTINGS };

  // 1. Try local server API (multi-device sync on network)
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/settings', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data && typeof data.bcv_exchange_rate === 'number') {
          activeSettings = { ...activeSettings, ...data };
          localStorage.setItem('autospa_global_settings', JSON.stringify(activeSettings));
          return activeSettings;
        }
      }
    } catch {}
  }

  // 2. Read from localStorage fallback
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_global_settings');
      if (stored) {
        const parsed = JSON.parse(stored);
        activeSettings = { ...activeSettings, ...parsed };
      }
    } catch (err) {
      console.warn('Error reading autospa_global_settings:', err);
    }
  }

  // 3. Try Supabase if table exists
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('id', 'default')
      .single();

    if (!error && data) {
      activeSettings = { ...activeSettings, ...data };
    }
  } catch {}

  return activeSettings;
}

export async function updateAppSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const current = await fetchAppSettings();
  const mergedSettings: AppSettings = {
    ...current,
    ...settings,
    updated_at: new Date().toISOString(),
  };

  // 1. Save to local server API for multi-device sync
  if (typeof window !== 'undefined') {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mergedSettings),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.settings) {
          Object.assign(mergedSettings, json.settings);
        }
      }
    } catch (apiErr) {
      console.warn('Error sending settings to server API:', apiErr);
    }

    try {
      localStorage.setItem('autospa_global_settings', JSON.stringify(mergedSettings));
      window.dispatchEvent(new Event('autospa_settings_updated'));
    } catch (err) {
      console.warn('Error saving settings to localStorage:', err);
    }
  }

  // 2. Try Supabase upsert
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .upsert({
        id: 'default',
        ...settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      return data as AppSettings;
    }
  } catch (err) {
    console.warn('Could not upsert to Supabase app_settings:', err);
  }

  return mergedSettings;
}

/**
 * SERVICIOS - CRUD ADMIN
 */
export async function insertService(service: Service): Promise<Service | null> {
  const serviceWithId = {
    ...service,
    id: service.id || `srv_${Date.now()}`,
  };

  // 1. Save to local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_services_catalog');
      let list: Service[] = stored ? JSON.parse(stored) : [...SERVICES];
      const filtered = list.filter(s => s.id !== serviceWithId.id);
      filtered.push(serviceWithId);
      localStorage.setItem('autospa_services_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_services_updated'));
    } catch (err) {
      console.warn('Error saving service to local storage:', err);
    }
  }

  // 2. Try Supabase insert (strip category_id because column does not exist on table)
  try {
    const { category_id, ...payload } = serviceWithId as any;
    const { data, error } = await supabase
      .from('services')
      .insert([payload])
      .select()
      .single();

    if (!error && data) {
      return data as Service;
    }
  } catch (err) {
    console.warn('Supabase insertService warn (saved locally):', err);
  }

  return serviceWithId;
}

export async function updateService(serviceId: string, updates: Partial<Service>): Promise<Service | null> {
  let updatedService: Service | null = null;

  // 1. Update in local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_services_catalog');
      let list: Service[] = stored ? JSON.parse(stored) : [...SERVICES];
      const index = list.findIndex(s => s.id === serviceId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updatedService = list[index];
      } else {
        updatedService = { id: serviceId, ...updates } as Service;
        list.push(updatedService);
      }
      localStorage.setItem('autospa_services_catalog', JSON.stringify(list));
      window.dispatchEvent(new Event('autospa_services_updated'));
    } catch (err) {
      console.warn('Error updating service in local storage:', err);
    }
  }

  // 2. Try Supabase update
  try {
    const { category_id, ...payload } = updates as any;
    const { data, error } = await supabase
      .from('services')
      .update(payload)
      .eq('id', serviceId)
      .select()
      .single();

    if (!error && data) {
      return data as Service;
    }
  } catch (err) {
    console.warn('Supabase updateService warn:', err);
  }

  return updatedService;
}

export async function deleteService(serviceId: string): Promise<boolean> {
  // 1. Remove from local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_services_catalog');
      let list: Service[] = stored ? JSON.parse(stored) : [...SERVICES];
      const filtered = list.filter(s => s.id !== serviceId);
      localStorage.setItem('autospa_services_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_services_updated'));
    } catch (err) {
      console.warn('Error deleting service from local storage:', err);
    }
  }

  // 2. Try Supabase delete
  try {
    await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);
  } catch (err) {
    console.warn('Supabase deleteService warn:', err);
  }

  return true;
}

/**
 * EXTRAS / ADDONS - CRUD ADMIN
 */
export async function insertAddon(addon: ServiceAddon): Promise<ServiceAddon | null> {
  const addonWithId = {
    ...addon,
    id: addon.id || `add_${Date.now()}`,
  };

  // 1. Save to local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_addons_catalog');
      let list: ServiceAddon[] = stored ? JSON.parse(stored) : [...ADDONS];
      const filtered = list.filter(a => a.id !== addonWithId.id);
      filtered.push(addonWithId);
      localStorage.setItem('autospa_addons_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_addons_updated'));
    } catch (err) {
      console.warn('Error saving addon to local storage:', err);
    }
  }

  // 2. Try Supabase insert
  try {
    const { data, error } = await supabase
      .from('service_addons')
      .insert([addonWithId])
      .select()
      .single();

    if (!error && data) {
      return data as ServiceAddon;
    }
  } catch (err) {
    console.warn('Supabase insertAddon warn (saved locally):', err);
  }

  return addonWithId;
}

export async function updateAddon(addonId: string, updates: Partial<ServiceAddon>): Promise<ServiceAddon | null> {
  let updatedAddon: ServiceAddon | null = null;

  // 1. Update in local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_addons_catalog');
      let list: ServiceAddon[] = stored ? JSON.parse(stored) : [...ADDONS];
      const index = list.findIndex(a => a.id === addonId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updatedAddon = list[index];
      } else {
        updatedAddon = { id: addonId, ...updates } as ServiceAddon;
        list.push(updatedAddon);
      }
      localStorage.setItem('autospa_addons_catalog', JSON.stringify(list));
      window.dispatchEvent(new Event('autospa_addons_updated'));
    } catch (err) {
      console.warn('Error updating addon in local storage:', err);
    }
  }

  // 2. Try Supabase update
  try {
    const { data, error } = await supabase
      .from('service_addons')
      .update(updates)
      .eq('id', addonId)
      .select()
      .single();

    if (!error && data) {
      return data as ServiceAddon;
    }
  } catch (err) {
    console.warn('Supabase updateAddon warn:', err);
  }

  return updatedAddon;
}

export async function deleteAddon(addonId: string): Promise<boolean> {
  // 1. Remove from local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_addons_catalog');
      let list: ServiceAddon[] = stored ? JSON.parse(stored) : [...ADDONS];
      const filtered = list.filter(a => a.id !== addonId);
      localStorage.setItem('autospa_addons_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_addons_updated'));
    } catch (err) {
      console.warn('Error deleting addon from local storage:', err);
    }
  }

  // 2. Try Supabase delete
  try {
    await supabase
      .from('service_addons')
      .delete()
      .eq('id', addonId);
  } catch (err) {
    console.warn('Supabase deleteAddon warn:', err);
  }

  return true;
}

/**
 * ZONAS DE COBERTURA - CRUD ADMIN
 */
export async function insertServiceZone(zone: ServiceZone): Promise<ServiceZone | null> {
  const zoneWithId: ServiceZone = {
    ...zone,
    id: zone.id || `z_${Date.now()}`,
  };

  // 1. Local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_zones_catalog');
      let list: ServiceZone[] = stored ? JSON.parse(stored) : [...SERVICE_ZONES];
      const filtered = list.filter(z => z.id !== zoneWithId.id);
      filtered.push(zoneWithId);
      localStorage.setItem('autospa_zones_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_zones_updated'));
    } catch (err) {
      console.warn('Error saving zone locally:', err);
    }
  }

  // 2. Try Supabase
  try {
    const { data, error } = await supabase
      .from('service_zones')
      .insert([zoneWithId])
      .select()
      .single();

    if (!error && data) {
      return data as ServiceZone;
    }
  } catch (err) {
    console.warn('Supabase insertServiceZone warn (saved locally):', err);
  }

  return zoneWithId;
}

export async function updateServiceZone(zoneId: string, updates: Partial<ServiceZone>): Promise<ServiceZone | null> {
  let updatedZone: ServiceZone | null = null;

  // 1. Local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_zones_catalog');
      let list: ServiceZone[] = stored ? JSON.parse(stored) : [...SERVICE_ZONES];
      const index = list.findIndex(z => z.id === zoneId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updatedZone = list[index];
      } else {
        updatedZone = { id: zoneId, name: '', municipalities: [], surcharge_usd: 0, avg_travel_minutes: 15, is_active: true, ...updates } as ServiceZone;
        list.push(updatedZone);
      }
      localStorage.setItem('autospa_zones_catalog', JSON.stringify(list));
      window.dispatchEvent(new Event('autospa_zones_updated'));
    } catch (err) {
      console.warn('Error updating zone locally:', err);
    }
  }

  // 2. Try Supabase
  try {
    const { data, error } = await supabase
      .from('service_zones')
      .update(updates)
      .eq('id', zoneId)
      .select()
      .single();

    if (!error && data) {
      return data as ServiceZone;
    }
  } catch (err) {
    console.warn('Supabase updateServiceZone warn:', err);
  }

  return updatedZone;
}

export async function deleteServiceZone(zoneId: string): Promise<boolean> {
  // 1. Local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_zones_catalog');
      let list: ServiceZone[] = stored ? JSON.parse(stored) : [...SERVICE_ZONES];
      const filtered = list.filter(z => z.id !== zoneId);
      localStorage.setItem('autospa_zones_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_zones_updated'));
    } catch (err) {
      console.warn('Error deleting zone locally:', err);
    }
  }

  // 2. Try Supabase
  try {
    await supabase
      .from('service_zones')
      .delete()
      .eq('id', zoneId);
  } catch (err) {
    console.warn('Supabase deleteServiceZone warn:', err);
  }

  return true;
}

/**
 * CLIENTES ADMIN (Reales desde Supabase Profiles)
 */
export async function fetchAdminClients(): Promise<Customer[]> {
  try {
    const clientsMap = new Map<string, Customer>();

    // 1. Limpiar almacenamiento local obsoleto
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_registered_clients');
      } catch {}
    }

    // 2. Consultar directamente a la tabla profiles de Supabase
    try {
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'client')
        .order('created_at', { ascending: false });

      if (error) {
        console.warn('Supabase fetchAdminClients error:', error);
      }

      if (profiles && profiles.length > 0) {
        for (const p of profiles) {
          clientsMap.set(p.id, {
            id: p.id,
            email: p.email,
            full_name: p.full_name || p.email?.split('@')[0] || 'Cliente',
            phone: p.phone || '',
            birth_date: p.birth_date,
            avatar_url: p.avatar_url,
            role: 'client',
            vehicles: [],
            addresses: [],
          });
        }
      }
    } catch (pErr) {
      console.warn('Profiles fetch error:', pErr);
    }



    // 4. Fetch live vehicles & addresses from both Supabase and localStorage
    const allVehiclesMap = new Map<string, Vehicle>();
    if (typeof window !== 'undefined') {
      try {
        const storedV = localStorage.getItem('autospa_customer_vehicles');
        if (storedV) {
          const vList: Vehicle[] = JSON.parse(storedV);
          vList.forEach((v) => allVehiclesMap.set(v.plate.toUpperCase(), v));
        }
      } catch (err) {
        console.warn('Error reading stored vehicles:', err);
      }
    }
    try {
      const { data: vData } = await supabase.from('vehicles').select('*');
      if (vData) vData.forEach((v: Vehicle) => allVehiclesMap.set(v.plate.toUpperCase(), v));
    } catch {}

    const allVehiclesList = Array.from(allVehiclesMap.values());

    const allAddressesMap = new Map<string, CustomerAddress>();
    if (typeof window !== 'undefined') {
      try {
        const storedA = localStorage.getItem('autospa_customer_addresses');
        if (storedA) {
          const aList: CustomerAddress[] = JSON.parse(storedA);
          aList.forEach((a) => allAddressesMap.set(a.id, a));
        }
      } catch (err) {}
    }
    try {
      const { data: aData } = await supabase.from('customer_addresses').select('*');
      if (aData) aData.forEach((a: CustomerAddress) => allAddressesMap.set(a.id, a));
    } catch {}

    const allAddressesList = Array.from(allAddressesMap.values());

    const result: Customer[] = Array.from(clientsMap.values()).map((c) => {
      const customerVehicles = allVehiclesList.filter((v) => v.customer_id === c.id);
      const customerAddresses = allAddressesList.filter((a) => a.customer_id === c.id);
      return {
        ...c,
        vehicles: customerVehicles,
        addresses: customerAddresses,
      };
    });

    return result;
  } catch {
    return [];
  }
}

export async function fetchAdminTechnicians(): Promise<User[]> {
  // 1. Limpiar caché residual antiguo de demo en el navegador si existe
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('autospa_technicians_catalog');
    } catch {}
  }

  // 2. Consultar directamente a la base de datos Supabase
  try {
    const { data: techProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'technician')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchAdminTechnicians error:', error);
      return [];
    }

    if (!techProfiles || techProfiles.length === 0) {
      return [];
    }

    return (techProfiles as any[]).map((p: any) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name || p.email?.split('@')[0] || 'Técnico',
      phone: p.phone || '',
      birth_date: p.birth_date,
      avatar_url: p.avatar_url,
      role: 'technician',
    }));
  } catch (err) {
    console.warn('Supabase fetchAdminTechnicians error:', err);
    return [];
  }
}

export async function insertTechnician(
  tech: Omit<User, 'id' | 'role'> & { id?: string; avatar_url?: string; password?: string }
): Promise<User | null> {
  const cleanEmail = tech.email.trim().toLowerCase();
  const cleanPhone = (tech.phone || '').trim();
  const cleanFullName = tech.full_name.trim();
  const password = tech.password || 'AutoSpa2026*';

  // Registrar en Supabase Auth y en public.profiles mediante el endpoint administrativo
  const res = await fetch('/api/admin/technicians', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: cleanFullName,
      email: cleanEmail,
      phone: cleanPhone,
      password: password,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    let msg = data.error || 'Error al registrar técnico';
    if (msg.includes('already registered') || msg.includes('unique')) {
      msg = 'Ya existe un usuario registrado con este correo electrónico.';
    }
    throw new Error(msg);
  }

  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('autospa_technicians_catalog');
      window.dispatchEvent(new Event('autospa_technicians_updated'));
    } catch {}
  }

  return {
    id: data.user?.id || tech.id || `tech_${Date.now()}`,
    email: cleanEmail,
    full_name: cleanFullName,
    phone: cleanPhone,
    role: 'technician',
  };
}

export async function updateTechnician(techId: string, updates: Partial<User>): Promise<User | null> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({
        full_name: updates.full_name,
        phone: updates.phone,
        updated_at: new Date().toISOString(),
      })
      .eq('id', techId)
      .select()
      .maybeSingle();

    if (error) {
      console.warn('Supabase updateTechnician error:', error);
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('autospa_technicians_catalog');
        window.dispatchEvent(new Event('autospa_technicians_updated'));
      } catch {}
    }

    return data as User | null;
  } catch (err) {
    console.warn('Error updateTechnician:', err);
    return null;
  }
}

export async function deleteTechnician(techId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('autospa_technicians_catalog');
      window.dispatchEvent(new Event('autospa_technicians_updated'));
    } catch {}
  }

  try {
    const { error } = await supabase.from('profiles').delete().eq('id', techId);
    if (error) {
      console.warn('Supabase deleteTechnician error:', error);
    }
  } catch (err) {
    console.warn('Supabase deleteTechnician error:', err);
  }

  return true;
}

/**
 * PAGOS Y CAJA - CONTROL FINANCIERO
 */
const DEFAULT_PAYMENT_ACCOUNTS: PaymentAccountConfig = {
  pago_movil: {
    bank: 'Banesco (0134)',
    phone: '0416-6315114',
    id_doc: 'V-17894562',
    account_holder: 'AutoSpa Caracas C.A.',
  },
  zelle: {
    email: 'pagos@autospa.com.ve',
    account_holder: 'AutoSpa Services LLC',
  },
  bank_transfer: {
    bank: 'Banesco Banco Universal',
    account_number: '0134-0012-34-1234567890',
    account_holder: 'AutoSpa Caracas C.A.',
    id_doc: 'J-50123456-7',
  },
};

export interface ReportedPaymentData {
  method: PaymentMethodType;
  reference?: string;
  bank?: string;
  amount_usd?: number;
  amount_ves?: number;
  notes?: string;
  reported_at: string;
}

export function parseBookingPaymentData(notes?: string): ReportedPaymentData | null {
  if (!notes) return null;
  const match = notes.match(/\[PAGO_REPORTADO:\s*(\{[\s\S]*?\})\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as ReportedPaymentData;
  } catch {
    return null;
  }
}

export async function fetchPaymentAccountsConfig(): Promise<PaymentAccountConfig> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_payment_accounts');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.binance_pay) {
          delete parsed.binance_pay;
        }
        return parsed;
      }
    } catch (err) {
      console.warn('Error reading payment accounts:', err);
    }
  }
  return DEFAULT_PAYMENT_ACCOUNTS;
}

export async function updatePaymentAccountsConfig(config: PaymentAccountConfig): Promise<PaymentAccountConfig> {
  if (typeof window !== 'undefined') {
    try {
      const cleanConfig = { ...config };
      delete cleanConfig.binance_pay;
      localStorage.setItem('autospa_payment_accounts', JSON.stringify(cleanConfig));
      window.dispatchEvent(new Event('autospa_payment_accounts_updated'));
    } catch (err) {
      console.warn('Error updating payment accounts:', err);
    }
  }
  return config;
}

export async function reportBookingPayment(
  bookingId: string,
  paymentData: Omit<ReportedPaymentData, 'reported_at'>
): Promise<boolean> {
  try {
    const b = await fetchBookingById(bookingId);
    if (!b) return false;

    const reportedPayment: ReportedPaymentData = {
      ...paymentData,
      reported_at: new Date().toISOString(),
    };

    // Clean existing payment tag if any, then append new tag
    const baseNotes = (b.notes || '').replace(/\[PAGO_REPORTADO:[\s\S]*?\]/g, '').trim();
    const newNotes = baseNotes 
      ? `${baseNotes}\n[PAGO_REPORTADO: ${JSON.stringify(reportedPayment)}]`
      : `[PAGO_REPORTADO: ${JSON.stringify(reportedPayment)}]`;

    // Update in Supabase
    const { error: updErr } = await supabase
      .from('bookings')
      .update({
        notes: newNotes,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId);

    if (updErr) {
      console.warn('Error updating booking payment in Supabase:', updErr);
    }

    // Fetch client to attach real name
    let clientName = 'Cliente';
    let clientPhone = '';
    try {
      const clients = await fetchAdminClients();
      const cl = clients.find(c => c.id === b.customer_id);
      if (cl) {
        clientName = cl.full_name;
        clientPhone = cl.phone;
      }
    } catch {}

    // Insert payment record for cash control
    await insertPaymentRecord({
      booking_id: b.id,
      booking_code: b.code || `BK-${b.id.slice(-4)}`,
      customer_name: clientName,
      customer_phone: clientPhone,
      service_name: 'Servicio AutoSpa',
      amount_usd: paymentData.amount_usd || b.total_usd,
      amount_ves: paymentData.amount_ves || b.total_ves,
      payment_method: paymentData.method,
      reference: paymentData.reference,
      bank: paymentData.bank || 'Banesco',
      status: 'pending_verification',
      notes: paymentData.notes || '',
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('autospa_payments_updated'));
      window.dispatchEvent(new Event('autospa_booking_updated'));
      window.dispatchEvent(new CustomEvent('autospa_payment_reported', {
        detail: {
          booking_id: b.id,
          code: b.code || `BK-${b.id.slice(-4)}`,
          customer_name: clientName,
          amount_usd: paymentData.amount_usd || b.total_usd,
          amount_ves: paymentData.amount_ves || b.total_ves,
          method: paymentData.method,
          reference: paymentData.reference,
          bank: paymentData.bank,
        }
      }));
    }

    // Broadcast across Supabase channels to instantly notify admin
    try {
      const channel = supabase.channel('admin-dashboard-realtime');
      await channel.send({
        type: 'broadcast',
        event: 'payment_reported',
        payload: {
          booking_id: b.id,
          code: b.code || `BK-${b.id.slice(-4)}`,
          customer_name: clientName,
          amount_usd: paymentData.amount_usd || b.total_usd,
          amount_ves: paymentData.amount_ves || b.total_ves,
          method: paymentData.method,
          reference: paymentData.reference,
          bank: paymentData.bank,
        }
      });
    } catch (bcErr) {
      console.warn('Realtime broadcast warning:', bcErr);
    }

    return true;
  } catch (err) {
    console.error('Error reportBookingPayment:', err);
    return false;
  }
}

export async function fetchPayments(): Promise<PaymentRecord[]> {
  const paymentsMap = new Map<string, PaymentRecord>();

  // 1. Limpiar pagos demo residuales
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('autospa_payments_records');
    } catch {}
  }

  // 2. Derive payments from bookings
  try {
    const [bookings, clients, services, settings] = await Promise.all([
      fetchBookings(),
      fetchAdminClients(),
      fetchServices(),
      fetchAppSettings(),
    ]);

    const rate = settings.bcv_exchange_rate || 36.5;

    for (const b of bookings) {
      const paymentId = `pay_${b.id}`;
      if (!paymentsMap.has(paymentId)) {
        const client = clients.find(c => c.id === b.customer_id);
        const service = services.find(s => s.id === b.service_id);
        const isPaid = !['pending_payment', 'cancelled'].includes(b.status);
        const reportedInfo = parseBookingPaymentData(b.notes);

        paymentsMap.set(paymentId, {
          id: paymentId,
          booking_id: b.id,
          booking_code: b.code || `BK-${b.id.slice(-4)}`,
          customer_name: client?.full_name || 'Cliente',
          customer_phone: client?.phone || '',
          service_name: service?.name || 'Servicio de Lavado',
          amount_usd: reportedInfo?.amount_usd || b.total_usd,
          amount_ves: reportedInfo?.amount_ves || b.total_ves || b.total_usd * rate,
          payment_method: reportedInfo?.method || (b.payment_method === 'cash' ? 'efectivo_usd' : 'pago_movil'),
          reference: reportedInfo?.reference || (isPaid ? `REF-${b.code?.replace(/\D/g, '') || '9872'}` : undefined),
          bank: reportedInfo?.bank || 'Banesco',
          status: isPaid ? 'verified' : (reportedInfo ? 'pending_verification' : 'pending_verification'),
          notes: reportedInfo?.notes || b.notes,
          created_at: reportedInfo?.reported_at || b.created_at || new Date().toISOString(),
        });
      }
    }
  } catch (err) {
    console.warn('Error syncing payments from bookings:', err);
  }

  return Array.from(paymentsMap.values()).sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function insertPaymentRecord(record: Omit<PaymentRecord, 'id' | 'created_at'>): Promise<PaymentRecord> {
  const newRecord: PaymentRecord = {
    ...record,
    id: `pay_${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_payments_records');
      let list: PaymentRecord[] = stored ? JSON.parse(stored) : [];
      list.unshift(newRecord);
      localStorage.setItem('autospa_payments_records', JSON.stringify(list));
      window.dispatchEvent(new Event('autospa_payments_updated'));
    } catch (err) {
      console.warn('Error saving payment record:', err);
    }
  }

  return newRecord;
}

export async function verifyPaymentRecord(paymentId: string, bookingId?: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_payments_records');
      let list: PaymentRecord[] = stored ? JSON.parse(stored) : [];
      const index = list.findIndex(p => p.id === paymentId);
      if (index !== -1) {
        list[index].status = 'verified';
        localStorage.setItem('autospa_payments_records', JSON.stringify(list));
      }
    } catch (err) {}
  }

  if (bookingId) {
    await updateBookingStatus(bookingId, 'confirmed', 'Pago verificado por administración en caja');
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('autospa_payments_updated'));
    window.dispatchEvent(new Event('autospa_booking_updated'));
  }

  return true;
}

/**
 * INVENTARIO E INSUMOS - CRUD ADMIN
 */
export const DEFAULT_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv_1',
    name: 'Shampoo pH Neutro Concentrado',
    category: 'quimicos',
    quantity: 18,
    unit: 'galones',
    min_stock_alert: 5,
    cost_usd: 14.50,
    supplier: 'Distribuidora Química Caracas',
    last_restocked: '2026-09-20',
  },
  {
    id: 'inv_2',
    name: 'Cera Líquida de Carnauba Premium',
    category: 'quimicos',
    quantity: 12,
    unit: 'galones',
    min_stock_alert: 4,
    cost_usd: 22.00,
    supplier: "Meguiar's Venezuela",
    last_restocked: '2026-09-18',
  },
  {
    id: 'inv_3',
    name: 'Toallas de Microfibra 40x40cm (400 GSM)',
    category: 'accesorios',
    quantity: 65,
    unit: 'unidades',
    min_stock_alert: 20,
    cost_usd: 1.80,
    supplier: 'Importadora Textil Auto',
    last_restocked: '2026-09-22',
  },
  {
    id: 'inv_4',
    name: 'Brillo y Protector de Cauchos (Siliconado)',
    category: 'quimicos',
    quantity: 8,
    unit: 'galones',
    min_stock_alert: 3,
    cost_usd: 16.00,
    supplier: '3M Venezuela',
    last_restocked: '2026-09-15',
  },
  {
    id: 'inv_5',
    name: 'Aromatizante Premium (Vainilla Francesa / New Car)',
    category: 'aromaterapia',
    quantity: 34,
    unit: 'frascos',
    min_stock_alert: 10,
    cost_usd: 1.20,
    supplier: 'Fragancias Caracas C.A.',
    last_restocked: '2026-09-21',
  },
  {
    id: 'inv_6',
    name: 'Desengrasante de Motores y Chasis',
    category: 'quimicos',
    quantity: 3,
    unit: 'galones',
    min_stock_alert: 5,
    cost_usd: 18.50,
    supplier: 'Distribuidora Química Caracas',
    last_restocked: '2026-09-10',
  },
  {
    id: 'inv_7',
    name: 'Limpiador de Tapicería y Cuero en Espuma',
    category: 'quimicos',
    quantity: 9,
    unit: 'galones',
    min_stock_alert: 3,
    cost_usd: 19.00,
    supplier: 'Sonax Venezuela',
    last_restocked: '2026-09-17',
  },
  {
    id: 'inv_8',
    name: 'Cepillos Especiales para Rines y Tuercas',
    category: 'herramientas',
    quantity: 14,
    unit: 'unidades',
    min_stock_alert: 5,
    cost_usd: 4.50,
    supplier: 'Herramientas Auto Caracas',
    last_restocked: '2026-09-12',
  },
];

export async function fetchInventoryItems(): Promise<InventoryItem[]> {
  // 1. Local storage
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_inventory_catalog');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Error reading inventory:', err);
    }
  }

  // 2. Default initial seed
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('autospa_inventory_catalog', JSON.stringify(DEFAULT_INVENTORY_ITEMS));
    } catch {}
  }
  return DEFAULT_INVENTORY_ITEMS;
}

export async function insertInventoryItem(item: Omit<InventoryItem, 'id'> & { id?: string }): Promise<InventoryItem> {
  const newItem: InventoryItem = {
    ...item,
    id: item.id || `inv_${Date.now()}`,
    last_restocked: item.last_restocked || new Date().toISOString().split('T')[0],
  };

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_inventory_catalog');
      let list: InventoryItem[] = stored ? JSON.parse(stored) : [...DEFAULT_INVENTORY_ITEMS];
      list.unshift(newItem);
      localStorage.setItem('autospa_inventory_catalog', JSON.stringify(list));
      window.dispatchEvent(new Event('autospa_inventory_updated'));
    } catch (err) {
      console.warn('Error saving inventory item:', err);
    }
  }

  return newItem;
}

export async function updateInventoryItem(itemId: string, updates: Partial<InventoryItem>): Promise<InventoryItem | null> {
  let updated: InventoryItem | null = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_inventory_catalog');
      let list: InventoryItem[] = stored ? JSON.parse(stored) : [...DEFAULT_INVENTORY_ITEMS];
      const index = list.findIndex(i => i.id === itemId);
      if (index !== -1) {
        list[index] = { ...list[index], ...updates };
        updated = list[index];
        localStorage.setItem('autospa_inventory_catalog', JSON.stringify(list));
        window.dispatchEvent(new Event('autospa_inventory_updated'));
      }
    } catch (err) {
      console.warn('Error updating inventory item:', err);
    }
  }

  return updated;
}

export async function adjustInventoryStock(itemId: string, delta: number): Promise<InventoryItem | null> {
  let updated: InventoryItem | null = null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_inventory_catalog');
      let list: InventoryItem[] = stored ? JSON.parse(stored) : [...DEFAULT_INVENTORY_ITEMS];
      const index = list.findIndex(i => i.id === itemId);
      if (index !== -1) {
        const newQty = Math.max(0, (list[index].quantity || 0) + delta);
        list[index] = {
          ...list[index],
          quantity: newQty,
          last_restocked: delta > 0 ? new Date().toISOString().split('T')[0] : list[index].last_restocked,
        };
        updated = list[index];
        localStorage.setItem('autospa_inventory_catalog', JSON.stringify(list));
        window.dispatchEvent(new Event('autospa_inventory_updated'));
      }
    } catch (err) {
      console.warn('Error adjusting inventory stock:', err);
    }
  }

  return updated;
}

export async function deleteInventoryItem(itemId: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_inventory_catalog');
      let list: InventoryItem[] = stored ? JSON.parse(stored) : [...DEFAULT_INVENTORY_ITEMS];
      const filtered = list.filter(i => i.id !== itemId);
      localStorage.setItem('autospa_inventory_catalog', JSON.stringify(filtered));
      window.dispatchEvent(new Event('autospa_inventory_updated'));
    } catch (err) {
      console.warn('Error deleting inventory item:', err);
    }
  }

  return true;
}

/**
 * NOTIFICACIONES Y ALERTAS - CONFIGURACIÓN Y FEED
 */
export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettingsConfig = {
  whatsapp_enabled: true,
  whatsapp_business_phone: '+58 416 6315114',
  notify_on_new_booking: true,
  notify_on_tech_assigned: true,
  notify_on_tech_en_route: true,
  notify_on_service_completed: true,
  notify_on_payment_pending: true,
  notify_on_low_stock: true,
  email_notifications_enabled: true,
  admin_notification_email: 'contacto@autospa.com.ve',
  sound_alerts_enabled: true,
  templates: {
    booking_confirmed: '🚗 ¡Hola {nombre}! Tu reserva #{codigo} para {servicio} el {fecha} a las {hora} ha sido confirmada con éxito. Nuestro equipo llegará a {direccion}. ¡Gracias por confiar en AutoSpa Caracas!',
    tech_en_route: '🧼 AutoSpa Informa: Tu técnico {tecnico} ya va en camino a tu ubicación ({direccion}). Llegada estimada en {tiempo_estimado} minutos.',
    service_completed: '✨ ¡Tu vehículo está listo e impecable! Gracias por elegir AutoSpa Caracas. Puedes ver el recibo digital de tu servicio #{codigo} en tu perfil.',
  },
};

export async function fetchNotificationSettings(): Promise<NotificationSettingsConfig> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_notifications_config');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (err) {
      console.warn('Error reading notifications settings:', err);
    }
  }
  return DEFAULT_NOTIFICATION_SETTINGS;
}

export async function updateNotificationSettings(config: NotificationSettingsConfig): Promise<NotificationSettingsConfig> {
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('autospa_notifications_config', JSON.stringify(config));
      window.dispatchEvent(new Event('autospa_notifications_settings_updated'));
    } catch (err) {
      console.warn('Error updating notification settings:', err);
    }
  }
  return config;
}

export async function fetchAppNotifications(): Promise<AppNotification[]> {
  const notifs: AppNotification[] = [];
  const readIds: Set<string> = new Set();

  if (typeof window !== 'undefined') {
    try {
      const storedRead = localStorage.getItem('autospa_read_notifications');
      if (storedRead) {
        JSON.parse(storedRead).forEach((id: string) => readIds.add(id));
      }
    } catch {}
  }

  // 1. Generate live notifications from bookings
  try {
    const [bookings, clients, services, inventory] = await Promise.all([
      fetchBookings(),
      fetchAdminClients(),
      fetchServices(),
      fetchInventoryItems(),
    ]);

    // Booking & Tech alerts
    for (const b of bookings.slice(0, 8)) {
      const client = clients.find(c => c.id === b.customer_id);
      const service = services.find(s => s.id === b.service_id);
      const cName = client?.full_name || 'Cliente';
      const sName = service?.name || 'Lavado';
      const bCode = b.code || `BK-${b.id.slice(-4)}`;

      if (b.status === 'pending_payment') {
        const paymentReport = parseBookingPaymentData(b.notes);
        if (paymentReport) {
          const id = `notif_pay_rep_${b.id}`;
          const methodMap: Record<string, string> = {
            pago_movil: 'Pago Móvil',
            zelle: 'Zelle',
            transferencia: 'Transferencia Bancaria',
            efectivo_usd: 'Efectivo USD',
            efectivo_ves: 'Efectivo Bs',
          };
          const methodText = methodMap[paymentReport.method] || paymentReport.method;
          notifs.push({
            id,
            type: 'payment',
            title: '💰 ¡Pago Reportado por Cliente!',
            message: `${cName} reportó pago por ${methodText} (Ref: ${paymentReport.reference}) para la orden ${bCode} por $${b.total_usd.toFixed(2)}. Requiere validación.`,
            created_at: paymentReport.reported_at || b.updated_at || new Date().toISOString(),
            is_read: readIds.has(id),
            link: `/admin/orders/${b.id}`,
          });
        } else {
          const id = `notif_pay_${b.id}`;
          notifs.push({
            id,
            type: 'payment',
            title: 'Orden en espera de pago',
            message: `${cName} tiene una orden pendiente (${bCode}) por $${b.total_usd.toFixed(2)}.`,
            created_at: b.created_at || new Date().toISOString(),
            is_read: readIds.has(id),
            link: `/admin/orders/${b.id}`,
          });
        }
      } else if (b.status === 'confirmed' || b.status === 'assigned') {
        const id = `notif_book_${b.id}`;
        notifs.push({
          id,
          type: 'booking',
          title: 'Reserva confirmada',
          message: `${cName} reservó ${sName} para el ${b.scheduled_date} (${b.scheduled_time_slot}).`,
          created_at: b.created_at || new Date().toISOString(),
          is_read: readIds.has(id),
          link: '/admin/agenda',
        });
      }
    }

    // Inventory low stock alerts
    const lowStockItems = inventory.filter(i => i.quantity <= i.min_stock_alert);
    for (const item of lowStockItems) {
      const id = `notif_stock_${item.id}`;
      notifs.push({
        id,
        type: 'stock',
        title: `⚠️ Stock bajo: ${item.name}`,
        message: `Quedan solo ${item.quantity} ${item.unit} (Mínimo requerido: ${item.min_stock_alert}).`,
        created_at: item.last_restocked || new Date().toISOString(),
        is_read: readIds.has(id),
        link: '/admin/inventory',
      });
    }

  } catch (err) {
    console.warn('Error generating notifications:', err);
  }

  // System welcome notif
  const sysId = 'notif_system_welcome';
  notifs.push({
    id: sysId,
    type: 'system',
    title: 'Sistema AutoSpa Caracas Activo',
    message: 'Servicio de notificaciones en tiempo real y mensajería WhatsApp sincronizados.',
    created_at: new Date().toISOString(),
    is_read: readIds.has(sysId),
  });

  return notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function markNotificationAsRead(id: string): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem('autospa_read_notifications');
      let list: string[] = stored ? JSON.parse(stored) : [];
      if (!list.includes(id)) {
        list.push(id);
        localStorage.setItem('autospa_read_notifications', JSON.stringify(list));
        window.dispatchEvent(new Event('autospa_notifications_feed_updated'));
      }
    } catch {}
  }
  return true;
}

export async function markAllNotificationsAsRead(): Promise<boolean> {
  if (typeof window !== 'undefined') {
    try {
      const notifs = await fetchAppNotifications();
      const allIds = notifs.map(n => n.id);
      localStorage.setItem('autospa_read_notifications', JSON.stringify(allIds));
      window.dispatchEvent(new Event('autospa_notifications_feed_updated'));
    } catch {}
  }
  return true;
}
