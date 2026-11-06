import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { action, booking, bookingId } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const serverClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: settingsData } = await serverClient
      .from('app_settings')
      .select('notification_settings')
      .eq('id', 'default')
      .single();

    let currentList: any[] = settingsData?.notification_settings?.synced_bookings || [];
    if (!Array.isArray(currentList)) currentList = [];

    if (action === 'upsert' && booking) {
      currentList = currentList.filter((b: any) => b.id !== booking.id && b.code !== booking.code);
      currentList.unshift({
        id: booking.id,
        code: booking.code,
        customer_id: booking.customer_id,
        scheduled_date: booking.scheduled_date,
        scheduled_time_slot: booking.scheduled_time_slot,
        estimated_duration: booking.estimated_duration || 60,
        status: booking.status || 'pending_payment',
        notes: booking.notes || '',
        created_at: booking.created_at || new Date().toISOString(),
      });
    } else if (action === 'delete' && bookingId) {
      if (bookingId === 'ALL') {
        currentList = [];
      } else {
        currentList = currentList.filter((b: any) => b.id !== bookingId);
      }
    } else if (action === 'update_status' && bookingId) {
      const target = currentList.find((b: any) => b.id === bookingId);
      if (target && booking?.status) {
        target.status = booking.status;
        if (booking.notes) target.notes = booking.notes;
      }
    } else if (action === 'reschedule' && bookingId) {
      const target = currentList.find((b: any) => b.id === bookingId);
      if (target) {
        if (booking?.scheduled_date) target.scheduled_date = booking.scheduled_date;
        if (booking?.scheduled_time_slot) target.scheduled_time_slot = booking.scheduled_time_slot;
        if (booking?.notes) target.notes = booking.notes;
        target.status = 'rescheduled';
      }
    }

    await serverClient
      .from('app_settings')
      .update({
        notification_settings: {
          ...(settingsData?.notification_settings || {}),
          synced_bookings: currentList,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', 'default');

    return NextResponse.json({ success: true, total: currentList.length });
  } catch (err: any) {
    console.error('Error in sync bookings route:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
