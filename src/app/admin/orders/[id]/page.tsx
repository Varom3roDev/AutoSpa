'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  fetchBookingById, 
  fetchServices, 
  fetchAdminClients, 
  fetchAdminTechnicians, 
  updateBookingStatus, 
  assignBookingTechnician, 
  deleteBooking,
  parseBookingPaymentData,
  verifyPaymentRecord,
  rescheduleBooking,
  fetchBookedTimeSlots
} from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/client';
import { 
  formatCurrency, 
  getStatusLabel, 
  formatTimeSlot, 
  cn,
  getLocalDateString,
  isTimeSlotInThePast,
  normalizeTimeSlotId,
  playAudioChime
} from '@/lib/utils';
import { StatusBadge } from '@/components/shared/status-badge';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { CalendarDays, Clock, MapPin, User, Car, Wrench, Phone, CheckCircle2, Trash2, Smartphone, Send, Building, Banknote, ShieldCheck, Calendar, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { TIME_SLOTS } from '@/lib/data/mock-data';
import type { Booking, Service, Customer, User as UserType, Vehicle, CustomerAddress } from '@/lib/types';

export default function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const supabase = createClient();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [client, setClient] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [assignedTech, setAssignedTech] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dialogs
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [selectedTechId, setSelectedTechId] = useState('');

  // Reprogramación para el Administrador
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleBookedSlots, setRescheduleBookedSlots] = useState<string[]>([]);
  const [rescheduleError, setRescheduleError] = useState<string | null>(null);

  // Próximos 7 días
  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return getLocalDateString(d);
    });
  }, []);

  useEffect(() => {
    if (!isRescheduleOpen || !selectedDate || !id) return;
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
    const success = await rescheduleBooking(booking.id, selectedDate, normSlot, 'Administrador');
    if (success) {
      playAudioChime('subtle');
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

  useEffect(() => {
    async function loadOrder() {
      if (!id) return;
      setIsLoading(true);
      const bData = await fetchBookingById(id);
      if (!bData) {
        setIsLoading(false);
        return;
      }
      setBooking(bData);

      const [servicesData, clientsData, techsData] = await Promise.all([
        fetchServices(),
        fetchAdminClients(),
        fetchAdminTechnicians(),
      ]);

      setTechnicians(techsData);

      const foundService = servicesData.find(s => s.id === bData.service_id) || null;
      const foundClient = clientsData.find(c => c.id === bData.customer_id) || null;
      const foundTech = techsData.find(t => t.id === bData.assigned_technician_id) || null;

      setService(foundService);
      setClient(foundClient);
      setAssignedTech(foundTech);

      // Load vehicle and address
      if (bData.vehicle_id) {
        const { data: vData } = await supabase.from('vehicles').select('*').eq('id', bData.vehicle_id).single();
        if (vData) setVehicle(vData as Vehicle);
      }
      if (bData.address_id) {
        const { data: aData } = await supabase.from('customer_addresses').select('*').eq('id', bData.address_id).single();
        if (aData) setAddress(aData as CustomerAddress);
      }

      setIsLoading(false);
    }
    loadOrder();
  }, [id]);

  const handleUpdateStatus = async (newStatus: any) => {
    if (!booking) return;
    const ok = await updateBookingStatus(booking.id, newStatus, `Estado actualizado a ${newStatus} por Admin`);
    if (ok) {
      setBooking(prev => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const handleAssignTech = async () => {
    if (!booking || !selectedTechId) return;
    const ok = await assignBookingTechnician(booking.id, selectedTechId, 'Admin');
    if (ok) {
      const tech = technicians.find(t => t.id === selectedTechId) || null;
      setAssignedTech(tech);
      setBooking(prev => prev ? { ...prev, assigned_technician_id: selectedTechId, status: 'assigned' } : null);
      setIsAssignOpen(false);
    }
  };

  const handleDeleteOrder = async () => {
    if (!booking) return;
    if (!confirm(`¿Estás seguro de que deseas eliminar permanentemente la orden ${booking.code}? Esta acción no se puede deshacer.`)) {
      return;
    }
    const ok = await deleteBooking(booking.id);
    if (ok) {
      router.push('/admin/orders');
    } else {
      alert('No se pudo eliminar la orden.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Cargando orden..." backHref="/admin/orders" />
        <div className="p-8 text-center text-sm text-muted-foreground">Cargando detalles de la reserva...</div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Orden no encontrada" backHref="/admin/orders" />
        <div className="p-8 text-center flex-1 space-y-4">
          <p className="text-muted-foreground">La orden que buscas no existe.</p>
          <Link href="/admin/orders">
            <Button>Volver a Órdenes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen pb-32">
      <PageHeader 
        title={`Orden ${booking.code}`} 
        backHref="/admin/orders" 
        action={
          <Button 
            variant="outline" 
            size="sm" 
            className="text-destructive border-destructive/30 hover:bg-destructive/10 cursor-pointer"
            onClick={handleDeleteOrder}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Eliminar Orden
          </Button>
        }
      />

      <div className="p-4 space-y-4 max-w-3xl mx-auto w-full">
        {/* Status */}
        {/* Status */}
        {(() => {
          const reportedPayment = parseBookingPaymentData(booking.notes);
          const isWaitingVerification = booking.status === 'pending_payment' && !!reportedPayment;

          return (
            <Card className={isWaitingVerification ? "border-amber-500/40 bg-amber-500/[0.04]" : "bg-muted/30"}>
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Estado de la Orden</p>
                  <p className={cn("font-semibold text-base", isWaitingVerification && "text-amber-500")}>
                    {isWaitingVerification ? 'Pago por Verificar (Reportado)' : getStatusLabel(booking.status)}
                  </p>
                </div>
                {isWaitingVerification ? (
                  <Badge variant="outline" className="flex items-center gap-1.5 font-bold border-amber-500/50 bg-amber-500/15 text-amber-500 text-xs px-2.5 py-1 animate-pulse">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Por Conciliar</span>
                  </Badge>
                ) : (
                  <StatusBadge status={booking.status} />
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Pago Reportado por el Cliente */}
        {(() => {
          const reportedPayment = parseBookingPaymentData(booking.notes);
          if (!reportedPayment) return null;
          return (
            <Card className="border-amber-500/40 bg-amber-500/5 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2 text-foreground font-bold">
                    <Smartphone className="w-4 h-4 text-amber-500" /> Reporte de Pago del Cliente
                  </CardTitle>
                  <span className={`text-[11px] px-2 py-0.5 rounded font-semibold ${
                    booking.status === 'confirmed' || booking.status === 'assigned'
                      ? 'bg-emerald-500/10 text-emerald-600'
                      : 'bg-amber-500/10 text-amber-600 animate-pulse'
                  }`}>
                    {booking.status === 'confirmed' || booking.status === 'assigned' ? '✓ Conciliado' : '⏳ Por Verificar'}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="text-xs space-y-2">
                <div className="grid grid-cols-2 gap-2 bg-background/80 p-3 rounded-lg border font-mono">
                  <div>
                    <span className="text-muted-foreground font-sans block text-[11px]">Método:</span>
                    <span className="font-semibold text-foreground font-sans">
                      {reportedPayment.method === 'pago_movil' && '📱 Pago Móvil'}
                      {reportedPayment.method === 'zelle' && '⚡ Zelle'}
                      {reportedPayment.method === 'transferencia' && '🏦 Transferencia'}
                      {reportedPayment.method === 'efectivo_usd' && '💵 Efectivo en Sitio'}
                      {reportedPayment.method === 'efectivo_ves' && '💵 Efectivo en Bs'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground font-sans block text-[11px]">Referencia:</span>
                    <span className="font-bold text-primary">{reportedPayment.reference}</span>
                  </div>
                  {reportedPayment.bank && (
                    <div>
                      <span className="text-muted-foreground font-sans block text-[11px]">Banco / Destino:</span>
                      <span className="text-foreground font-sans">{reportedPayment.bank}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground font-sans block text-[11px]">Monto:</span>
                    <span className="font-bold text-foreground">
                      {reportedPayment.method === 'zelle' || reportedPayment.method === 'efectivo_usd'
                        ? formatCurrency(booking.total_usd, 'USD')
                        : `Ref. ${formatCurrency(booking.total_ves, 'VES')} (${formatCurrency(booking.total_usd, 'USD')})`}
                    </span>
                  </div>
                </div>
                {reportedPayment.notes && (
                  <p className="text-[11px] text-muted-foreground italic">
                    Nota del cliente: &quot;{reportedPayment.notes}&quot;
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })()}

        {/* Cliente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <User className="w-4 h-4 text-primary" /> Cliente
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3">
            <div>
              <p className="font-semibold text-base">{client?.full_name || 'Cliente'}</p>
              {client?.phone && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Phone className="w-3.5 h-3.5" /> {client.phone}
                </p>
              )}
            </div>
            {address && (
              <div className="pt-2 border-t flex items-start gap-2">
                <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                <p className="text-muted-foreground">
                  <strong>{address.label}:</strong> {address.address_line} {address.reference ? `(${address.reference})` : ''} - {address.municipality}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehículo */}
        {vehicle && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Car className="w-4 h-4 text-primary" /> Vehículo
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              <p className="font-semibold text-base uppercase font-mono">{vehicle.plate}</p>
              <p className="text-muted-foreground mt-1">
                {vehicle.brand} {vehicle.model} ({vehicle.year}) • {vehicle.color} • {vehicle.type}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Horario & Servicio */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" /> Horario Programado
              </CardTitle>
              {booking.status !== 'completed' && booking.status !== 'cancelled' && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-7 px-2.5 text-xs gap-1 border-primary/30 hover:bg-primary/10 text-primary cursor-pointer"
                  onClick={handleOpenReschedule}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Reprogramar
                </Button>
              )}
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Fecha:</span>
                <span className="font-medium">{booking.scheduled_date}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Turno:</span>
                <span className="font-medium">{formatTimeSlot(booking.scheduled_time_slot)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Wrench className="w-4 h-4 text-primary" /> Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="font-medium">{service?.name || 'Servicio General'}</div>
              <div className="flex items-center justify-between text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {service?.base_duration_minutes || 45} min
                </span>
                <span className="font-bold text-primary">{formatCurrency(booking.total_usd)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Técnico */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Wrench className="w-4 h-4 text-primary" /> Técnico Asignado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {assignedTech ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">{assignedTech.full_name}</p>
                  <p className="text-xs text-muted-foreground">{assignedTech.phone}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => setIsAssignOpen(true)}>
                  Cambiar
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">Sin técnico asignado</p>
                <Button size="sm" onClick={() => setIsAssignOpen(true)}>
                  Asignar Técnico
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pago */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary" /> Detalle Financiero
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between font-bold text-base">
              <span>Total a Cobrar</span>
              <span className="text-primary">{formatCurrency(booking.total_usd)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground text-xs mt-1">
              <span>Tasa BCV: {booking.exchange_rate} Bs/$</span>
              <span className="font-semibold text-foreground">Ref. {formatCurrency(booking.total_ves, 'VES')}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Floating Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t z-50">
        <div className="max-w-3xl mx-auto flex gap-3 w-full">
          {booking.status === 'pending_payment' && (
            <Button 
              className="flex-1 h-12 text-sm font-semibold shadow-md bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" 
              onClick={async () => {
                await verifyPaymentRecord(`pay_${booking.id}`, booking.id);
                setBooking(prev => prev ? { ...prev, status: 'confirmed' } : null);
                setIsAssignOpen(true);
              }}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" /> 
              {parseBookingPaymentData(booking.notes) ? 'Validar Pago y Asignar Técnico' : 'Aprobar Pago y Asignar Técnico'}
            </Button>
          )}
          {booking.status === 'confirmed' && !assignedTech && (
            <Button 
              className="flex-1 h-12 text-sm font-semibold shadow-md" 
              onClick={() => setIsAssignOpen(true)}
            >
              <Wrench className="w-4 h-4 mr-1.5" /> Asignar Técnico
            </Button>
          )}
          {booking.status === 'confirmed' && assignedTech && (
            <Button className="flex-1 h-12 bg-blue-600 hover:bg-blue-700" onClick={() => handleUpdateStatus('in_progress')}>
              Iniciar Servicio
            </Button>
          )}
          {['in_progress', 'assigned', 'en_route', 'arrived'].includes(booking.status) && (
            <Button className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700" onClick={() => handleUpdateStatus('completed')}>
              Completar Servicio
            </Button>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <Button variant="outline" className="h-12 text-destructive border-destructive/30" onClick={() => handleUpdateStatus('cancelled')}>
              Cancelar
            </Button>
          )}
        </div>
      </div>

      {/* Modal Asignar Técnico */}
      <Dialog open={isAssignOpen} onOpenChange={setIsAssignOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Asignar Técnico</DialogTitle>
            <DialogDescription>
              Selecciona el técnico responsable para atender esta reserva.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            {technicians.length === 0 ? (
              <p className="text-xs text-muted-foreground">No hay técnicos registrados aún.</p>
            ) : (
              <select
                value={selectedTechId}
                onChange={(e) => setSelectedTechId(e.target.value)}
                className="w-full h-11 px-3 rounded-md border bg-background text-sm"
              >
                <option value="">-- Selecciona un técnico --</option>
                {technicians.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.full_name} ({t.phone || t.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <DialogFooter>
            <Button onClick={handleAssignTech} disabled={!selectedTechId}>
              Confirmar Asignación
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Reprogramar Cita (Administrador) */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reprogramar Cita</DialogTitle>
            <DialogDescription>
              Selecciona una nueva fecha y horario para la orden <span className="font-mono font-bold text-foreground">{booking.code}</span>.
            </DialogDescription>
          </DialogHeader>

          {rescheduleError && (
            <div className="p-3 my-1 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{rescheduleError}</span>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div>
              <p className="text-sm font-semibold mb-2 text-foreground">Elige una fecha:</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {next7Days.map((date: string, idx: number) => {
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
              <p className="text-sm font-semibold mb-2 text-foreground">Selecciona el turno disponible:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TIME_SLOTS.map((slot) => {
                  const normId = normalizeTimeSlotId(slot.id);
                  const isPast = isTimeSlotInThePast(slot.start_time, selectedDate);
                  const isBooked = rescheduleBookedSlots.includes(normId);
                  const isDisabled = isPast || isBooked;
                  const isSelected = selectedSlot === normId;

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      disabled={isDisabled}
                      onClick={() => setSelectedSlot(normId)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer",
                        isSelected
                          ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-sm"
                          : "border-[#2B313A] bg-[#181A20] hover:border-primary/40",
                        isDisabled && "opacity-45 cursor-not-allowed bg-muted/20 border-dashed hover:border-[#2B313A]"
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs text-foreground">{slot.label}</span>
                        {isPast ? (
                          <span className="text-[10px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">Pasado</span>
                        ) : isBooked ? (
                          <span className="text-[10px] text-destructive font-mono bg-destructive/10 px-1.5 py-0.5 rounded">Ocupado</span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-mono bg-emerald-500/10 px-1.5 py-0.5 rounded">Libre</span>
                        )}
                      </div>
                      <span className="text-[11px] text-muted-foreground mt-1">
                        {slot.start_time} - {slot.end_time}
                      </span>
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
    </div>
  );
}
