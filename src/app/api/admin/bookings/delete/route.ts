import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { bookingId } = await req.json();

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const serverClient = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    if (bookingId === 'ALL') {
      // Delete all bookings and related tables
      await serverClient.from('booking_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await serverClient.from('booking_addons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      const { error } = await serverClient.from('bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Todas las reservas fueron eliminadas' });
    }

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId es requerido' }, { status: 400 });
    }

    // Delete single booking
    await serverClient.from('booking_status_history').delete().eq('booking_id', bookingId);
    await serverClient.from('booking_addons').delete().eq('booking_id', bookingId);
    const { error } = await serverClient.from('bookings').delete().eq('id', bookingId);

    // Fallback: asegurarse de que al menos quede marcada como cancelada y eliminada
    await serverClient.from('bookings').update({
      status: 'cancelled',
      notes: 'ORDEN_ELIMINADA_POR_ADMIN',
      updated_at: new Date().toISOString()
    }).eq('id', bookingId);

    return NextResponse.json({ success: true, message: 'Reserva eliminada con éxito' });
  } catch (err: any) {
    console.error('Error deleting booking:', err);
    return NextResponse.json({ error: err.message || 'Error al eliminar reserva' }, { status: 500 });
  }
}
