'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { PageHeader } from '@/components/shared/page-header';
import { StatusBadge } from '@/components/shared/status-badge';
import { 
  fetchBookingById, 
  fetchServices, 
  fetchCustomerVehicles, 
  fetchCustomerAddresses,
  updateBookingStatus,
  rescheduleBooking,
  fetchBookedTimeSlots,
  parseBookingPaymentData
} from '@/lib/supabase/api';
import { PaymentReportCard } from '@/components/shared/payment-report-card';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/auth/auth-context';
import { 
  formatCurrency, 
  formatTimeSlot, 
  getLocalDateString, 
  cn, 
  playAudioChime,
  isTimeSlotInThePast,
  normalizeTimeSlotId,
  canClientRescheduleBooking,
  getBookingTimeStatus
} from '@/lib/utils';
import { TimeRemainingBadge } from '@/components/shared/time-remaining-badge';
import { showSystemNotification } from '@/lib/notifications';
import { NotificationPermissionPrompt } from '@/components/shared/notification-permission-prompt';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { CheckCircle2, Clock, MapPin, MessageCircle, Calendar, AlertTriangle, Bell, Sparkles, Navigation, Users } from 'lucide-react';
import Link from 'next/link';
import { TIME_SLOTS } from '@/lib/data/mock-data';
import type { Booking, Service, Vehicle, CustomerAddress } from '@/lib/types';

function playClientNotificationSound() {
  playAudioChime('subtle');
}

function getStatusDetails(status: string) {
  switch (status) {
    case 'confirmed':
      return { title: '¡Orden Confirmada!', message: 'Tu pago fue verificado y la reserva está aprobada.' };
    case 'assigned':
      return { title: '¡Técnico Asignado!', message: 'Un especialista ha sido asignado a tu servicio.' };
    case 'en_route':
      return { title: '🚗 ¡Técnico en Camino!', message: 'El técnico ha iniciado el recorrido hacia tu ubicación.' };
    case 'arrived':
      return { title: '📍 ¡Técnico en Sitio!', message: 'El técnico ha llegado a tu dirección.' };
    case 'in_progress':
      return { title: '🫧 ¡Lavado en Proceso!', message: 'Tu auto está recibiendo el tratamiento de limpieza ahora mismo.' };
    case 'quality_check':
      return { title: '🔍 Control de Calidad', message: 'Verificando los acabados finales del servicio.' };
    case 'completed':
      return { title: '✨ ¡Vehículo Listo!', message: 'El servicio ha finalizado. ¡Tu auto quedó reluciente!' };
    default:
      return { title: 'Actualización en tu Servicio', message: 'El estado de la reserva ha cambiado.' };
  }
}

