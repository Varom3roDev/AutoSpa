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

    const { data, error } = await query;

    if (error) {
      console.warn('API availability query warning:', error.message);
      return NextResponse.json({ date, bookedSlots: [] });
    }

    const bookedSlots: string[] = [];
    if (data && data.length > 0) {
      const now = Date.now();
      const HOLD_LIMIT_MS = 30 * 60 * 1000; // 30 minutos

      for (const b of data) {
        // Verificar si la reserva está pendiente de pago y ya pasaron los 30 minutos sin reporte
        const isPaymentReported = b.notes && b.notes.includes('[PAGO_REPORTADO:');
        const createdAtMs = b.created_at ? new Date(b.created_at).getTime() : now;
        const isExpired = b.status === 'pending_payment' && !isPaymentReported && (now - createdAtMs > HOLD_LIMIT_MS);

        if (isExpired) {
          // Si expiró, se auto-cancela en segundo plano y se libera el horario
          serverClient
            .from('bookings')
            .update({ 
              status: 'cancelled', 
              notes: `${b.notes || ''}\n[AUTO_CANCELACION: Tiempo de 30 min para pago expirado]` 
            })
            .eq('id', b.id)
            .then(() => {});
          continue;
        }

        const norm = normalizeTimeSlotId(b.scheduled_time_slot);
        if (norm && !bookedSlots.includes(norm)) {
          bookedSlots.push(norm);
        }
      }
    }

    return NextResponse.json({
      date,
      bookedSlots,
      totalBooked: bookedSlots.length,
    });
  } catch (err: any) {
    console.error('API availability error:', err);
    return NextResponse.json({ bookedSlots: [], error: err.message }, { status: 500 });
  }
}
