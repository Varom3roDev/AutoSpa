'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/page-header';
import { fetchBookings, fetchServices } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/status-badge';
import { Calendar, ClipboardList, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatTimeSlot, playAudioChime, getStatusLabel } from '@/lib/utils';
import { showSystemNotification } from '@/lib/notifications';
import { NotificationPermissionPrompt } from '@/components/shared/notification-permission-prompt';
import type { Booking, Service } from '@/lib/types';

function playClientNotificationSound() {
  playAudioChime('subtle');
}

export default function ClientReservationsPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const activeStatuses = ['pending_payment', 'confirmed', 'assigned', 'en_route', 'arrived', 'in_progress', 'quality_check'];
  
  async function loadData() {
    if (user?.id) {
      setIsLoading(true);
      const [bookingsData, servicesData] = await Promise.all([
        fetchBookings({ customerId: user.id }),
        fetchServices(),
      ]);
      setBookings(bookingsData);
      setServices(servicesData);
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('autospa_bookings_updated', handleUpdate);

    // Suscripción Realtime con Supabase
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === 'realtime:client-reservations-list-realtime');
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel('client-reservations-list-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          loadData();
          const targetCustomerId = payload.new?.customer_id;
          if (!targetCustomerId || targetCustomerId === user?.id || user?.role === 'client') {
            playClientNotificationSound();
            const code = payload.new?.code || 'Tu Reserva';
            const status = payload.new?.status;
            if (status) {
              const statusText = getStatusLabel(status);
              showSystemNotification('AutoSpa VZLA', {
                body: `${code}: Estado actualizado a "${statusText}".`,
                url: payload.new?.id ? `/client/reservations/${payload.new.id}` : '/client/reservations',
              });
            }
          }
        }
      )
      .on('broadcast', { event: 'client_booking_updated' }, (payload: any) => {
        loadData();
        const targetCustomerId = payload.payload?.customerId;
        if (!targetCustomerId || targetCustomerId === user?.id || user?.role === 'client') {
          playClientNotificationSound();
          const code = payload.payload?.code || 'Tu Reserva';
          const status = payload.payload?.status;
          if (status) {
            const statusText = getStatusLabel(status);
            showSystemNotification('AutoSpa VZLA', {
              body: `${code}: Estado actualizado a "${statusText}".`,
              url: payload.payload?.bookingId ? `/client/reservations/${payload.payload.bookingId}` : '/client/reservations',
            });
          }
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener('autospa_bookings_updated', handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  const activeBookings = bookings.filter(b => activeStatuses.includes(b.status));
  const historyBookings = bookings.filter(b => !activeStatuses.includes(b.status));

  const renderBookingCard = (booking: Booking) => {
    const service = services.find(s => s.id === booking.service_id);
    
    return (
      <Link href={`/client/reservations/${booking.id}`} key={booking.id}>
        <Card className="mb-4 transition-colors hover:bg-muted/50 active:bg-muted">
          <CardContent className="p-4">
            <div className="flex items-start justify-between mb-2">
              <span className="font-bold font-mono text-sm">{booking.code}</span>
              <StatusBadge status={booking.status} />
            </div>
            
            <div className="mb-3 text-lg font-semibold">
              {service?.name || 'Servicio de Lavado'}
            </div>
            
            <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4" />
              <span>{booking.scheduled_date} • {formatTimeSlot(booking.scheduled_time_slot)}</span>
            </div>
            
            <div className="flex items-center gap-1 font-medium">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span>{formatCurrency(booking.total_usd)}</span>
            </div>
          </CardContent>
        </Card>
      </Link>
    );
  };

  const renderEmptyState = (message: string) => (
    <div className="flex flex-col items-center justify-center p-8 mt-10 text-center border rounded-xl bg-muted/20">
      <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10">
        <ClipboardList className="w-6 h-6 text-primary" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">{message}</h3>
      <p className="mb-6 text-sm text-muted-foreground text-balance">
        Cuando realices una reserva de servicio, aparecerá aquí.
      </p>
      <Link href="/client/booking">
        <Button>Reservar Ahora</Button>
      </Link>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <PageHeader
        title="Mis Reservas"
        subtitle={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En Vivo
          </span>
        }
      />

      <main className="flex-1 p-4">
        <Tabs defaultValue="activas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="activas">
              Activas ({activeBookings.length})
            </TabsTrigger>
            <TabsTrigger value="historial">
              Historial ({historyBookings.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="activas">
            {isLoading ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Cargando reservas...</p>
            ) : activeBookings.length > 0 ? (
              activeBookings.map(renderBookingCard)
            ) : (
              renderEmptyState("No tienes reservas activas")
            )}
          </TabsContent>
          
          <TabsContent value="historial">
            {isLoading ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Cargando historial...</p>
            ) : historyBookings.length > 0 ? (
              historyBookings.map(renderBookingCard)
            ) : (
              renderEmptyState("No tienes reservas en el historial")
            )}
          </TabsContent>
        </Tabs>
      </main>

      <NotificationPermissionPrompt role="client" />
    </div>
  );
}
