'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fetchBookings, fetchServices, fetchAdminClients, fetchAdminTechnicians, parseBookingPaymentData } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatTimeSlot, getLocalDateString, cn } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChevronRight, CalendarDays, User, Wrench, Clock, AlertCircle } from 'lucide-react';
import type { Booking, Service, Customer, User as UserType } from '@/lib/types';

type FilterTab = 'all' | 'today' | 'pending' | 'in_progress' | 'completed';

export default function AdminOrdersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const todayStr = getLocalDateString();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [bData, sData, cData, tData] = await Promise.all([
        fetchBookings(),
        fetchServices(),
        fetchAdminClients(),
        fetchAdminTechnicians(),
      ]);
      setBookings(bData);
      setServices(sData);
      setClients(cData);
      setTechnicians(tData);
      setIsLoading(false);
    }
    loadData();

    // Supabase Realtime Channel
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === 'realtime:admin-orders-realtime');
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel('admin-orders-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        () => {
          fetchBookings().then(setBookings);
        }
      )
      .on('broadcast', { event: 'new_booking' }, () => {
        fetchBookings().then(setBookings);
      })
      .on('broadcast', { event: 'booking_updated' }, () => {
        fetchBookings().then(setBookings);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (activeTab === 'today') return booking.scheduled_date === todayStr; 
      if (activeTab === 'pending') return booking.status === 'pending_payment' || booking.status === 'confirmed';
      if (activeTab === 'in_progress') return booking.status === 'in_progress' || booking.status === 'en_route' || booking.status === 'arrived';
      if (activeTab === 'completed') return booking.status === 'completed';
      return true;
    });
  }, [bookings, activeTab, todayStr]);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <PageHeader 
        title="Órdenes y Reservas"
      />

      <div className="p-4 space-y-4 flex-1 max-w-5xl mx-auto w-full">
        <Tabs defaultValue="all" value={activeTab} onValueChange={(val) => setActiveTab(val as FilterTab)} className="w-full">
          <TabsList className="w-full h-12 justify-start overflow-x-auto hide-scrollbar snap-x">
            <TabsTrigger value="all" className="min-w-fit snap-start px-4">Todas ({bookings.length})</TabsTrigger>
            <TabsTrigger value="today" className="min-w-fit snap-start px-4">Hoy</TabsTrigger>
            <TabsTrigger value="pending" className="min-w-fit snap-start px-4 flex items-center gap-1.5">
              <span>Pendientes</span>
              {bookings.some(b => b.status === 'pending_payment' && parseBookingPaymentData(b.notes)) && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </TabsTrigger>
            <TabsTrigger value="in_progress" className="min-w-fit snap-start px-4">En Proceso</TabsTrigger>
            <TabsTrigger value="completed" className="min-w-fit snap-start px-4">Completadas</TabsTrigger>
          </TabsList>
          
          <div className="mt-6 space-y-3">
            {isLoading ? (
              <p className="text-center py-8 text-sm text-muted-foreground">Cargando órdenes...</p>
            ) : filteredBookings.length > 0 ? (
              filteredBookings.map((booking) => {
                const service = services.find(s => s.id === booking.service_id);
                const client = clients.find(c => c.id === booking.customer_id);
                const tech = technicians.find(u => u.id === booking.assigned_technician_id);
                const reportedPayment = parseBookingPaymentData(booking.notes);
                const isWaitingVerification = booking.status === 'pending_payment' && !!reportedPayment;
                
                return (
                  <Link key={booking.id} href={`/admin/orders/${booking.id}`} className="block">
                    <Card className={cn(
                      "transition-all active:bg-muted/50",
                      isWaitingVerification 
                        ? "border-amber-500/50 bg-amber-500/[0.04] shadow-sm hover:border-amber-500" 
                        : "hover:border-primary/50"
                    )}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="font-bold font-mono text-foreground">{booking.code}</span>
                            {isWaitingVerification ? (
                              <Badge variant="outline" className="flex items-center gap-1.5 font-bold border-amber-500/50 bg-amber-500/15 text-amber-500 text-xs px-2.5 py-1 animate-pulse">
                                <Clock className="w-3.5 h-3.5" />
                                <span>Pago por Verificar</span>
                              </Badge>
                            ) : (
                              <StatusBadge status={booking.status} />
                            )}
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-semibold">{service?.name || 'Servicio de Lavado'}</span>
                            {reportedPayment && booking.status === 'pending_payment' && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                                <span>
                                  {reportedPayment.method === 'pago_movil' && '📱 Pago Móvil'}
                                  {reportedPayment.method === 'zelle' && '⚡ Zelle'}
                                  {reportedPayment.method === 'transferencia' && '🏦 Transferencia'}
                                  {reportedPayment.method === 'efectivo_usd' && '💵 Efectivo USD'}
                                  {reportedPayment.method === 'efectivo_ves' && '💵 Efectivo Bs'}
                                </span>
                                {reportedPayment.reference && (
                                  <span>• Ref: {reportedPayment.reference}</span>
                                )}
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground mt-2">
                            <div className="flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{client?.full_name || 'Cliente'}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" />
                              <span>{booking.scheduled_date} • {formatTimeSlot(booking.scheduled_time_slot)}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 shrink-0" />
                              <span>{tech?.full_name || 'Sin técnico asignado'}</span>
                            </div>
                            <div className="font-semibold text-primary">
                              {formatCurrency(booking.total_usd)}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground ml-4 shrink-0" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            ) : (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No hay órdenes en esta categoría</p>
                </CardContent>
              </Card>
            )}
          </div>
        </Tabs>
      </div>
    </div>
  );
}
