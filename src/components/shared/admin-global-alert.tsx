'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { playAudioChime, getStatusLabel } from '@/lib/utils';
import { showSystemNotification } from '@/lib/notifications';
import { Button } from '@/components/ui/button';
import { Bell, ArrowRight, X } from 'lucide-react';

interface AlertState {
  title: string;
  code: string;
  message: string;
  link: string;
  type: 'payment' | 'booking' | 'status';
}

export function AdminGlobalAlert() {
  const [alert, setAlert] = useState<AlertState | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channelName = 'admin-global-notifications';
    
    const existing = supabase.getChannels().find((c: any) => c.topic === `realtime:${channelName}`);
    if (existing) {
      supabase.removeChannel(existing);
    }

    const handleTriggerAlert = (evName: string, data: any) => {
      if (!data) return;
      const bookingId = data.booking_id || data.bookingId || data.id;
      const code = data.code || 'Orden';

      if (evName === 'new_booking') {
        playAudioChime('prominent');
        setAlert({
          title: '🚗 ¡Nueva Reserva Registrada!',
          code,
          message: 'Un cliente acaba de reservar una cita.',
          link: bookingId ? `/admin/orders/${bookingId}` : '/admin/orders',
          type: 'booking',
        });
        showSystemNotification('🚗 ¡Nueva Reserva!', {
          body: `Orden ${code}: Nueva reserva agendada.`,
          url: bookingId ? `/admin/orders/${bookingId}` : '/admin/orders',
        });
      } else if (evName === 'payment_reported') {
        playAudioChime('prominent');
        const method = data.method === 'pago_movil' ? 'Pago Móvil' : data.method === 'zelle' ? 'Zelle' : data.method === 'transferencia' ? 'Transferencia' : 'Efectivo';
        const ref = data.reference ? `(Ref: ${data.reference})` : '';
        const client = data.customer_name ? `${data.customer_name} ` : '';

        setAlert({
          title: '💰 ¡Pago Reportado por Cliente!',
          code,
          message: `${client}notificó pago por ${method} ${ref}. Clic para validar y asignar técnico.`,
          link: bookingId ? `/admin/orders/${bookingId}` : '/admin/payments',
          type: 'payment',
        });
        showSystemNotification('💰 ¡Pago Reportado!', {
          body: `Orden ${code}: ${client}notificó pago por ${method}. Requiere validación.`,
          url: bookingId ? `/admin/orders/${bookingId}` : '/admin/payments',
        });
      } else if (evName === 'booking_rescheduled') {
        playAudioChime('prominent');
        const newDate = data.new_date || '';
        const newSlot = data.new_slot || '';

        setAlert({
          title: '📅 ¡Cita Reprogramada!',
          code,
          message: `Movida para el ${newDate} (${newSlot}). Revisa la agenda.`,
          link: bookingId ? `/admin/orders/${bookingId}` : '/admin/agenda',
          type: 'booking',
        });
        showSystemNotification('📅 ¡Cita Reprogramada!', {
          body: `Orden ${code}: Movida para el ${newDate} (${newSlot}).`,
          url: bookingId ? `/admin/orders/${bookingId}` : '/admin/agenda',
        });
      } else if (evName === 'booking_updated' || evName === 'tech_order_updated') {
        if (data.status && ['en_route', 'arrived', 'in_progress', 'quality_check', 'completed'].includes(data.status)) {
          playAudioChime('subtle');
          const statusLabel = getStatusLabel(data.status);
          setAlert({
            title: `⚡ Avance del Técnico: ${statusLabel}`,
            code,
            message: `El técnico actualizó el estado de la orden a "${statusLabel}".`,
            link: bookingId ? `/admin/orders/${bookingId}` : '/admin/orders',
            type: 'status',
          });
        }
      }
    };

    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          if (payload.eventType === 'UPDATE') {
            const newNotes = payload.new?.notes || '';
            const oldNotes = payload.old?.notes || '';
            const hasPaymentReported = newNotes.includes('[PAGO_REPORTADO:') && !oldNotes.includes('[PAGO_REPORTADO:');

            if (hasPaymentReported) {
              handleTriggerAlert('payment_reported', {
                booking_id: payload.new?.id,
                code: payload.new?.code || 'Orden',
              });
            } else if (payload.new?.status && payload.new?.status !== payload.old?.status) {
              handleTriggerAlert('booking_updated', {
                booking_id: payload.new?.id,
                code: payload.new?.code || 'Orden',
                status: payload.new?.status,
              });
            }
          } else if (payload.eventType === 'INSERT') {
            handleTriggerAlert('new_booking', {
              booking_id: payload.new?.id,
              code: payload.new?.code || 'Nueva Reserva',
            });
          }
        }
      )
      .subscribe();

    // Listener para eventos locales en ventana
    const handleLocalPaymentReported = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) handleTriggerAlert('payment_reported', custom.detail);
    };

    const handleLocalRescheduled = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail) handleTriggerAlert('booking_rescheduled', custom.detail);
    };

    window.addEventListener('autospa_payment_reported', handleLocalPaymentReported);
    window.addEventListener('autospa_booking_rescheduled', handleLocalRescheduled);

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel('autospa_global_sync');
      bc.onmessage = (event) => {
        const { topic, event: evName, payload } = event.data || {};
        // Solo procesar una vez (filtrando por el canal principal de admin)
        if (topic === 'admin-dashboard-realtime') {
          handleTriggerAlert(evName, payload);
        }
      };
    } catch {}

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('autospa_payment_reported', handleLocalPaymentReported);
      window.removeEventListener('autospa_booking_rescheduled', handleLocalRescheduled);
      if (bc) {
        try { bc.close(); } catch {}
      }
    };
  }, []);

  // Auto-descartar a los 12 segundos
  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => {
      setAlert(null);
    }, 12000);
    return () => clearTimeout(timer);
  }, [alert]);

  if (!alert) return null;

  return (
    <div className="fixed top-3 left-4 right-4 z-50 max-w-xl mx-auto animate-in fade-in slide-in-from-top-4 duration-300">
      <div className="bg-[#12161C] border-2 border-amber-500/70 text-foreground p-3.5 rounded-2xl shadow-2xl backdrop-blur-xl flex items-center justify-between gap-3 ring-4 ring-amber-500/10">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-500 flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 animate-bounce" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-amber-400">{alert.title}</span>
              <span className="font-mono font-bold text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                {alert.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {alert.message}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={alert.link} onClick={() => setAlert(null)}>
            <Button size="sm" className="h-8 px-2.5 text-xs font-semibold gap-1 bg-amber-500 hover:bg-amber-600 text-black shadow-md cursor-pointer">
              <span>Ver</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer rounded-full"
            onClick={() => setAlert(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
