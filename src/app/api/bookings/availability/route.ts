import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeTimeSlotId } from '@/lib/utils';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const excludeBookingId = searchParams.get('excludeBookingId');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const serverClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Consultar tabla principal de bookings
    let query = serverClient
      .from('bookings')
      .select('id, scheduled_date, scheduled_time_slot, status, notes, created_at')
      .neq('status', 'cancelled');

    if (date) {
      query = query.eq('scheduled_date', date);
    }

    if (excludeBookingId) {
      query = query.neq('id', excludeBookingId);
    }

    const { data: dbData, error } = await query;
    if (error) {
      console.warn('API availability query warning:', error.message);
    }

    // 2. Consultar reservas sincronizadas en la nube (cloud cache en app_settings)
    let syncedBookings: any[] = [];
    try {
      const { data: settingsData } = await serverClient
        .from('app_settings')
        .select('notification_settings')
        .eq('id', 'default')
        .single();

      if (settingsData?.notification_settings?.synced_bookings && Array.isArray(settingsData.notification_settings.synced_bookings)) {
        syncedBookings = settingsData.notification_settings.synced_bookings;
      }
    } catch (e) {
      console.warn('Error reading synced_bookings from app_settings:', e);
    }

    // Unir ambas fuentes asegurando unicidad por id
    const allBookingsMap = new Map<string, any>();

    if (dbData && Array.isArray(dbData)) {
      dbData.forEach((b: any) => {
        allBookingsMap.set(b.id, b);
      });
    }

    if (syncedBookings && Array.isArray(syncedBookings)) {
      syncedBookings.forEach((b: any) => {
        if (!allBookingsMap.has(b.id)) {
          allBookingsMap.set(b.id, b);
        }
      });
    }

    const allRecords = Array.from(allBookingsMap.values());
    const bookedSlots: string[] = [];
    const activeBookings: Array<{ id: string; slot: string }> = [];

    const now = Date.now();
    const HOLD_LIMIT_MS = 30 * 60 * 1000; // 30 minutos

    for (const b of allRecords) {
      if (b.status === 'cancelled') continue;
      if (excludeBookingId && b.id === excludeBookingId) continue;
      if (date && b.scheduled_date !== date) continue;

      // Verificar si la reserva está pendiente de pago y ya pasaron los 30 minutos sin reporte
      const isPaymentReported = b.notes && b.notes.includes('[PAGO_REPORTADO:');
      const createdAtMs = b.created_at ? new Date(b.created_at).getTime() : now;
      const isExpired = b.status === 'pending_payment' && !isPaymentReported && (now - createdAtMs > HOLD_LIMIT_MS);

      if (isExpired) {
        // Si expiró, se ignora para liberar el turno
        continue;
      }

      if (b.scheduled_time_slot) {
        activeBookings.push({ id: b.id, slot: b.scheduled_time_slot });
      }

      const norm = normalizeTimeSlotId(b.scheduled_time_slot);
      if (norm && !bookedSlots.includes(norm)) {
        bookedSlots.push(norm);
      }
    }

    return NextResponse.json({
      date,
      bookedSlots,
      activeBookings,
      totalBooked: activeBookings.length,
    });
  } catch (err: any) {
    console.error('API availability error:', err);
    return NextResponse.json({ bookedSlots: [], activeBookings: [], error: err.message }, { status: 500 });
  }
}
