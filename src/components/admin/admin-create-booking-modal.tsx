'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  fetchAdminClients, 
  fetchServices, 
  fetchAdminTechnicians, 
  fetchAppSettings,
  fetchBookedTimeSlots,
  fetchDateAvailabilityDetails,
  fetchCustomerVehicles,
  fetchCustomerAddresses,
  insertBooking,
  insertVehicle,
  insertCustomerAddress,
  insertAdminCustomer
} from '@/lib/supabase/api';
import { fetchLatestBcvRate } from '@/lib/bcv';
import { 
  formatCurrency, 
  formatTimeSlot, 
  getLocalDateString, 
  generateBookingCode,
  normalizeTimeSlotId,
  isTimeSlotInThePast,
  cn,
  calculateSessionDuration,
  generateDynamicTimeSlots,
  parseTimeSlotRange,
  minutesToTimeString
} from '@/lib/utils';
import { TIME_SLOTS } from '@/lib/data/mock-data';
import type { Booking, Service, Customer, User as UserType, Vehicle, CustomerAddress, VehicleType, VehicleSizeCategory } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Car, 
  MapPin, 
  Sparkles, 
  Calendar, 
  Clock, 
  Wrench, 
  CheckCircle2, 
  AlertCircle,
  Plus,
  Search,
  Check,
  ChevronRight
} from 'lucide-react';

interface AdminCreateBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const MUNICIPALITIES = ['Chacao', 'Baruta', 'El Hatillo', 'Sucre', 'Libertador'];

const VEHICLE_TYPES: { type: VehicleType; label: string; size: VehicleSizeCategory }[] = [
  { type: 'sedan', label: 'Sedán', size: 'medium' },
  { type: 'suv', label: 'SUV / Camioneta', size: 'large' },
  { type: 'pickup', label: 'Pick-up', size: 'large' },
  { type: 'hatchback', label: 'Compacto', size: 'small' },
  { type: 'van', label: 'Van / Minivan', size: 'xlarge' },
  { type: 'motorcycle', label: 'Moto', size: 'small' },
];