export default function ClientReservationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const id = params?.id as string;
  
  const [booking, setBooking] = useState<Booking | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState<{ title: string; message: string } | null>(null);

  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<string[]>([]);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Generate next 7 days in local Caracas timezone
  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return getLocalDateString(d);
  });

  useEffect(() => {
    if (!isRescheduleOpen || !selectedDate) return;
    let isMounted = true;
    async function loadRescheduleSlots() {
      const occupied = await fetchBookedTimeSlots(selectedDate, id);
      if (isMounted) {
        setRescheduleBookedSlots(occupied);
        if (selectedSlot) {
          const norm = normalizeTimeSlotId(selectedSlot);
          const slotObj = TIME_SLOTS.find(s => s.id === norm);
          const isPast = slotObj ? isTimeSlotInThePast(slotObj.start_time, selectedDate) : false;
          if (isPast || occupied.includes(norm)) {
            setSelectedSlot('');
          }
        }
      }
    }
    loadRescheduleSlots();
    return () => { isMounted = false; };
  }, [isRescheduleOpen, selectedDate, id]);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      setIsLoading(true);
      const bData = await fetchBookingById(id);
      if (!bData) {
        setIsLoading(false);
        return;
      }
      setBooking(bData);

      const [servicesData, vehiclesData, addressesData] = await Promise.all([
        fetchServices(),
        fetchCustomerVehicles(user?.id),
        fetchCustomerAddresses(user?.id),
      ]);

      const foundService = servicesData.find(s => s.id === bData.service_id) || null;
      const foundVehicle = vehiclesData.find(v => v.id === bData.vehicle_id) || null;
      const foundAddress = addressesData.find(a => a.id === bData.address_id) || null;

      setService(foundService);
      setVehicle(foundVehicle);
      setAddress(foundAddress);
      setIsLoading(false);
    }
    loadData();

    // Suscripción en Tiempo Real para esta reserva
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === `realtime:client-booking-${id}-realtime`);
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel(`client-booking-${id}-realtime`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'bookings', filter: `id=eq.${id}` },
        async (payload: any) => {
          if (payload.eventType === 'DELETE') {
            setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
            setLiveAlert({
              title: 'Orden Cancelada / Eliminada',
              message: 'Esta reserva ha sido cancelada por el Administrador.',
            });
            return;
          }
          const fresh = await fetchBookingById(id);
          if (fresh) {
            setBooking(fresh);
            playClientNotificationSound();
            const details = getStatusDetails(fresh.status);
            setLiveAlert(details);
            showSystemNotification(details.title, {
              body: `${fresh.code || 'Tu Reserva'}: ${details.message}`,
              url: `/client/reservations/${id}`,
            });
            setTimeout(() => setLiveAlert(null), 10000);
          } else {
            setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
            setLiveAlert({
              title: 'Orden Cancelada / Eliminada',
              message: 'Esta reserva ha sido cancelada por el Administrador.',
            });
          }
        }
      )
      .on('broadcast', { event: 'client_booking_updated' }, async (payload: any) => {
        if (!payload.payload?.bookingId || payload.payload?.bookingId === id) {
          if (payload.payload?.status === 'cancelled') {
            setBooking(prev => prev ? { ...prev, status: 'cancelled' } : null);
            setLiveAlert({
              title: 'Orden Cancelada / Eliminada',
              message: 'Esta reserva ha sido cancelada por el Administrador.',
            });
            return;
          }
          const fresh = await fetchBookingById(id);
          if (fresh) {
            setBooking(fresh);
            playClientNotificationSound();
            const details = getStatusDetails(payload.payload?.status || fresh.status);
            setLiveAlert(details);
            showSystemNotification(details.title, {
              body: `${fresh.code || 'Tu Reserva'}: ${details.message}`,
              url: `/client/reservations/${id}`,
            });
            setTimeout(() => setLiveAlert(null), 10000);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user?.id]);

  const handleOpenReschedule = () => {
    setSelectedDate(booking?.scheduled_date || next7Days[0]);
    setSelectedSlot('');
    setRescheduleError(null);
    setIsRescheduleOpen(true);
  };

  const handleConfirmReschedule = async () => {
    if (!booking) return;
    setRescheduleError(null);

    const normSlot = normalizeTimeSlotId(selectedSlot);
    if (!normSlot) {
      setRescheduleError('Por favor selecciona un horario disponible.');
      return;
    }

    const slotObj = TIME_SLOTS.find(s => s.id === normSlot);
    if (slotObj && isTimeSlotInThePast(slotObj.start_time, selectedDate)) {
      setRescheduleError('El turno seleccionado ya pasó para la fecha de hoy. Selecciona otro horario.');
      return;
    }

    const occupied = await fetchBookedTimeSlots(selectedDate, id);
    if (occupied.includes(normSlot)) {
      setRescheduleError('Este turno ya se encuentra ocupado. Por favor selecciona otro.');
      return;
    }

    setIsSubmittingReschedule(true);
    const success = await rescheduleBooking(booking.id, selectedDate, normSlot, user?.id);
    if (success) {
      setBooking(prev => prev ? {
        ...prev,
        scheduled_date: selectedDate,
        scheduled_time_slot: normSlot,
      } : null);
      setIsRescheduleOpen(false);
    } else {
      setRescheduleError('No se pudo reprogramar la cita. Intenta nuevamente.');
    }
    setIsSubmittingReschedule(false);
  };

  const handleConfirmCancel = async () => {
    if (!booking) return;
    setIsSubmittingCancel(true);
    const success = await updateBookingStatus(booking.id, 'cancelled', 'Cancelada por el cliente', user?.id);
    if (success) {
      setBooking(prev => prev ? {
        ...prev,
        status: 'cancelled',
      } : null);
      setIsCancelOpen(false);
    }
    setIsSubmittingCancel(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Detalle de Reserva" backHref="/client/reservations" />
        <div className="p-8 text-center text-muted-foreground text-sm">Cargando reserva...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="min-h-screen bg-background">
        <PageHeader title="Reserva no encontrada" backHref="/client/reservations" />
        <div className="p-8 text-center space-y-4">
          <p className="text-muted-foreground">La reserva solicitada no existe o fue eliminada.</p>
          <Button onClick={() => router.push('/client/reservations')}>Volver a Mis Reservas</Button>
        </div>
      </div>
    );
  }

  // Política de AutoSpa: Solo se cancela si está pendiente de pago. Si ya pagó, se permite reprogramar con mínimo 12h de anticipación.
  const isBookingActive = ['pending_payment', 'confirmed', 'assigned'].includes(booking.status);
  const canCancel = booking.status === 'pending_payment';
  const reschedulePolicy = canClientRescheduleBooking(booking.scheduled_date, booking.scheduled_time_slot, 12);
  const canReschedule = isBookingActive && (canCancel || reschedulePolicy.allowed);

  // Enhanced Live Timeline
  const isConfirmed = !['pending_payment'].includes(booking.status);
  const isAssigned = ['assigned', 'en_route', 'arrived', 'in_progress', 'quality_check', 'completed', 'invoiced', 'closed'].includes(booking.status);
  const isEnRoute = ['en_route', 'arrived', 'in_progress', 'quality_check', 'completed', 'invoiced', 'closed'].includes(booking.status);
  const isArrived = ['arrived', 'in_progress', 'quality_check', 'completed', 'invoiced', 'closed'].includes(booking.status);
  const isInProgress = ['in_progress', 'quality_check', 'completed', 'invoiced', 'closed'].includes(booking.status);
  const isCompleted = ['completed', 'invoiced', 'closed'].includes(booking.status);

  const timeline = [
    { status: 'Sesión Solicitada', desc: 'Registro inicial completado', done: true },
    { status: 'Pago Verificado & Confirmada', desc: isConfirmed ? 'Aprobada por el equipo' : 'En espera de validación de pago', done: isConfirmed },
    { status: 'Técnico Especialista Asignado', desc: isAssigned ? 'Especialista preparado' : 'Pendiente de asignación', done: isAssigned },
    { status: 'Técnico en Camino', desc: isEnRoute ? 'En ruta hacia la ubicación del paciente' : 'A la espera del traslado', done: isEnRoute },
    { status: 'Llegada al Sitio', desc: isArrived ? 'Especialista en ubicación del paciente' : 'Por llegar', done: isArrived },
    { status: 'Sesión en Proceso', desc: isInProgress ? 'Paciente siendo atendido' : 'Pendiente de inicio', done: isInProgress },
    { status: 'Sesión Completada', desc: isCompleted ? '¡Paciente listo e impecable!' : 'Pendiente de finalización', done: isCompleted },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-48 bg-muted/30">
      <PageHeader
        title={`Reserva ${booking.code}`}
        subtitle={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Seguimiento En Vivo
          </span>
        }
        backHref="/client/reservations"
      />

      <main className="flex-1 p-4 space-y-4 max-w-lg mx-auto w-full">
        {/* Realtime Notification Banner */}
        {liveAlert && (
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-2 border-primary/60 rounded-xl p-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 text-primary rounded-lg animate-bounce shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">{liveAlert.title}</h4>
                  <p className="text-xs text-foreground font-medium mt-0.5">{liveAlert.message}</p>
                </div>
              </div>
              <button
                onClick={() => setLiveAlert(null)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
                aria-label="Cerrar notificación"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Live Status Highlight Card */}
        {isEnRoute && !isCompleted && (
          <Card className="border-primary/40 bg-gradient-to-r from-primary/10 via-background to-primary/5 shadow-sm">
            <CardContent className="p-3.5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                {booking.status === 'en_route' && <Navigation className="h-5 w-5 animate-pulse text-teal-500" />}
                {booking.status === 'arrived' && <MapPin className="h-5 w-5 text-amber-500" />}
                {booking.status === 'in_progress' && <Sparkles className="h-5 w-5 text-primary animate-spin" />}
                {booking.status === 'quality_check' && <Sparkles className="h-5 w-5 text-blue-500" />}
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold text-foreground">
                  {booking.status === 'en_route' && '🚗 Tu técnico va en camino hacia la ubicación del paciente'}
                  {booking.status === 'arrived' && '📍 Tu técnico ha llegado al lugar del paciente'}
                  {booking.status === 'in_progress' && '🫧 Sesión de cuidado en proceso'}
                  {booking.status === 'quality_check' && '🔍 Inspección final de calidad del paciente'}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  La información se actualiza automáticamente en tiempo real.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Alerta de Retraso Crítico para el Cliente */}
        {(() => {
          const timeStatus = getBookingTimeStatus(booking);
          if (!timeStatus.isOverdue) return null;

          return (
            <Card className="border-2 border-rose-500/50 bg-rose-500/10 shadow-lg animate-pulse">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-rose-500/20 text-rose-500 rounded-lg shrink-0 mt-0.5">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-extrabold text-rose-500 uppercase tracking-wide">
                      Horario Expirado / En Revisión con Soporte
                    </h4>
                    <p className="text-xs text-foreground mt-1 leading-relaxed">
                      El horario previsto para la sesión de tu paciente ({booking.scheduled_date} • {formatTimeSlot(booking.scheduled_time_slot)}) ya finalizó. 
                      Nuestro equipo de <strong>Administración y Soporte</strong> está al tanto de la incidencia. 
                      Por favor, contáctanos directamente para reasignar la hora o reprogramar tu sesión sin inconvenientes.
                    </p>
                  </div>
                </div>

                <a
                  href={`https://wa.me/584241979461?text=${encodeURIComponent(`¡Hola AutoSpa! Tengo una consulta sobre mi orden ${booking.code}. El horario previsto (${booking.scheduled_date} - ${formatTimeSlot(booking.scheduled_time_slot)}) ya pasó y requiero información o reagendar.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full"
                >
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs h-10 gap-2 shadow-sm cursor-pointer">
                    <MessageCircle className="h-4 w-4" />
                    Escribir a Administración / Soporte (WhatsApp)
                  </Button>
                </a>
              </CardContent>
            </Card>
          );
        })()}

        <div className="flex flex-col items-center justify-center gap-2 mb-4">
          <div className="scale-110">
            <StatusBadge status={booking.status} />
          </div>
          <TimeRemainingBadge booking={booking} size="md" />
        </div>

        {/* Reporte de Pago y Cuentas */}
        <PaymentReportCard
          bookingId={booking.id}
          bookingCode={booking.code}
          totalUsd={booking.total_usd}
          totalVes={booking.total_ves}
          exchangeRate={booking.exchange_rate}
          currentStatus={booking.status}
          createdAt={booking.created_at}
          existingPayment={parseBookingPaymentData(booking.notes)}
          onPaymentReported={async () => {
            const updated = await fetchBookingById(id);
            if (updated) setBooking(updated);
          }}
          onExpired={async () => {
            const updated = await fetchBookingById(id);
            if (updated) setBooking(updated);
          }}
          className="mb-4"
        />

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-primary" /> Sesión
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-base">{service?.name || 'Sesión de Cuidado'}</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Duración est.: {booking.estimated_duration} min
            </div>
          </CardContent>
        </Card>

        {vehicle && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Paciente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-medium">{vehicle.brand} {vehicle.model}</div>
              <div className="text-xs text-muted-foreground font-mono mt-0.5">
                {vehicle.plate} • {vehicle.color}
              </div>
            </CardContent>
          </Card>
        )}

        {address && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-primary" /> Ubicación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="font-medium">{address.label}</div>
              <div className="text-sm text-muted-foreground line-clamp-2">
                {address.address_line} {address.reference ? `(${address.reference})` : ''} - {address.municipality}
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-primary" /> Horario
            </CardTitle>
            <TimeRemainingBadge booking={booking} size="sm" />
          </CardHeader>
          <CardContent>
            <div className="font-semibold text-base">{booking.scheduled_date}</div>
            <div className="text-sm text-muted-foreground">{formatTimeSlot(booking.scheduled_time_slot)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Pago</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span className="text-primary">{formatCurrency(booking.total_usd)}</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tasa: {booking.exchange_rate} Bs/$</span>
              <span className="font-semibold text-foreground">Ref. {formatCurrency(booking.total_ves, 'VES')}</span>
            </div>
          </CardContent>
        </Card>

        <div className="pt-2 px-2">
          <h3 className="font-semibold mb-4 text-xs text-muted-foreground uppercase tracking-wider">Estado de la Reserva</h3>
          <div className="space-y-4">
            {timeline.map((step, idx) => (
              <div key={idx} className="flex gap-4 relative">
                {idx !== timeline.length - 1 && (
                  <div className={`absolute left-[11px] top-6 bottom-[-16px] w-[2px] ${step.done ? 'bg-primary' : 'bg-border'}`} />
                )}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 z-10 ${step.done ? 'bg-primary text-primary-foreground' : 'bg-muted border-2 border-border'}`}>
                  {step.done && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <div className="pb-4">
                  <div className={`font-medium ${!step.done ? 'text-muted-foreground' : 'text-foreground'}`}>{step.status}</div>
                  <div className="text-xs text-muted-foreground">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Barra de acción fija inferior */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t space-y-3 shadow-2xl z-40 pb-safe max-w-lg mx-auto">
        {isBookingActive && (
          <div className="space-y-2">
            {canCancel ? (
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  variant="outline" 
                  className="w-full h-11 font-medium cursor-pointer border-[#2B313A] hover:bg-[#1E2329]"
                  onClick={handleOpenReschedule}
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Reprogramar Cita
                </Button>
                <Button 
                  variant="destructive" 
                  className="w-full h-11 font-medium cursor-pointer"
                  onClick={() => setIsCancelOpen(true)}
                >
                  Cancelar Reserva
                </Button>
              </div>
            ) : reschedulePolicy.allowed ? (
              <>
                <Button 
                  variant="outline" 
                  className="w-full h-12 font-semibold text-sm cursor-pointer border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary"
                  onClick={handleOpenReschedule}
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Reprogramar Cita para Otra Fecha / Hora
                </Button>
                <p className="text-[11px] text-muted-foreground text-center">
                  💡 Puedes reprogramar tu cita sin costo hasta 12 horas antes del turno.
                </p>
              </>
            ) : (
              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5 text-center">
                <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-amber-500">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Cita próxima (faltan menos de 12 horas)</span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Tu servicio está programado para dentro de {reschedulePolicy.hoursRemaining} horas. Las reprogramaciones directas por la app requieren al menos 12 horas de anticipación. Para consultar la ruta del técnico, por favor contáctanos por WhatsApp.
                </p>
              </div>
            )}
          </div>
        )}
        <a 
          href={`https://wa.me/584241979461?text=${encodeURIComponent(`¡Hola AutoSpa! Necesito asistencia con mi orden ${booking.code}.`)}`}
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full"
        >
          <Button variant="secondary" className="w-full bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20 h-11 cursor-pointer font-bold">
            <MessageCircle className="w-4 h-4 mr-2" /> Contactar a Soporte / Administración
          </Button>
        </a>
      </div>

      {/* Modal Reprogramar Reserva */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reprogramar Cita</DialogTitle>
            <DialogDescription>
              Selecciona una nueva fecha y horario para tu servicio de lavado.
            </DialogDescription>
          </DialogHeader>

          {rescheduleError && (
            <div className="p-3 my-1 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
              <span className="font-medium">{rescheduleError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">Elige una fecha:</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {next7Days.map((date, idx) => {
                  const [y, m, d] = date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
                  const dayName = dateObj.toLocaleDateString('es-VE', { weekday: 'short' });
                  const dayNum = d;
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
                        "flex flex-col items-center justify-center min-w-[4.2rem] p-2.5 rounded-xl border transition-all shrink-0 cursor-pointer active:scale-95",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-md font-bold ring-2 ring-primary/20"
                          : "bg-[#181A20] border-[#2B313A] text-foreground hover:border-primary/50"
                      )}
                    >
                      <span className="text-[11px] uppercase">{dayName}</span>
                      <span className="text-lg font-bold">{dayNum}</span>
                      {idx === 0 && <span className="text-[9px] opacity-80">Hoy</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">Elige un horario:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const normId = slot.id;
                  const isPast = isTimeSlotInThePast(slot.start_time, selectedDate);
                  const isOccupied = rescheduleBookedSlots.includes(normId);
                  const isUnavailable = isPast || isOccupied;
                  const isSelected = selectedSlot === normId;

                  if (isUnavailable) {
                    return (
                      <div
                        key={slot.id}
                        className="p-3 rounded-xl border border-border/30 bg-muted/10 opacity-50 flex items-center justify-between cursor-not-allowed select-none"
                      >
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-medium line-through text-muted-foreground">{slot.label}</span>
                            {isPast ? (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                Pasado
                              </span>
                            ) : (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-destructive/10 text-destructive border border-destructive/20">
                                Ocupado
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground/60">{slot.start_time} - {slot.end_time}</div>
                        </div>
                        <Clock className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedSlot(slot.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all active:scale-[0.98] cursor-pointer flex items-center justify-between",
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-semibold ring-1 ring-primary"
                          : "border-[#2B313A] bg-[#181A20] hover:border-primary/40 text-foreground"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium">{slot.label}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/15 text-emerald-500 border border-emerald-500/20">
                            Libre
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">{slot.start_time} - {slot.end_time}</div>
                      </div>
                      <Clock className={cn("w-4 h-4", isSelected ? "text-primary" : "text-muted-foreground")} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsRescheduleOpen(false)}
              disabled={isSubmittingReschedule}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleConfirmReschedule}
              disabled={isSubmittingReschedule || !selectedDate || !selectedSlot}
            >
              {isSubmittingReschedule ? 'Guardando...' : 'Confirmar Reprogramación'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Cancelación */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-2">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <DialogTitle>¿Deseas cancelar esta reserva?</DialogTitle>
            <DialogDescription>
              La orden <span className="font-semibold text-foreground">{booking.code}</span> será cancelada y el técnico no asistirá. Esta acción cambiará el estado de la reserva a Cancelada.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCancelOpen(false)}
              disabled={isSubmittingCancel}
            >
              No, mantener cita
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmCancel}
              disabled={isSubmittingCancel}
            >
              {isSubmittingCancel ? 'Cancelando...' : 'Sí, Cancelar Reserva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <NotificationPermissionPrompt role="client" />
    </div>
  );
}
