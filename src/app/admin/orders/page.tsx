'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  fetchBookings, 
  fetchServices, 
  fetchAdminClients, 
  fetchAdminTechnicians, 
  parseBookingPaymentData,
  assignBookingTechnician,
  rescheduleBooking,
  fetchBookedTimeSlots,
  fetchDateAvailabilityDetails
} from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { 
  formatCurrency, 
  formatTimeSlot, 
  getLocalDateString, 
  cn, 
  getBookingTimeStatus,
  isTimeSlotInThePast, 
  normalizeTimeSlotId,
  generateDynamicTimeSlots,
  parseTimeSlotRange,
  minutesToTimeString
} from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { TimeRemainingBadge } from '@/components/shared/time-remaining-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  ChevronRight, 
  CalendarDays, 
  User, 
  Wrench, 
  Clock, 
  AlertTriangle, 
  Calendar,
  MessageCircle,
  Phone,
  RotateCcw,
  Plus
} from 'lucide-react';
import { TIME_SLOTS } from '@/lib/data/mock-data';
import type { Booking, Service, Customer, User as UserType } from '@/lib/types';
import { AdminCreateBookingModal } from '@/components/admin/admin-create-booking-modal';

type FilterTab = 'all' | 'overdue' | 'today' | 'pending' | 'in_progress' | 'completed';