export function AdminCreateBookingModal({
  isOpen,
  onClose,
  onSuccess,
}: AdminCreateBookingModalProps) {
  const [clients, setClients] = useState<Customer[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [bcvRate, setBcvRate] = useState<number>(36.5);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Form State
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [isNewClient, setIsNewClient] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+58 ');

  // Vehicles & Addresses of selected client
  const [clientVehicles, setClientVehicles] = useState<Vehicle[]>([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState('');
  const [isNewVehicle, setIsNewVehicle] = useState(false);
  const [newVehiclePlate, setNewVehiclePlate] = useState('');
  const [newVehicleBrand, setNewVehicleBrand] = useState('');
  const [newVehicleModel, setNewVehicleModel] = useState('');
  const [newVehicleType, setNewVehicleType] = useState<VehicleType>('sedan');

  const [clientAddresses, setClientAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isNewAddress, setIsNewAddress] = useState(false);
  const [newAddressLine, setNewAddressLine] = useState('');
  const [newAddressMunicipality, setNewAddressMunicipality] = useState('Chacao');
  const [newAddressReference, setNewAddressReference] = useState('');

  // Service
  const [selectedServiceId, setSelectedServiceId] = useState('');

  // Schedule
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState('');
  const [customTimeInput, setCustomTimeInput] = useState('');
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);
  const [activeBookingsForDate, setActiveBookingsForDate] = useState<Array<{ id: string; slot: string }>>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Technician & Status
  const [selectedTechId, setSelectedTechId] = useState('');
  const [bookingStatus, setBookingStatus] = useState<'confirmed' | 'pending_payment'>('confirmed');
  const [adminNotes, setAdminNotes] = useState('Programado directamente por Administrador vía WhatsApp');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const next7Days = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      return getLocalDateString(d);
    });
  }, []);

  // Cargar datos base al abrir el modal
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoadingData(true);
    setErrorMessage(null);

    Promise.all([
      fetchAdminClients(),
      fetchServices(),
      fetchAdminTechnicians(),
      fetchAppSettings(),
      fetchLatestBcvRate(),
    ]).then(([cList, sList, tList, settings, bcvRes]) => {
      if (!isMounted) return;
      setClients(cList);
      setServices(sList);
      setTechnicians(tList);
      
      const rate = bcvRes?.rate || settings?.bcv_exchange_rate || 36.5;
      setBcvRate(rate);

      if (sList.length > 0 && !selectedServiceId) {
        setSelectedServiceId(sList[0].id);
      }

      if (!selectedDate) {
        setSelectedDate(next7Days[0]);
      }

      setIsLoadingData(false);
    }).catch(err => {
      console.error(err);
      if (isMounted) setIsLoadingData(false);
    });

    return () => { isMounted = false; };
  }, [isOpen, next7Days]);

  // Al seleccionar cliente, cargar sus vehículos y direcciones
  useEffect(() => {
    if (!selectedClientId || isNewClient) {
      setClientVehicles([]);
      setClientAddresses([]);
      return;
    }

    const client = clients.find(c => c.id === selectedClientId);
    if (client) {
      if (client.vehicles && client.vehicles.length > 0) {
        setClientVehicles(client.vehicles);
        setSelectedVehicleId(client.vehicles[0].id);
        setIsNewVehicle(false);
      } else {
        // Consultar Supabase
        fetchCustomerVehicles(selectedClientId).then(vList => {
          setClientVehicles(vList);
          if (vList.length > 0) {
            setSelectedVehicleId(vList[0].id);
            setIsNewVehicle(false);
          } else {
            setIsNewVehicle(true);
          }
        });
      }

      if (client.addresses && client.addresses.length > 0) {
        setClientAddresses(client.addresses);
        setSelectedAddressId(client.addresses[0].id);
        setIsNewAddress(false);
      } else {
        fetchCustomerAddresses(selectedClientId).then(aList => {
          setClientAddresses(aList);
          if (aList.length > 0) {
            setSelectedAddressId(aList[0].id);
            setIsNewAddress(false);
          } else {
            setIsNewAddress(true);
          }
        });
      }
    }
  }, [selectedClientId, isNewClient, clients]);

  // Cargar slots ocupados y citas activas al cambiar fecha
  useEffect(() => {
    if (!selectedDate) return;
    let isMounted = true;
    setIsLoadingSlots(true);

    fetchDateAvailabilityDetails(selectedDate).then(details => {
      if (!isMounted) return;
      setOccupiedSlots(details.bookedSlots);
      setActiveBookingsForDate(details.activeBookings);
      setIsLoadingSlots(false);
    }).catch(() => {
      if (isMounted) setIsLoadingSlots(false);
    });

    return () => { isMounted = false; };
  }, [selectedDate]);

  // Duración estimada y turnos dinámicos sugeridos (con 40 min de colchón en moto)
  const currentDuration = useMemo(() => {
    const vType = isNewVehicle ? newVehicleType : (clientVehicles.find(v => v.id === selectedVehicleId)?.type || 'sedan');
    return calculateSessionDuration(vType, selectedServiceId, false);
  }, [isNewVehicle, newVehicleType, clientVehicles, selectedVehicleId, selectedServiceId]);

  const dynamicSuggestedSlots = useMemo(() => {
    if (!selectedDate) return [];
    return generateDynamicTimeSlots({
      date: selectedDate,
      durationMinutes: currentDuration,
      bufferMinutes: 40,
      activeBookings: activeBookingsForDate,
      workDayStart: "08:00",
      workDayEnd: "18:00",
      stepMinutes: 30,
      minLeadMinutes: 0,
    });
  }, [selectedDate, currentDuration, activeBookingsForDate]);

  // Clientes filtrados por búsqueda
  const filteredClients = useMemo(() => {
    if (!clientSearch.trim()) return clients;
    const q = clientSearch.toLowerCase();
    return clients.filter(c => 
      c.full_name.toLowerCase().includes(q) || 
      c.phone.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  }, [clients, clientSearch]);

  const selectedService = useMemo(() => {
    return services.find(s => s.id === selectedServiceId) || services[0];
  }, [services, selectedServiceId]);

  const selectedVehicle = clientVehicles.find(v => v.id === selectedVehicleId);
  const currentVehicleType = isNewVehicle ? newVehicleType : (selectedVehicle?.type || 'sedan');
  const isMoto = currentVehicleType === 'motorcycle';
  const isCamioneta = ['suv', 'pickup', 'van', 'truck'].includes(currentVehicleType) || selectedVehicle?.size_category === 'large' || selectedVehicle?.size_category === 'xlarge';

  let totalUsd = selectedService?.base_price_usd || 0;
  if (selectedService) {
    if (isMoto) {
      totalUsd = 10;
    } else if (isCamioneta) {
      totalUsd = selectedService.price_by_vehicle_size?.['large'] ?? (selectedService.name.includes('24') ? 30 : 20);
    } else {
      totalUsd = selectedService.price_by_vehicle_size?.['medium'] ?? (selectedService.name.includes('24') ? 25 : 15);
    }
  }
  const totalVes = totalUsd * bcvRate;

  // Manejar creación
  const handleSubmit = async () => {
    setErrorMessage(null);

    // 1. Validar Cliente
    let finalCustomerId = selectedClientId;
    if (isNewClient) {
      if (!newClientName.trim()) {
        setErrorMessage('Por favor ingresa el nombre del nuevo cliente.');
        return;
      }
      if (!newClientPhone.trim() || newClientPhone.trim() === '+58') {
        setErrorMessage('Por favor ingresa el número telefónico del nuevo cliente.');
        return;
      }
    } else {
      if (!finalCustomerId) {
        setErrorMessage('Por favor selecciona un cliente de la lista o activa "Nuevo Cliente".');
        return;
      }
    }

    // 2. Validar Servicio / Sesión
    if (!selectedService) {
      setErrorMessage('Por favor selecciona una sesión del catálogo.');
      return;
    }

    // 3. Validar Fecha y Turno
    if (!selectedDate) {
      setErrorMessage('Por favor selecciona la fecha de la sesión.');
      return;
    }
    const normSlot = normalizeTimeSlotId(selectedSlot);
    if (!normSlot) {
      setErrorMessage('Por favor selecciona o escribe un turno u horario disponible.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Si es nuevo cliente, crearlo
      if (isNewClient) {
        const createdCustomer = await insertAdminCustomer({
          full_name: newClientName.trim(),
          phone: newClientPhone.trim(),
        });
        finalCustomerId = createdCustomer.id;
      }

      // Validar / Crear Vehículo (Paciente)
      let finalVehicleId = selectedVehicleId;
      if (isNewVehicle || !finalVehicleId) {
        if (!newVehiclePlate.trim()) {
          setErrorMessage('Por favor ingresa la placa del paciente (ej: AB123CD).');
          setIsSubmitting(false);
          return;
        }
        const createdVeh = await insertVehicle({
          customer_id: finalCustomerId,
          plate: newVehiclePlate.trim().toUpperCase(),
          brand: newVehicleBrand.trim() || 'Paciente',
          model: newVehicleModel.trim() || 'Particular',
          year: new Date().getFullYear(),
          color: 'No especificado',
          type: newVehicleType,
          size_category: VEHICLE_TYPES.find(v => v.type === newVehicleType)?.size || 'medium',
          is_default: true,
        });
        finalVehicleId = createdVeh?.id || `v_${Date.now()}`;
      }

      // Validar / Crear Dirección
      let finalAddressId = selectedAddressId;
      if (isNewAddress || !finalAddressId) {
        if (!newAddressLine.trim()) {
          setErrorMessage('Por favor ingresa la dirección de atención del paciente.');
          setIsSubmitting(false);
          return;
        }
        const createdAddr = await insertCustomerAddress({
          customer_id: finalCustomerId,
          label: 'Ubicación Sesión',
          address_line: newAddressLine.trim(),
          municipality: newAddressMunicipality,
          city: 'Caracas',
          reference: newAddressReference.trim() || undefined,
          is_default: true,
        });
        finalAddressId = createdAddr?.id || `addr_${Date.now()}`;
      }

      // Generar código de reserva AutoSpa
      const code = generateBookingCode();

      // Guardar e insertar reserva (dispara broadcasts en tiempo real automáticamente)
      const newBooking = await insertBooking({
        code,
        customer_id: finalCustomerId,
        vehicle_id: finalVehicleId,
        address_id: finalAddressId,
        service_id: selectedService.id,
        status: bookingStatus,
        scheduled_date: selectedDate,
        scheduled_time_slot: normSlot,
        estimated_duration: selectedService.base_duration_minutes,
        subtotal_usd: totalUsd,
        discount_usd: 0,
        tax_usd: 0,
        total_usd: totalUsd,
        total_ves: totalVes,
        exchange_rate: bcvRate,
        assigned_technician_id: selectedTechId || undefined,
        notes: adminNotes.trim() || 'Sesión programada directamente por Administrador',
      });

      if (!newBooking) {
        throw new Error('No se pudo guardar la orden en la base de datos.');
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error al crear orden directa:', err);
      setErrorMessage(err.message || 'Error al programar la sesión. Inténtalo de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-[#0B0E11] border-[#2B313A] text-foreground p-0">
        <DialogHeader className="p-5 border-b border-[#2B313A] sticky top-0 bg-[#0B0E11]/95 backdrop-blur z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Programar Sesión Directa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Crea una cita de sesión directamente para el paciente y notifícala en tiempo real a las partes.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-5 space-y-6">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. SECCIÓN CLIENTE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                <span>1. Cliente</span>
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsNewClient(!isNewClient);
                  setSelectedClientId('');
                }}
                className="text-xs text-primary hover:underline font-medium flex items-center gap-1"
              >
                {isNewClient ? '← Seleccionar de la lista' : '+ Registrar Nuevo Cliente'}
              </button>
            </div>

            {isNewClient ? (
              <div className="p-3.5 bg-[#12161C] border border-[#2B313A] rounded-xl space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Nombre Completo *</label>
                  <Input 
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Ej: Alejandro Silva"
                    className="bg-[#0B0E11] border-[#2B313A] text-xs h-9"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Teléfono WhatsApp *</label>
                  <Input 
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+58 424 0000000"
                    className="bg-[#0B0E11] border-[#2B313A] text-xs h-9"
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                  <Input 
                    value={clientSearch}
                    onChange={(e) => setClientSearch(e.target.value)}
                    placeholder="Buscar cliente por nombre o teléfono..."
                    className="pl-9 bg-[#12161C] border-[#2B313A] text-xs h-9"
                  />
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 border border-[#2B313A]/60 rounded-xl p-1.5 bg-[#12161C]/50">
                  {filteredClients.length === 0 ? (
                    <p className="text-center py-4 text-xs text-muted-foreground">
                      No se encontraron clientes. Puedes hacer clic en &quot;Registrar Nuevo Cliente&quot;.
                    </p>
                  ) : (
                    filteredClients.map((c) => {
                      const isSelected = selectedClientId === c.id;
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setSelectedClientId(c.id)}
                          className={cn(
                            "w-full text-left p-2.5 rounded-lg text-xs flex items-center justify-between transition-colors",
                            isSelected
                              ? "bg-primary/20 border border-primary text-foreground font-semibold"
                              : "hover:bg-[#12161C] border border-transparent text-foreground"
                          )}
                        >
                          <div>
                            <p className="font-medium text-foreground">{c.full_name}</p>
                            <p className="text-[11px] text-muted-foreground">{c.phone || c.email}</p>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>

          {/* 2. SECCIÓN PACIENTE */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Car className="w-3.5 h-3.5 text-primary" />
                <span>2. Paciente</span>
              </label>
              {!isNewClient && clientVehicles.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewVehicle(!isNewVehicle)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isNewVehicle ? '← Mis pacientes' : '+ Otro paciente'}
                </button>
              )}
            </div>

            {!isNewClient && !isNewVehicle && clientVehicles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clientVehicles.map((v) => {
                  const isSelected = selectedVehicleId === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left text-xs transition-colors flex items-center justify-between",
                        isSelected
                          ? "bg-primary/15 border-primary text-foreground font-semibold"
                          : "bg-[#12161C] border-[#2B313A] hover:border-border text-foreground"
                      )}
                    >
                      <div>
                        <p className="font-bold text-foreground">{v.brand} {v.model}</p>
                        <p className="text-[11px] text-muted-foreground font-mono">Placa: {v.plate}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 bg-[#12161C] border border-[#2B313A] rounded-xl space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Placa *</label>
                    <Input 
                      value={newVehiclePlate}
                      onChange={(e) => setNewVehiclePlate(e.target.value.toUpperCase())}
                      placeholder="Ej: AB123CD"
                      className="bg-[#0B0E11] border-[#2B313A] text-xs h-9 uppercase font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Marca / Modelo</label>
                    <Input 
                      value={newVehicleBrand}
                      onChange={(e) => setNewVehicleBrand(e.target.value)}
                      placeholder="Ej: Toyota Corolla"
                      className="bg-[#0B0E11] border-[#2B313A] text-xs h-9"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Tipo de Paciente</label>
                  <select
                    value={newVehicleType}
                    onChange={(e) => setNewVehicleType(e.target.value as VehicleType)}
                    className="w-full bg-[#0B0E11] border border-[#2B313A] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                  >
                    {VEHICLE_TYPES.map(vt => (
                      <option key={vt.type} value={vt.type}>{vt.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* 3. SECCIÓN DIRECCIÓN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span>3. Ubicación y Municipio</span>
              </label>
              {!isNewClient && clientAddresses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsNewAddress(!isNewAddress)}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {isNewAddress ? '← Mis direcciones' : '+ Otra dirección'}
                </button>
              )}
            </div>

            {!isNewClient && !isNewAddress && clientAddresses.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {clientAddresses.map((a) => {
                  const isSelected = selectedAddressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => setSelectedAddressId(a.id)}
                      className={cn(
                        "p-3 rounded-xl border text-left text-xs transition-colors flex items-center justify-between",
                        isSelected
                          ? "bg-primary/15 border-primary text-foreground font-semibold"
                          : "bg-[#12161C] border-[#2B313A] hover:border-border text-foreground"
                      )}
                    >
                      <div className="overflow-hidden">
                        <p className="font-bold text-foreground truncate">{a.label || 'Dirección'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{a.address_line}</p>
                        <span className="text-[10px] text-primary">{a.municipality}</span>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-primary shrink-0 ml-2" />}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-3.5 bg-[#12161C] border border-[#2B313A] rounded-xl space-y-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Dirección Detallada *</label>
                  <Input 
                    value={newAddressLine}
                    onChange={(e) => setNewAddressLine(e.target.value)}
                    placeholder="Ej: Av. Principal de Las Mercedes, Edif. Caracas, Apto 4B"
                    className="bg-[#0B0E11] border-[#2B313A] text-xs h-9"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Municipio</label>
                    <select
                      value={newAddressMunicipality}
                      onChange={(e) => setNewAddressMunicipality(e.target.value)}
                      className="w-full bg-[#0B0E11] border border-[#2B313A] rounded-lg p-2 text-xs text-foreground focus:outline-none focus:border-primary"
                    >
                      {MUNICIPALITIES.map(m => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground mb-1 block">Punto de Referencia (Opcional)</label>
                    <Input 
                      value={newAddressReference}
                      onChange={(e) => setNewAddressReference(e.target.value)}
                      placeholder="Ej: Al lado del banco"
                      className="bg-[#0B0E11] border-[#2B313A] text-xs h-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 4. SECCIÓN SESIÓN */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span>4. Sesión a Realizar</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {services
                .filter((svc) => {
                  const isMotoService = svc.id === 's_motos' || svc.name.toUpperCase().includes('MOTO');
                  return isMoto ? isMotoService : !isMotoService;
                })
                .map((svc) => {
                const isSelected = selectedServiceId === svc.id;
                let svcPriceUsd = svc.base_price_usd;
                if (isMoto) {
                  svcPriceUsd = 10;
                } else if (isCamioneta) {
                  svcPriceUsd = svc.price_by_vehicle_size?.['large'] ?? (svc.name.includes('24') ? 30 : 20);
                } else {
                  svcPriceUsd = svc.price_by_vehicle_size?.['medium'] ?? (svc.name.includes('24') ? 25 : 15);
                }
                const svcPriceVes = svcPriceUsd * bcvRate;

                return (
                  <button
                    key={svc.id}
                    type="button"
                    onClick={() => setSelectedServiceId(svc.id)}
                    className={cn(
                      "p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between",
                      isSelected
                        ? "bg-primary/10 border-primary text-foreground shadow-sm ring-1 ring-primary/40"
                        : "bg-[#12161C] border-[#2B313A] hover:border-border text-foreground"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-foreground">{svc.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-primary" />}
                      </div>
                      <p className="text-[11px] text-muted-foreground line-clamp-1 mb-2">
                        {svc.short_description || svc.description}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-[#2B313A]/60">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="w-3 h-3 text-primary" />
                        {svc.base_duration_minutes} min
                      </span>
                      <div className="text-right">
                        <span className="font-extrabold text-xs text-primary">{formatCurrency(svcPriceUsd, 'USD')}</span>
                        <span className="text-[10px] text-muted-foreground block">{formatCurrency(svcPriceVes, 'VES')}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 5. SECCIÓN FECHA Y TURNO */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>5. Fecha y Turno (Horario)</span>
            </label>

            {/* Selector de Fecha */}
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {next7Days.map((dStr, idx) => {
                const isSelected = selectedDate === dStr;
                const dateObj = new Date(dStr + 'T12:00:00');
                const dayName = idx === 0 ? 'Hoy' : idx === 1 ? 'Mañana' : dateObj.toLocaleDateString('es-ES', { weekday: 'short' });
                const dayNum = dateObj.getDate();
                const monthName = dateObj.toLocaleDateString('es-ES', { month: 'short' });

                return (
                  <button
                    key={dStr}
                    type="button"
                    onClick={() => setSelectedDate(dStr)}
                    className={cn(
                      "px-3 py-2 rounded-xl border flex flex-col items-center min-w-[70px] shrink-0 text-center transition-all",
                      isSelected
                        ? "bg-primary text-primary-foreground font-bold border-primary shadow-sm"
                        : "bg-[#12161C] border-[#2B313A] hover:bg-[#181E26] text-foreground"
                    )}
                  >
                    <span className="text-[10px] uppercase font-semibold opacity-80">{dayName}</span>
                    <span className="text-sm font-extrabold">{dayNum}</span>
                    <span className="text-[10px] opacity-70">{monthName}</span>
                  </button>
                );
              })}
            </div>

            {/* Selector de Turnos Dinámicos y Personalizados */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Turnos sugeridos ({currentDuration} min + 40 min traslado):</span>
                {isLoadingSlots && <span className="animate-pulse">Consultando disponibilidad...</span>}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {dynamicSuggestedSlots.map((slot) => {
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
                        "p-2.5 rounded-xl border text-xs flex flex-col items-start gap-1 transition-all text-left",
                        isOccupied
                          ? "opacity-35 cursor-not-allowed bg-muted/10 border-dashed"
                          : isSelected
                            ? "bg-primary/20 border-primary text-foreground font-bold shadow-sm ring-1 ring-primary/30"
                            : "bg-[#12161C] border-[#2B313A] hover:border-border cursor-pointer text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5 w-full">
                        <Clock className="w-3 h-3 text-primary shrink-0" />
                        <span className="text-[11px] truncate">{slot.label}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-medium",
                        isOccupied ? "text-destructive" : "text-emerald-400"
                      )}>
                        {isOccupied ? 'Ocupado' : 'Disponible'}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Opción Manual para el Administrador */}
              <div className="pt-2 border-t border-[#2B313A]">
                <label className="text-[11px] text-muted-foreground block mb-1">
                  O asignar horario personalizado:
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customTimeInput}
                    onChange={(e) => {
                      setCustomTimeInput(e.target.value);
                      setSelectedSlot(e.target.value);
                    }}
                    placeholder="Ej. 10:15 - 11:30"
                    className="flex-1 text-xs bg-muted/20 border border-[#2B313A] rounded-lg px-2.5 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                  />
                  {selectedSlot && (
                    <Badge variant="secondary" className="text-xs px-2 py-1 text-primary bg-primary/10 border border-primary/20 shrink-0 font-medium self-center">
                      {formatTimeSlot(selectedSlot)}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 6. SECCIÓN TÉCNICO Y ESTADO */}
          <div className="p-3.5 bg-[#12161C] border border-[#2B313A] rounded-xl space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Wrench className="w-3.5 h-3.5 text-primary" />
                  <span>Asignar Técnico</span>
                </label>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(e.target.value)}
                  className="w-full bg-[#0B0E11] border border-[#2B313A] rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="">Sin Asignar (Pendiente de Asignación)</option>
                  {technicians.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.full_name} ({t.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                  <span>Estado de la Orden</span>
                </label>
                <select
                  value={bookingStatus}
                  onChange={(e) => setBookingStatus(e.target.value as 'confirmed' | 'pending_payment')}
                  className="w-full bg-[#0B0E11] border border-[#2B313A] rounded-lg p-2.5 text-xs text-foreground focus:outline-none focus:border-primary"
                >
                  <option value="confirmed">Confirmada (Coordinada directamente)</option>
                  <option value="pending_payment">Pendiente de Pago</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Notas Administrativas / WhatsApp</label>
              <Input 
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Ej: Agendado vía WhatsApp a solicitud del cliente"
                className="bg-[#0B0E11] border-[#2B313A] text-xs h-9"
              />
            </div>
          </div>
        </div>

        {/* FOOTER CON TOTAL Y BOTÓN DE CONFIRMACIÓN */}
        <DialogFooter className="p-4 border-t border-[#2B313A] bg-[#0B0E11]/95 backdrop-blur flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sticky bottom-0 z-20">
          <div className="flex items-center justify-between sm:justify-start gap-4">
            <div>
              <span className="text-[10px] text-muted-foreground block uppercase font-bold">Total a Cobrar:</span>
              <div className="flex items-baseline gap-2">
                <span className="text-lg font-black text-primary">{formatCurrency(totalUsd, 'USD')}</span>
                <span className="text-xs text-muted-foreground">({formatCurrency(totalVes, 'VES')})</span>
              </div>
            </div>
            <div className="hidden sm:block text-[10px] text-muted-foreground border-l border-[#2B313A] pl-3">
              Tasa BCV: Bs. {bcvRate.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={isSubmitting}
              className="border-[#2B313A] text-xs flex-1 sm:flex-initial"
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={isSubmitting || !selectedSlot}
              className="bg-primary text-primary-foreground font-bold hover:bg-primary/90 text-xs flex-1 sm:flex-initial shadow-md shadow-primary/20"
            >
              {isSubmitting ? 'Programando...' : 'Crear y Programar Sesión'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
