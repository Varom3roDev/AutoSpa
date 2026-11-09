import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function GET() {
  try {
    const serverClient = getServerClient();
    const { data: settingsData } = await serverClient
      .from('app_settings')
      .select('notification_settings')
      .eq('id', 'default')
      .single();

    const list = settingsData?.notification_settings?.synced_bookings || [];
    return NextResponse.json(
      { bookings: Array.isArray(list) ? list : [] },
      { headers: { 'Cache-Control': 'no-store, max-age=0' } }
    );
  } catch (err: any) {
    console.error('Error in GET sync bookings route:', err);
    return NextResponse.json({ bookings: [], error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { action, booking, bookingId } = await req.json();
    const serverClient = getServerClient();

    const { data: settingsData } = await serverClient
      .from('app_settings')
      .select('notification_settings')
      .eq('id', 'default')
      .single();

    let currentList: any[] = settingsData?.notification_settings?.synced_bookings || [];
    if (!Array.isArray(currentList)) currentList = [];

    const nowIso = new Date().toISOString();

    if (action === 'upsert' && booking) {
      const existing = currentList.find((b: any) => b.id === booking.id || (booking.code && b.code === booking.code));
      currentList = currentList.filter((b: any) => b.id !== booking.id && (!booking.code || b.code !== booking.code));
      currentList.unshift({
        ...(existing || {}),
        ...booking,
        id: booking.id || existing?.id,
        code: booking.code || existing?.code,
        customer_id: booking.customer_id ?? existing?.customer_id,
        vehicle_id: booking.vehicle_id ?? existing?.vehicle_id,
        address_id: booking.address_id ?? existing?.address_id,
        service_id: booking.service_id ?? existing?.service_id,
        addons: booking.addons ?? existing?.addons ?? [],
        assigned_technician_id: booking.assigned_technician_id ?? existing?.assigned_technician_id,
        scheduled_date: booking.scheduled_date ?? existing?.scheduled_date,
        scheduled_time_slot: booking.scheduled_time_slot ?? existing?.scheduled_time_slot,
        estimated_duration: booking.estimated_duration ?? existing?.estimated_duration ?? 60,
        subtotal_usd: booking.subtotal_usd ?? existing?.subtotal_usd ?? 0,
        discount_usd: booking.discount_usd ?? existing?.discount_usd ?? 0,
        tax_usd: booking.tax_usd ?? existing?.tax_usd ?? 0,
        total_usd: booking.total_usd ?? existing?.total_usd ?? 0,
        total_ves: booking.total_ves ?? existing?.total_ves ?? 0,
        exchange_rate: booking.exchange_rate ?? existing?.exchange_rate ?? 36.5,
        status: booking.status || existing?.status || 'pending_payment',
        notes: booking.notes !== undefined ? booking.notes : (existing?.notes || ''),
        created_at: booking.created_at || existing?.created_at || nowIso,
        updated_at: nowIso,
      });
    } else if (action === 'delete' && bookingId) {
      if (bookingId === 'ALL') {
        currentList = [];
      } else {
        currentList = currentList.filter((b: any) => b.id !== bookingId);
      }
    } else if (action === 'update_status' && bookingId) {
      const target = currentList.find((b: any) => b.id === bookingId);
      if (target) {
        if (booking?.status) target.status = booking.status;
        if (booking?.notes !== undefined) target.notes = booking.notes;
        target.updated_at = nowIso;
      } else if (booking) {
        currentList.unshift({
          ...booking,
          id: bookingId,
          updated_at: nowIso,
        });
      }
    } else if (action === 'assign_tech' && bookingId) {
      const target = currentList.find((b: any) => b.id === bookingId);
      if (target) {
        target.assigned_technician_id = booking?.assigned_technician_id;
        target.status = booking?.status || 'assigned';
        target.updated_at = nowIso;
      } else if (booking) {
        currentList.unshift({
          ...booking,
          id: bookingId,
          status: booking?.status || 'assigned',
          updated_at: nowIso,
        });
      }
    } else if (action === 'reschedule' && bookingId) {
      const target = currentList.find((b: any) => b.id === bookingId);
      if (target) {
        if (booking?.scheduled_date) target.scheduled_date = booking.scheduled_date;
        if (booking?.scheduled_time_slot) target.scheduled_time_slot = booking.scheduled_time_slot;
        if (booking?.notes !== undefined) target.notes = booking.notes;
        target.updated_at = nowIso;
      } else if (booking) {
        currentList.unshift({
          ...booking,
          id: bookingId,
          updated_at: nowIso,
        });
      }
    } else if (action === 'report_payment' && bookingId) {
      const target = currentList.find((b: any) => b.id === bookingId);
      if (target) {
        if (booking?.notes !== undefined) target.notes = booking.notes;
        target.updated_at = nowIso;
      } else if (booking) {
        currentList.unshift({
          ...booking,
          id: bookingId,
          updated_at: nowIso,
        });
      }
    }

    await serverClient
      .from('app_settings')
      .update({
        notification_settings: {
          ...(settingsData?.notification_settings || {}),
          synced_bookings: currentList,
        },
        updated_at: nowIso,
      })
      .eq('id', 'default');

    return NextResponse.json({ success: true, total: currentList.length });
  } catch (err: any) {
    console.error('Error in sync bookings route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
