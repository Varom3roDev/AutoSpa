'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fetchBookings, fetchServices, fetchAdminTechnicians, fetchAdminClients } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getLocalDateString, formatTimeSlot, getStatusLabel, playAudioChime } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Loader, Clock, Users, TrendingUp, XCircle, ArrowRight, ChevronRight, Wrench, Bell, Sparkles } from 'lucide-react';
import { showSystemNotification } from '@/lib/notifications';
import { NotificationPermissionPrompt } from '@/components/shared/notification-permission-prompt';
import type { Booking, Service, User, Customer, DashboardStats } from '@/lib/types';

export default function AdminDashboardPage() {
  const today = new Date();
  const todayStr = getLocalDateString(today);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [adminAlert, setAdminAlert] = useState<{
    title: string;
    code: string;
    message: string;
    type?: 'new' | 'update';
  } | null>(null);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      const [bData, sData, tData, cData] = await Promise.all([
        fetchBookings(),
        fetchServices(),
        fetchAdminTechnicians(),
        fetchAdminClients(),
      ]);
      setBookings(bData);
      setServices(sData);
      setTechnicians(tData);
      setClients(cData);
      setIsLoading(false);
    }
    loadData();

    // Suscripción Realtime con Supabase
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === 'realtime:admin-dashboard-realtime');
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel('admin-dashboard-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings' },
        (payload: any) => {
          fetchBookings().then(setBookings);
          playAudioChime('prominent');
          if (payload.eventType === 'INSERT') {
            const code = payload.new?.code || 'Nueva Reserva';
            setAdminAlert({
              title: '¡Nueva Reserva Recibida en Tiempo Real!',
              code,
              message: 'Un cliente acaba de agendar un nuevo servicio.',
              type: 'new',
            });
            showSystemNotification('¡Nueva Reserva Recibida!', {
              body: `Orden ${code}: Un cliente acaba de agendar un nuevo servicio.`,
              url: '/admin/orders',
            });
          } else if (payload.eventType === 'UPDATE') {
            const code = payload.new?.code || 'Orden';
            const statusLabel = getStatusLabel(payload.new?.status || '');
            setAdminAlert({
              title: '¡Actualización de Servicio en Tiempo Real!',
              code,
              message: `El técnico o sistema cambió el estado a: ${statusLabel}`,
              type: 'update',
            });
            showSystemNotification('¡Actualización de Servicio!', {
              body: `Orden ${code}: Estado cambiado a ${statusLabel}.`,
              url: '/admin/orders',
            });
          }
          setTimeout(() => setAdminAlert(null), 9000);
        }
      )
      .on('broadcast', { event: 'new_booking' }, (payload: any) => {
        fetchBookings().then(setBookings);
        playAudioChime('prominent');
        const code = payload.payload?.code || 'Nueva Reserva';
        setAdminAlert({
          title: '¡Nueva Reserva Recibida en Tiempo Real!',
          code,
          message: 'Un cliente acaba de agendar un nuevo servicio.',
          type: 'new',
        });
        showSystemNotification('¡Nueva Reserva Recibida!', {
          body: `Orden ${code}: Un cliente acaba de agendar un nuevo servicio.`,
          url: '/admin/orders',
        });
        setTimeout(() => setAdminAlert(null), 9000);
      })
      .on('broadcast', { event: 'booking_updated' }, (payload: any) => {
        fetchBookings().then(setBookings);
        playAudioChime('prominent');
        const code = payload.payload?.code || 'Orden';
        const statusLabel = payload.payload?.status ? getStatusLabel(payload.payload.status) : 'actualizada';
        setAdminAlert({
          title: '¡Actualización de Servicio en Tiempo Real!',
          code,
          message: `El técnico cambió el estado a: ${statusLabel}`,
          type: 'update',
        });
        showSystemNotification('¡Actualización de Servicio!', {
          body: `Orden ${code}: Estado cambiado a ${statusLabel}.`,
          url: '/admin/orders',
        });
        setTimeout(() => setAdminAlert(null), 9000);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Calculated Stats
  const stats: DashboardStats = useMemo(() => {
    const todayBookingsList = bookings.filter(b => b.scheduled_date === todayStr);
    const completedList = bookings.filter(b => b.status === 'completed');
    const todayRevenue = completedList
      .filter(b => b.scheduled_date === todayStr)
      .reduce((sum, b) => sum + (b.total_usd || 0), 0);

    const inProgress = bookings.filter(b => ['in_progress', 'en_route', 'arrived'].includes(b.status)).length;
    const pending = bookings.filter(b => ['pending_payment', 'confirmed'].includes(b.status)).length;
    const cancelled = bookings.filter(b => b.status === 'cancelled' && b.scheduled_date === todayStr).length;
    const completedToday = completedList.filter(b => b.scheduled_date === todayStr).length;
    const avgTicket = completedList.length > 0 
      ? completedList.reduce((sum, b) => sum + (b.total_usd || 0), 0) / completedList.length 
      : 0;

    return {
      today_revenue_usd: todayRevenue,
      today_bookings: todayBookingsList.length,
      in_progress_bookings: inProgress,
      pending_bookings: pending,
      cancelled_today: cancelled,
      active_technicians: technicians.length,
      completed_today: completedToday,
      avg_ticket_usd: avgTicket,
    };
  }, [bookings, todayStr, technicians.length]);

  const upcomingBookings = useMemo(() => {
    return bookings
      .filter(b => b.status !== 'completed' && b.status !== 'cancelled')
      .slice(0, 5);
  }, [bookings]);

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <PageHeader 
        title="Dashboard" 
        subtitle={
          <span className="flex items-center gap-2">
            <span>{formatDate(today.toISOString())}</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              En Vivo
            </span>
          </span>
        }
        action={<img src="/logo.png" alt="AutoSpa VZLA" className="h-12 md:h-14 w-auto object-contain drop-shadow-[0_2px_14px_rgba(213,174,51,0.35)]" />}
      />

      <div className="p-4 space-y-6 flex-1 max-w-5xl mx-auto w-full">
        {/* Banner de Notificación en Tiempo Real */}
        {adminAlert && (
          <div className="p-4 rounded-xl border border-primary/40 bg-gradient-to-r from-card via-[#161a20] to-card text-foreground flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
                <Bell className="w-5 h-5 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground flex items-center gap-1.5">
                  <span>{adminAlert.title}</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-primary text-black font-extrabold uppercase">
                    {adminAlert.type === 'new' ? 'Nuevo' : 'En Vivo'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Orden <span className="font-mono font-bold text-primary bg-black/40 px-1.5 py-0.5 rounded">{adminAlert.code}</span> • {adminAlert.message}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer" 
              onClick={() => setAdminAlert(null)}
            >
              Cerrar
            </Button>
          </div>
        )}

        {/* Stats Grid - 4 Fichas Principales Modernas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-[#12161C] border-[#2B313A] hover:border-sky-500/50 transition-all duration-300 shadow-md rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-sky-500/60 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Servicios Hoy</span>
              <div className="p-2 bg-sky-500/15 text-sky-400 border border-sky-500/30 rounded-xl group-hover:scale-110 transition-transform">
                <Calendar className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{stats.today_bookings}</div>
              <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1">
                <span>{stats.completed_today} completados</span>
              </p>
            </CardContent>
          </Card>
          
          <Card className="bg-[#12161C] border-[#2B313A] hover:border-emerald-500/50 transition-all duration-300 shadow-md rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingresos del Día</span>
              <div className="p-2 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-xl group-hover:scale-110 transition-transform">
                <DollarSign className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{formatCurrency(stats.today_revenue_usd)}</div>
              <p className="text-[11px] text-emerald-400/90 mt-1 flex items-center gap-1 font-medium">
                <span>Cobrado hoy</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#12161C] border-[#2B313A] hover:border-amber-500/50 transition-all duration-300 shadow-md rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500/60 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">En Proceso</span>
              <div className="p-2 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-xl group-hover:scale-110 transition-transform">
                <Loader className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{stats.in_progress_bookings}</div>
              <p className="text-[11px] text-amber-400/90 mt-1 flex items-center gap-1 font-medium">
                <span>En atención activa</span>
              </p>
            </CardContent>
          </Card>

          <Card className="bg-[#12161C] border-[#2B313A] hover:border-rose-500/50 transition-all duration-300 shadow-md rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-rose-500/60 to-transparent" />
            <CardHeader className="flex flex-row items-center justify-between pb-2 p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendientes</span>
              <div className="p-2 bg-rose-500/15 text-rose-400 border border-rose-500/30 rounded-xl group-hover:scale-110 transition-transform">
                <Clock className="h-4 w-4" />
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-0">
              <div className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">{stats.pending_bookings}</div>
              <p className="text-[11px] text-rose-400/90 mt-1 flex items-center gap-1 font-medium">
                <span>Por validar o asignar</span>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Resumen Rápido */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Resumen Operativo</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="bg-[#12161C] border-[#2B313A] hover:border-primary/40 rounded-2xl transition-all shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl text-indigo-400 shrink-0 flex items-center justify-center">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground min-h-[2rem] leading-tight flex items-center">
                    Clientes Registrados
                  </p>
                  <p className="font-extrabold text-xl text-white mt-0.5">{clients.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12161C] border-[#2B313A] hover:border-primary/40 rounded-2xl transition-all shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2.5 bg-amber-500/15 border border-amber-500/30 rounded-xl text-amber-400 shrink-0 flex items-center justify-center">
                  <Wrench className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground min-h-[2rem] leading-tight flex items-center">
                    Técnicos Operativos
                  </p>
                  <p className="font-extrabold text-xl text-white mt-0.5">{technicians.length}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12161C] border-[#2B313A] hover:border-primary/40 rounded-2xl transition-all shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2.5 bg-purple-500/15 border border-purple-500/30 rounded-xl text-purple-400 shrink-0 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground min-h-[2rem] leading-tight flex items-center">
                    Ticket Promedio
                  </p>
                  <p className="font-extrabold text-xl text-white mt-0.5">{formatCurrency(stats.avg_ticket_usd)}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#12161C] border-[#2B313A] hover:border-primary/40 rounded-2xl transition-all shadow-sm">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 shrink-0 flex items-center justify-center">
                  <XCircle className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground min-h-[2rem] leading-tight flex items-center">
                    Cancelados Hoy
                  </p>
                  <p className="font-extrabold text-xl text-white mt-0.5">{stats.cancelled_today}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Próximas Reservas */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Próximos Servicios</span>
            </h2>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="gap-1 text-primary hover:text-primary/80 font-semibold cursor-pointer">
                Ver todas <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando datos...</p>
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => {
                const service = services.find(s => s.id === booking.service_id);
                return (
                  <Link key={booking.id} href={`/admin/orders/${booking.id}`} className="block group">
                    <Card className="bg-[#12161C] border-[#2B313A] hover:border-primary/50 transition-all rounded-2xl shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-primary bg-black/40 px-2 py-0.5 rounded border border-[#2B313A]">{booking.code}</span>
                            <StatusBadge status={booking.status} />
                          </div>
                          <p className="font-semibold text-sm text-white truncate">{service?.name || 'Servicio de Lavado'}</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-primary/70 shrink-0" />
                            <span>{booking.scheduled_date} • {formatTimeSlot(booking.scheduled_time_slot)}</span>
                          </p>
                        </div>
                        <div className="text-right pl-3 shrink-0">
                          <span className="font-extrabold text-base text-primary block">{formatCurrency(booking.total_usd)}</span>
                          <span className="text-[11px] text-muted-foreground block">Ref. {formatCurrency(booking.total_ves, 'VES')}</span>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            ) : (
              <Card className="border-dashed border-[#2B313A] bg-[#12161C]/50 rounded-2xl">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">No hay servicios pendientes</p>
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>

      <NotificationPermissionPrompt role="admin" />
    </div>
  );
}

