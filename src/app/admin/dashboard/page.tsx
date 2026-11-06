'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { fetchBookings, fetchServices, fetchAdminTechnicians, fetchAdminClients } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { formatCurrency, formatDate, getLocalDateString, formatTimeSlot, getStatusLabel, playAudioChime, getBookingTimeStatus } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { TimeRemainingBadge } from '@/components/shared/time-remaining-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, Loader, Clock, Users, TrendingUp, XCircle, ArrowRight, ChevronRight, Wrench, Bell, Sparkles, AlertTriangle } from 'lucide-react';
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
              title: '¡Nueva Sesión Recibida en Tiempo Real!',
              code,
              message: 'Un cliente acaba de agendar una nueva sesión.',
              type: 'new',
            });
            showSystemNotification('¡Nueva Sesión Recibida!', {
              body: `Orden ${code}: Un cliente acaba de agendar una nueva sesión.`,
              url: '/admin/orders',
            });
          } else if (payload.eventType === 'UPDATE') {
            const code = payload.new?.code || 'Orden';
            const statusLabel = getStatusLabel(payload.new?.status || '');
            setAdminAlert({
              title: '¡Actualización de Sesión en Tiempo Real!',
              code,
              message: `El técnico o sistema cambió el estado a: ${statusLabel}`,
              type: 'update',
            });
            showSystemNotification('¡Actualización de Sesión!', {
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
          title: '¡Nueva Sesión Recibida en Tiempo Real!',
          code,
          message: 'Un cliente acaba de agendar una nueva sesión.',
          type: 'new',
        });
        showSystemNotification('¡Nueva Sesión Recibida!', {
          body: `Orden ${code}: Un cliente acaba de agendar una nueva sesión.`,
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
          title: '¡Actualización de Sesión en Tiempo Real!',
          code,
          message: `El técnico cambió el estado a: ${statusLabel}`,
          type: 'update',
        });
        showSystemNotification('¡Actualización de Sesión!', {
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
    const overdueCount = bookings.filter(b => getBookingTimeStatus(b).isOverdue).length;
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
      overdue_bookings: overdueCount,
    };
  }, [bookings, todayStr, technicians.length]);

  const upcomingBookings = useMemo(() => {
    return [...bookings]
      .sort((a, b) => {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return timeB - timeA;
      })
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

      <div className="p-4 space-y-5 flex-1 max-w-5xl mx-auto w-full">
        {/* Banner de Notificación en Tiempo Real */}
        {adminAlert && (
          <div className="p-3.5 rounded-xl border border-primary/40 bg-gradient-to-r from-card via-[#161a20] to-card text-foreground flex items-center justify-between shadow-2xl animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-primary shrink-0">
                <Bell className="w-4 h-4 animate-bounce" />
              </div>
              <div>
                <p className="font-bold text-xs text-foreground flex items-center gap-1.5">
                  <span>{adminAlert.title}</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-primary text-black font-extrabold uppercase">
                    {adminAlert.type === 'new' ? 'Nuevo' : 'En Vivo'}
                  </span>
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Orden <span className="font-mono font-bold text-primary bg-black/40 px-1 py-0.5 rounded">{adminAlert.code}</span> • {adminAlert.message}
                </p>
              </div>
            </div>
            <Button 
              size="sm" 
              variant="ghost" 
              className="text-xs text-muted-foreground hover:text-foreground shrink-0 cursor-pointer h-7 px-2" 
              onClick={() => setAdminAlert(null)}
            >
              Cerrar
            </Button>
          </div>
        )}

        {/* Banner de Órdenes Retrasadas / Vencidas */}
        {(stats.overdue_bookings ?? 0) > 0 && (
          <Link href="/admin/orders" className="block">
            <div className="p-3.5 rounded-xl border border-rose-500/50 bg-rose-500/10 text-foreground flex items-center justify-between shadow-xl animate-pulse hover:bg-rose-500/15 transition-all">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-500 shrink-0">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-extrabold text-xs text-rose-500 flex items-center gap-2 uppercase tracking-wide">
                    <span>¡Alerta Crítica: {stats.overdue_bookings} {stats.overdue_bookings === 1 ? 'Orden Vencida' : 'Órdenes Vencidas'}!</span>
                  </p>
                  <p className="text-[11px] text-foreground/80 mt-0.5">
                    Hay sesiones cuyo horario programado expiró sin completar. Pulsa para gestionar.
                  </p>
                </div>
              </div>
              <Button size="sm" variant="outline" className="border-rose-500/40 text-rose-500 hover:bg-rose-500/20 font-bold text-xs shrink-0 cursor-pointer h-7 px-2.5">
                Gestionar
                <ArrowRight className="w-3 h-3 ml-1" />
              </Button>
            </div>
          </Link>
        )}

        {/* SECCIÓN 1: PRÓXIMAS SESIONES Y ACTIVIDAD RECIENTE (ARRIBA) */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span>Últimas Sesiones y Notificaciones</span>
              <span className="text-[10px] text-muted-foreground font-normal ml-1">
                (Más recientes primero)
              </span>
            </h2>
            <Link href="/admin/orders">
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary hover:text-primary/80 font-semibold cursor-pointer">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>

          <div className="space-y-2">
            {isLoading ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Cargando sesiones...</p>
            ) : upcomingBookings.length > 0 ? (
              upcomingBookings.map((booking) => {
                const service = services.find(s => s.id === booking.service_id);
                return (
                  <Link key={booking.id} href={`/admin/orders/${booking.id}`} className="block group">
                    <div className="bg-[#12161C] border border-[#2B313A] hover:border-primary/50 transition-all rounded-xl px-3.5 py-2.5 flex items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[11px] font-bold text-primary bg-black/40 px-2 py-0.5 rounded border border-[#2B313A] shrink-0">
                          {booking.code}
                        </span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-xs text-white truncate">
                              {service?.name || 'Sesión AutoSpa'}
                            </p>
                            <StatusBadge status={booking.status} className="scale-90 origin-left" />
                          </div>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Clock className="w-3 h-3 text-primary/70 shrink-0" />
                            <span>{booking.scheduled_date} • {formatTimeSlot(booking.scheduled_time_slot)}</span>
                            <TimeRemainingBadge booking={booking} size="sm" className="scale-90 origin-left ml-1" />
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-extrabold text-sm text-primary block leading-tight">
                          {formatCurrency(booking.total_usd)}
                        </span>
                        <span className="text-[10px] text-muted-foreground block">
                          Ref. {formatCurrency(booking.total_ves, 'VES')}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })
            ) : (
              <div className="border border-dashed border-[#2B313A] bg-[#12161C]/50 rounded-xl p-6 text-center">
                <p className="text-muted-foreground text-xs">No hay sesiones pendientes</p>
              </div>
            )}
          </div>
        </section>

        {/* SECCIÓN 2: MÉTRICAS Y FICHAS DEL DÍA (COMPACTAS Y PRÁCTICAS) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          <div className="bg-[#12161C] border border-[#2B313A] hover:border-sky-500/40 transition-all rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Sesiones Hoy</span>
              <div className="text-xl font-extrabold text-white mt-0.5">{stats.today_bookings}</div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stats.completed_today} completadas</p>
            </div>
            <div className="p-2 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-lg shrink-0">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          
          <div className="bg-[#12161C] border border-[#2B313A] hover:border-emerald-500/40 transition-all rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Ingresos del Día</span>
              <div className="text-xl font-extrabold text-white mt-0.5">{formatCurrency(stats.today_revenue_usd)}</div>
              <p className="text-[10px] text-emerald-400/90 mt-0.5 font-medium">Cobrado hoy</p>
            </div>
            <div className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-[#12161C] border border-[#2B313A] hover:border-amber-500/40 transition-all rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">En Proceso</span>
              <div className="text-xl font-extrabold text-white mt-0.5">{stats.in_progress_bookings}</div>
              <p className="text-[10px] text-amber-400/90 mt-0.5 font-medium">En atención activa</p>
            </div>
            <div className="p-2 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg shrink-0">
              <Loader className="h-4 w-4" />
            </div>
          </div>

          <div className="bg-[#12161C] border border-[#2B313A] hover:border-rose-500/40 transition-all rounded-xl p-3 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block">Pendientes</span>
              <div className="text-xl font-extrabold text-white mt-0.5">{stats.pending_bookings}</div>
              <p className="text-[10px] text-rose-400/90 mt-0.5 font-medium">Por validar o asignar</p>
            </div>
            <div className="p-2 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-lg shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
        </div>

        {/* SECCIÓN 3: RESUMEN OPERATIVO COMPACTO */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>Resumen Operativo</span>
            </h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            <div className="bg-[#12161C] border border-[#2B313A] rounded-xl p-3 flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 rounded-lg text-indigo-400 shrink-0">
                <Users className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Clientes</p>
                <p className="font-extrabold text-base text-white mt-0.5">{clients.length}</p>
              </div>
            </div>

            <div className="bg-[#12161C] border border-[#2B313A] rounded-xl p-3 flex items-center gap-2.5">
              <div className="p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
                <Wrench className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Técnicos</p>
                <p className="font-extrabold text-base text-white mt-0.5">{technicians.length}</p>
              </div>
            </div>

            <div className="bg-[#12161C] border border-[#2B313A] rounded-xl p-3 flex items-center gap-2.5">
              <div className="p-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 shrink-0">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Ticket Promedio</p>
                <p className="font-extrabold text-base text-white mt-0.5">{formatCurrency(stats.avg_ticket_usd)}</p>
              </div>
            </div>

            <div className="bg-[#12161C] border border-[#2B313A] rounded-xl p-3 flex items-center gap-2.5">
              <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 shrink-0">
                <XCircle className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Cancelados Hoy</p>
                <p className="font-extrabold text-base text-white mt-0.5">{stats.cancelled_today}</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <NotificationPermissionPrompt role="admin" />
    </div>
  );
}