export default function AdminOrdersPage() {
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal para Programar Servicio Directo por Administrador
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Modales de Acción Rápida para Órdenes Vencidas / Reasignación / Reprogramación
  const [selectedBookingForAction, setSelectedBookingForAction] = useState<Booking | null>(null);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<string[]>([]);
  const [rescheduleActiveBookings, setRescheduleActiveBookings] = useState<Array<{ id: string; slot: string }>>([]);
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  const todayStr = getLocalDateString();

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return getLocalDateString(d);
    });
  }, []);

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

  useEffect(() => {
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

  // Cargar disponibilidad y reservas activas al abrir modal de reprogramación
  useEffect(() => {
    if (!isRescheduleModalOpen || !selectedDate || !selectedBookingForAction) return;
    let isMounted = true;
    async function loadRescheduleSlots() {
      const details = await fetchDateAvailabilityDetails(selectedDate, selectedBookingForAction?.id);
      if (isMounted) {
        setRescheduleBookedSlots(details.bookedSlots);
        setRescheduleActiveBookings(details.activeBookings);
      }
    }
    loadRescheduleSlots();
    return () => { isMounted = false; };
  }, [isRescheduleModalOpen, selectedDate, selectedBookingForAction]);

  const targetDuration = selectedBookingForAction?.estimated_duration || 60;
  const dynamicRescheduleSlots = useMemo(() => {
    if (!selectedDate || !isRescheduleModalOpen) return [];
    return generateDynamicTimeSlots({
      date: selectedDate,
      durationMinutes: targetDuration,
      bufferMinutes: 40,
      activeBookings: rescheduleActiveBookings,
      workDayStart: "08:00",
      workDayEnd: "18:00",
      stepMinutes: 30,
      minLeadMinutes: 0,
    });
  }, [selectedDate, targetDuration, rescheduleActiveBookings, isRescheduleModalOpen]);

  // Contar órdenes vencidas
  const overdueBookingsCount = useMemo(() => {
    return bookings.filter(b => {
      const timeStatus = getBookingTimeStatus(b);
      return timeStatus.isOverdue;
    }).length;
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      if (activeTab === 'overdue') {
        const timeStatus = getBookingTimeStatus(booking);
        return timeStatus.isOverdue;
      }
      if (activeTab === 'today') return booking.scheduled_date === todayStr; 
      if (activeTab === 'pending') return booking.status === 'pending_payment' || booking.status === 'confirmed';
      if (activeTab === 'in_progress') return booking.status === 'in_progress' || booking.status === 'en_route' || booking.status === 'arrived';
      if (activeTab === 'completed') return booking.status === 'completed';
      return true;
    });
  }, [bookings, activeTab, todayStr]);

  const handleOpenAssignModal = (b: Booking, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBookingForAction(b);
    setSelectedTechId(b.assigned_technician_id || '');
    setIsAssignModalOpen(true);
  };

  const handleOpenRescheduleModal = (b: Booking, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedBookingForAction(b);
    setSelectedDate(b.scheduled_date || next7Days[0]);
    setSelectedSlot(b.scheduled_time_slot || '');
    setIsRescheduleModalOpen(true);
  };

  const handleConfirmAssign = async () => {
    if (!selectedBookingForAction || !selectedTechId) return;
    setIsSubmittingAction(true);
    const ok = await assignBookingTechnician(selectedBookingForAction.id, selectedTechId, 'Admin');
    if (ok) {
      setBookings(prev => prev.map(b => b.id === selectedBookingForAction.id ? { ...b, assigned_technician_id: selectedTechId, status: 'assigned' } : b));
      setIsAssignModalOpen(false);
    }
    setIsSubmittingAction(false);
  };

  const handleConfirmReschedule = async () => {
    if (!selectedBookingForAction || !selectedDate || !selectedSlot) return;
    setIsSubmittingAction(true);
    const ok = await rescheduleBooking(selectedBookingForAction.id, selectedDate, selectedSlot, 'Admin (Gestión Retraso)');
    if (ok) {
      setBookings(prev => prev.map(b => b.id === selectedBookingForAction.id ? { ...b, scheduled_date: selectedDate, scheduled_time_slot: selectedSlot, status: 'rescheduled' } : b));
      setIsRescheduleModalOpen(false);
    }
    setIsSubmittingAction(false);
  };

  return (
    <div className="flex flex-col min-h-screen pb-24">
      <PageHeader 
        title="Órdenes y Reservas"
        action={
          <Button
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 flex items-center gap-1.5 shadow-md shadow-primary/20 text-xs cursor-pointer h-9 px-3"
          >
            <Plus className="w-4 h-4" />
            <span>Programar Sesión</span>
          </Button>
        }
      />

      <div className="p-4 space-y-4 flex-1 max-w-5xl mx-auto w-full">
        {/* Banner Urgente de Órdenes Retrasadas / Vencidas */}
        {overdueBookingsCount > 0 && (
          <div className="bg-rose-500/10 border-2 border-rose-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-500/20 text-rose-500 rounded-xl shrink-0 animate-pulse">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-rose-500 uppercase tracking-wider">
                    Atención Requerida: {overdueBookingsCount} {overdueBookingsCount === 1 ? 'Orden Vencida / Retrasada' : 'Órdenes Vencidas / Retrasadas'}
                  </h3>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Hay órdenes cuyo horario pactado ya finalizó y no han sido ejecutadas. Puedes reasignar técnico o reagendar de inmediato.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveTab('overdue')}
              className="border-rose-500/30 text-rose-500 hover:bg-rose-500/10 cursor-pointer font-bold text-xs shrink-0"
            >
              Ver {overdueBookingsCount} Vencidas
            </Button>
          </div>
        )}

        <Tabs defaultValue="all" value={activeTab} onValueChange={(val) => setActiveTab(val as FilterTab)} className="w-full">
          <TabsList className="w-full h-12 justify-start overflow-x-auto hide-scrollbar snap-x">
            <TabsTrigger value="all" className="min-w-fit snap-start px-4">Todas ({bookings.length})</TabsTrigger>
            
            {/* Pestaña Retrasadas / Vencidas */}
            <TabsTrigger value="overdue" className="min-w-fit snap-start px-4 flex items-center gap-1.5 font-bold">
              <span>⚠️ Retrasadas</span>
              {overdueBookingsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                  {overdueBookingsCount}
                </span>
              )}
            </TabsTrigger>

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
                const timeStatus = getBookingTimeStatus(booking);
                
                return (
                  <Link key={booking.id} href={`/admin/orders/${booking.id}`} className="block">
                    <Card className={cn(
                      "transition-all active:bg-muted/50 border",
                      timeStatus.isOverdue
                        ? "border-rose-500/50 bg-rose-500/[0.04] shadow-md hover:border-rose-500 ring-1 ring-rose-500/20"
                        : isWaitingVerification 
                          ? "border-amber-500/50 bg-amber-500/[0.04] shadow-sm hover:border-amber-500" 
                          : "hover:border-primary/50"
                    )}>
                      <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex items-center gap-2">
                              <span className="font-bold font-mono text-foreground">{booking.code}</span>
                              <TimeRemainingBadge booking={booking} size="sm" />
                            </div>
                            
                            <div className="flex items-center gap-2">
                              {isWaitingVerification ? (
                                <Badge variant="outline" className="flex items-center gap-1.5 font-bold border-amber-500/50 bg-amber-500/15 text-amber-500 text-xs px-2.5 py-1 animate-pulse">
                                  <Clock className="w-3.5 h-3.5" />
                                  <span>Pago por Verificar</span>
                                </Badge>
                              ) : (
                                <StatusBadge status={booking.status} />
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="text-sm font-semibold">{service?.name || 'Sesión AutoSpa'}</span>
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
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground mt-2">
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
                              <span className={cn(!tech && "text-amber-500 font-semibold")}>{tech?.full_name || 'Sin técnico asignado'}</span>
                            </div>
                            <div className="font-semibold text-primary">
                              {formatCurrency(booking.total_usd)}
                            </div>
                          </div>
                        </div>

                        {/* Botones de Acción Rápida (Especialmente para Vencidas) */}
                        <div className="flex items-center gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-border/50 shrink-0">
                          {timeStatus.isOverdue && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold border-primary/30 hover:bg-primary/10 text-primary cursor-pointer"
                                onClick={(e) => handleOpenAssignModal(booking, e)}
                                title="Reasignar a otro técnico"
                              >
                                <Wrench className="w-3.5 h-3.5 mr-1" />
                                Reasignar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs font-semibold border-amber-500/30 hover:bg-amber-500/10 text-amber-500 cursor-pointer"
                                onClick={(e) => handleOpenRescheduleModal(booking, e)}
                                title="Reagendar turno"
                              >
                                <Calendar className="w-3.5 h-3.5 mr-1" />
                                Reagendar
                              </Button>
                            </>
                          )}
                          <ChevronRight className="w-5 h-5 text-muted-foreground ml-1 shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })
            ) : (
              <Card className="border-dashed bg-muted/20">
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground text-sm">
                    {activeTab === 'overdue' ? '¡Excelente! No hay órdenes vencidas o retrasadas.' : 'No hay órdenes en esta categoría'}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </Tabs>
      </div>

      {/* Modal Reasignar Técnico */}
      <Dialog open={isAssignModalOpen} onOpenChange={setIsAssignModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reasignar Técnico</DialogTitle>
            <DialogDescription>
              Orden <span className="font-mono font-bold text-foreground">{selectedBookingForAction?.code}</span>. Selecciona el técnico que tomará la sesión.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3">
            {technicians.map((t) => {
              const isSelected = selectedTechId === t.id;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTechId(t.id)}
                  className={cn(
                    "p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all",
                    isSelected
                      ? "bg-primary/10 border-primary text-foreground font-semibold"
                      : "hover:bg-muted/50 border-border"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/20 text-primary font-bold flex items-center justify-center text-xs">
                      {t.full_name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{t.full_name}</p>
                      <p className="text-xs text-muted-foreground">{t.phone || 'Técnico de servicio'}</p>
                    </div>
                  </div>
                  {isSelected && (
                    <span className="text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/20">
                      Seleccionado
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmAssign} disabled={!selectedTechId || isSubmittingAction}>
              {isSubmittingAction ? 'Guardando...' : 'Confirmar Reasignación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reagendar Turno */}
      <Dialog open={isRescheduleModalOpen} onOpenChange={setIsRescheduleModalOpen}>
        <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reagendar Turno de Cita</DialogTitle>
            <DialogDescription>
              Orden <span className="font-mono font-bold text-foreground">{selectedBookingForAction?.code}</span>. Selecciona la nueva fecha y franja horaria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">1. Selecciona Fecha:</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {next7Days.map((date) => {
                  const [y, m, d] = date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
                  const dayName = dateObj.toLocaleDateString('es-VE', { weekday: 'short' });
                  const isSelected = selectedDate === date;

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedSlot('');
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[4.2rem] p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-md font-bold"
                          : "bg-card border-border hover:border-primary/50 text-foreground"
                      )}
                    >
                      <span className="text-[10px] uppercase">{dayName}</span>
                      <span className="text-base font-extrabold">{d}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  2. Turnos sugeridos ({targetDuration} min + 40 min traslado):
                </p>
                <Badge variant="outline" className="text-[10px] text-primary border-primary/30 font-medium">
                  Moto: 40m colchón
                </Badge>
              </div>

              {/* Dynamic slots */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                {dynamicRescheduleSlots.map((slot) => {
                  const isOccupied = !slot.is_available;
                  const isSelected = selectedSlot === slot.id;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isOccupied}
                      onClick={() => {
                        setSelectedSlot(slot.id);
                        setCustomTimeInput(slot.id);
                      }}
                      className={cn(
                        "p-2.5 rounded-xl border flex items-center justify-between text-left text-xs transition-all",
                        isOccupied
                          ? "opacity-40 cursor-not-allowed bg-muted/20 border-dashed"
                          : isSelected
                            ? "bg-primary/10 border-primary text-foreground font-bold shadow-sm ring-1 ring-primary/40"
                            : "hover:bg-muted/40 border-border cursor-pointer text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Clock className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="truncate">{slot.label}</span>
                      </div>
                      <Badge variant="outline" className={cn(
                        "text-[9px] py-0 px-1 shrink-0 font-normal",
                        isOccupied ? "text-destructive border-destructive/20" : "text-emerald-500 border-emerald-500/20"
                      )}>
                        {isOccupied ? 'Ocupado' : 'Libre'}
                      </Badge>
                    </button>
                  );
                })}
              </div>

              {/* Opción Manual para el Administrador */}
              <div className="mt-3 pt-3 border-t border-border/50">
                <label className="text-[11px] font-semibold text-muted-foreground block mb-1">
                  O asignar horario personalizado / ajuste de ruta:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTimeInput}
                    onChange={(e) => {
                      setCustomTimeInput(e.target.value);
                      setSelectedSlot(e.target.value);
                    }}
                    placeholder="Ej. 10:30 - 11:45"
                    className="flex-1 text-xs bg-muted/30 border border-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  {selectedSlot && (
                    <Badge variant="secondary" className="text-xs px-2.5 py-1 text-primary bg-primary/10 border border-primary/20 shrink-0 font-medium self-center">
                      {formatTimeSlot(selectedSlot)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsRescheduleModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleConfirmReschedule} disabled={!selectedDate || !selectedSlot || isSubmittingAction}>
              {isSubmittingAction ? 'Guardando...' : 'Confirmar Reagendamiento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal para Programar Servicio Directo */}
      <AdminCreateBookingModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
}
