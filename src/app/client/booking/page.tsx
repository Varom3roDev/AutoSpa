"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/lib/auth/auth-context";
import { useBookingState } from "@/lib/hooks/use-booking-state";
import { 
  SERVICES, 
  ADDONS, 
  TIME_SLOTS,
  EXCHANGE_RATE
} from "@/lib/data/mock-data";
import { 
  fetchCustomerVehicles, 
  fetchServices, 
  fetchServiceAddons, 
  fetchCustomerAddresses, 
  insertVehicle, 
  insertCustomerAddress,
  insertBooking,
  fetchAppSettings,
  fetchBookedTimeSlots
} from "@/lib/supabase/api";
import { 
  cn, 
  formatCurrency, 
  generateBookingCode, 
  getLocalDateString, 
  isTimeSlotInThePast, 
  normalizeTimeSlotId,
  getTimeSlotUnavailabilityReason 
} from "@/lib/utils";
import { BOOKING_STEPS } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { PaymentReportCard } from "@/components/shared/payment-report-card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Car, 
  Droplets, 
  Plus, 
  MapPin, 
  Calendar, 
  Clock, 
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  Home
} from "lucide-react";
import type { Vehicle, VehicleType, VehicleSizeCategory, Service, ServiceAddon, CustomerAddress } from "@/lib/types";

const vehicleSchema = z.object({
  plate: z.string().min(1, 'La placa es requerida'),
  brand: z.string().min(1, 'La marca es requerida'),
  model: z.string().min(1, 'El modelo es requerido'),
  year: z.string().regex(/^\d{4}$/, 'Año inválido'),
  color: z.string().min(1, 'El color es requerido'),
  type: z.string().min(1, 'El tipo es requerido'),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

const VEHICLE_TYPE_OPTIONS: { label: string; value: VehicleType; size: VehicleSizeCategory }[] = [
  { label: 'Sedán', value: 'sedan', size: 'medium' },
  { label: 'SUV', value: 'suv', size: 'large' },
  { label: 'Camioneta (Pick-up)', value: 'pickup', size: 'large' },
  { label: 'Van / Minivan', value: 'van', size: 'xlarge' },
  { label: 'Motocicleta', value: 'motorcycle', size: 'small' },
  { label: 'Coupé', value: 'coupe', size: 'medium' },
  { label: 'Hatchback / Compacto', value: 'hatchback', size: 'small' },
  { label: 'Camión', value: 'truck', size: 'xlarge' },
];

export default function BookingPage() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    state,
    setVehicle,
    setService,
    toggleAddon,
    setAddress,
    setSchedule,
    nextStep,
    prevStep,
    reset,
    calculatePricing,
    canProceed
  } = useBookingState();

  const [bookingCode, setBookingCode] = useState("");
  const [vehiclesList, setVehiclesList] = useState<Vehicle[]>([]);
  const [servicesList, setServicesList] = useState<Service[]>(SERVICES);
  const [addonsList, setAddonsList] = useState<ServiceAddon[]>(ADDONS);
  const [addressesList, setAddressesList] = useState<CustomerAddress[]>([]);
  const [appSettings, setAppSettings] = useState<any>(null);
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>("sedan");
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [createdBookingId, setCreatedBookingId] = useState<string | null>(null);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [addrLabel, setAddrLabel] = useState("Casa");
  const [addrMunicipality, setAddrMunicipality] = useState("Chacao");
  const [addrLine, setAddrLine] = useState("");
  const [addrReference, setAddrReference] = useState("");
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Load booked time slots whenever the scheduled date changes
  useEffect(() => {
    let isMounted = true;
    async function loadSlotAvailability() {
      const chosenDate = state.scheduledDate || next7Days[0];
      setIsLoadingSlots(true);
      const occupied = await fetchBookedTimeSlots(chosenDate);
      if (isMounted) {
        setBookedSlots(occupied);
        setIsLoadingSlots(false);

        // Si el turno que estaba seleccionado ya está ocupado o en el pasado, desmarcarlo
        if (state.scheduledTimeSlot) {
          const norm = normalizeTimeSlotId(state.scheduledTimeSlot);
          const slotObj = TIME_SLOTS.find((s) => s.id === norm);
          const isPast = slotObj ? isTimeSlotInThePast(slotObj.start_time, chosenDate) : false;
          const isOccupied = occupied.includes(norm);
          if (isPast || isOccupied) {
            setSchedule(chosenDate, "");
          }
        }
      }
    }
    loadSlotAvailability();
    return () => {
      isMounted = false;
    };
  }, [state.scheduledDate]);

  // Load live data from Supabase & local catalog
  useEffect(() => {
    async function loadData() {
      const [vData, sData, aData, addrData, settingsData] = await Promise.all([
        fetchCustomerVehicles(user?.id),
        fetchServices(),
        fetchServiceAddons(),
        fetchCustomerAddresses(user?.id),
        fetchAppSettings(),
      ]);
      setVehiclesList(vData);
      setServicesList(sData);
      setAddonsList(aData);
      setAddressesList(addrData);
      setAppSettings(settingsData);
    }
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_services_updated", handleUpdate);
    window.addEventListener("autospa_addons_updated", handleUpdate);
    window.addEventListener("autospa_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_services_updated", handleUpdate);
      window.removeEventListener("autospa_addons_updated", handleUpdate);
      window.removeEventListener("autospa_settings_updated", handleUpdate);
    };
  }, [user]);

  const {
    register,
    handleSubmit,
    setValue,
    reset: resetVehicleForm,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear().toString(),
      color: '',
      type: 'sedan',
    },
  });

  const onAddVehicleSubmit = async (values: VehicleFormValues) => {
    const selectedOption = VEHICLE_TYPE_OPTIONS.find(o => o.value === values.type);
    
    const vehiclePayload: Omit<Vehicle, 'id'> = {
      customer_id: user?.id || 'c_1',
      plate: values.plate.toUpperCase(),
      brand: values.brand,
      model: values.model,
      year: parseInt(values.year, 10),
      color: values.color,
      type: values.type as VehicleType,
      size_category: selectedOption?.size || 'medium',
      is_default: false,
    };

    const saved = await insertVehicle(vehiclePayload);
    const newVehicle: Vehicle = saved || {
      id: `v_${Date.now()}`,
      ...vehiclePayload,
    };
    
    setVehiclesList(prev => [newVehicle, ...prev]);
    resetVehicleForm();
    setIsAddVehicleOpen(false);
    handleSelectVehicle(newVehicle);
  };

  const onAddAddressSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrLine.trim()) return;

    setIsSavingAddress(true);
    const addressPayload: Omit<CustomerAddress, 'id'> = {
      customer_id: user?.id || 'c_1',
      label: addrLabel,
      address_line: addrLine.trim(),
      municipality: addrMunicipality,
      city: "Caracas",
      zone_id: "zone-1",
      reference: addrReference.trim() || undefined,
      is_default: addressesList.length === 0,
    };

    const saved = await insertCustomerAddress(addressPayload);
    const newAddress: CustomerAddress = saved || {
      id: `addr_${Date.now()}`,
      ...addressPayload,
    };

    setAddressesList(prev => [newAddress, ...prev]);
    setAddrLine("");
    setAddrReference("");
    setIsSavingAddress(false);
    setIsAddAddressOpen(false);
    handleSelectAddress(newAddress);
  };

  // Next 7 days en zona horaria local de Caracas
  const next7Days = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return getLocalDateString(d);
  });

  const handleSelectVehicle = (vehicle: Vehicle) => {
    setVehicle(vehicle);
    nextStep();
  };

  const handleSelectService = (service: Service) => {
    setService(service);
    nextStep();
  };

  const handleSelectAddress = (address: CustomerAddress) => {
    setAddress(address);
    nextStep();
  };

  const handleSelectTimeSlot = (slotId: string) => {
    const chosenDate = state.scheduledDate || next7Days[0];
    setSchedule(chosenDate, slotId);
  };

  const handleNext = async () => {
    if (state.currentStep === 5) {
      setBookingError(null);
      const chosenDate = state.scheduledDate || next7Days[0];
      const normSlot = normalizeTimeSlotId(state.scheduledTimeSlot || "");

      if (!normSlot) {
        setBookingError("Por favor selecciona un turno u horario válido.");
        return;
      }

      // Validar que el turno no haya pasado en hora local Caracas (mínimo 2 horas de anticipación)
      const slotObj = TIME_SLOTS.find(s => s.id === normSlot);
      if (slotObj && isTimeSlotInThePast(slotObj.start_time, chosenDate, 120)) {
        setBookingError("El turno seleccionado requiere al menos 2 horas de anticipación o ya no está disponible para hoy. Por favor regresa y selecciona un horario disponible.");
        return;
      }

      // Validar disponibilidad en tiempo real con Supabase
      const occupiedNow = await fetchBookedTimeSlots(chosenDate);
      if (occupiedNow.includes(normSlot)) {
        setBookingError("Lo sentimos, este turno acaba de ser reservado por otro cliente. Por favor selecciona otro horario.");
        return;
      }

      const code = generateBookingCode();
      setBookingCode(code);
      const pricing = calculatePricing();
      const currentRate = Number(appSettings?.bcv_exchange_rate) || EXCHANGE_RATE.rate || 36.5;
      const totalVes = pricing.total * currentRate;

      if (state.vehicle && state.service && state.address && state.scheduledDate) {
        const created = await insertBooking({
          code,
          customer_id: user?.id || 'c_1',
          vehicle_id: state.vehicle.id,
          address_id: state.address.id,
          service_id: state.service.id,
          status: 'pending_payment',
          scheduled_date: state.scheduledDate,
          scheduled_time_slot: normSlot,
          estimated_duration: state.service.base_duration_minutes,
          subtotal_usd: pricing.subtotal,
          discount_usd: 0,
          tax_usd: 0,
          total_usd: pricing.total,
          total_ves: totalVes,
          exchange_rate: currentRate,
          notes: '',
        }, state.addons.map(a => ({
          addon_id: a.id,
          name: a.name,
          price_usd: a.price_by_vehicle_size?.[state.vehicle!.size_category] ?? a.price_usd,
          quantity: 1,
        })));

        if (created?.id) {
          setCreatedBookingId(created.id);
        }
      }
    }
    nextStep();
  };

  const handleFinish = () => {
    reset();
    router.push("/client/reservations");
  };

  const renderStepContent = () => {
    switch (state.currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Selecciona tu vehículo</h2>
              <p className="text-sm text-muted-foreground">Toca un vehículo para continuar o agrega uno con el botón (+)</p>
            </div>
            {vehiclesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-muted/20">
                <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">
                  <Car className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm mb-1">Aún no tienes vehículos registrados</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Agrega tu primer vehículo para continuar con la reserva.
                </p>
                <Button size="sm" onClick={() => setIsAddVehicleOpen(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Agregar Vehículo
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {vehiclesList.map((vehicle) => (
                  <Card 
                    key={vehicle.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary active:scale-[0.98]", 
                      state.vehicle?.id === vehicle.id ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                    )}
                    onClick={() => handleSelectVehicle(vehicle)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="bg-primary/10 text-primary p-3 rounded-full">
                          <Car className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-base">{vehicle.brand} {vehicle.model}</p>
                          <p className="text-sm text-muted-foreground font-mono">{vehicle.plate} • {vehicle.color}</p>
                          <Badge variant="secondary" className="mt-1 text-[11px] capitalize">
                            {vehicle.type}
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </CardContent>
                  </Card>
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddVehicleOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar otro vehículo</span>
                </button>
              </div>
            )}
          </div>
        );
      
      case 1:
        if (!state.vehicle) return null;
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">Selecciona un servicio</h2>
              <p className="text-sm text-muted-foreground">
                Tarifas ajustadas para tu {state.vehicle.brand} {state.vehicle.model}
              </p>
            </div>
            <div className="grid gap-3">
              {servicesList.map((service) => {
                const price = service.price_by_vehicle_size[state.vehicle!.size_category] || service.base_price_usd;
                const isSelected = state.service?.id === service.id;
                return (
                  <Card 
                    key={service.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary active:scale-[0.98]", 
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                    )}
                    onClick={() => handleSelectService(service)}
                  >
                    <CardContent className="p-4 flex flex-col gap-2">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 text-primary p-2 rounded-lg">
                            <Droplets className="h-5 w-5" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-base">{service.name}</h3>
                            <span className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <Clock className="h-3 w-3" /> {service.base_duration_minutes} min
                            </span>
                          </div>
                        </div>
                        <span className="font-bold text-lg text-primary">{formatCurrency(price, "USD")}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">{service.short_description}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        );

      case 2:
        if (!state.vehicle) return null;
        return (
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-lg font-bold">Extras (Opcional)</h2>
                <p className="text-sm text-muted-foreground">Puedes seleccionar uno o varios adicionales</p>
              </div>
              <Button 
                variant="secondary" 
                size="sm" 
                onClick={nextStep}
                className="shrink-0 font-semibold gap-1 text-xs h-9 px-3"
              >
                {state.addons.length > 0 ? "Listo" : "Omitir"} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <div className="grid gap-3">
              {addonsList.map((addon) => {
                const price = addon.price_by_vehicle_size 
                  ? addon.price_by_vehicle_size[state.vehicle!.size_category] 
                  : addon.price_usd;
                const isSelected = state.addons.some(a => a.id === addon.id);

                return (
                  <Card 
                    key={addon.id} 
                    className={cn(
                      "cursor-pointer transition-all active:scale-[0.98]", 
                      isSelected ? "border-primary bg-primary/5 ring-1 ring-primary" : "hover:border-primary/50"
                    )}
                    onClick={() => toggleAddon(addon)}
                  >
                    <CardContent className="p-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-full transition-colors",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}>
                          {isSelected ? <CheckCircle2 className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
                        </div>
                        <div>
                          <p className="font-medium text-base">{addon.name}</p>
                          {addon.duration_minutes > 0 && (
                            <p className="text-xs text-muted-foreground">+{addon.duration_minutes} min</p>
                          )}
                        </div>
                      </div>
                      <span className="font-semibold text-base">{formatCurrency(price, "USD")}</span>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <div className="pt-2">
              <Button 
                variant="outline" 
                className="w-full h-11 text-sm font-medium" 
                onClick={nextStep}
              >
                {state.addons.length > 0 
                  ? `Continuar con ${state.addons.length} extra${state.addons.length > 1 ? 's' : ''}` 
                  : "Continuar sin extras"}
              </Button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold">¿Dónde lavamos tu auto?</h2>
              <p className="text-sm text-muted-foreground">Toca una dirección guardada o agrega una nueva</p>
            </div>
            {addressesList.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-xl bg-muted/20">
                <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">
                  <MapPin className="h-6 w-6" />
                </div>
                <p className="font-semibold text-sm mb-1">Aún no tienes direcciones registradas</p>
                <p className="text-xs text-muted-foreground mb-4">
                  Agrega el lugar donde lavaremos tu vehículo para continuar de inmediato con la reserva.
                </p>
                <Button size="sm" onClick={() => setIsAddAddressOpen(true)} className="cursor-pointer">
                  <Plus className="h-4 w-4 mr-1.5" /> Agregar Dirección
                </Button>
              </div>
            ) : (
              <div className="grid gap-3">
                {addressesList.map((address) => (
                  <Card 
                    key={address.id} 
                    className={cn(
                      "cursor-pointer transition-all hover:border-primary active:scale-[0.98]", 
                      state.address?.id === address.id ? "border-primary bg-primary/5 ring-1 ring-primary" : ""
                    )}
                    onClick={() => handleSelectAddress(address)}
                  >
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-primary/10 text-primary p-3 rounded-full shrink-0">
                          <MapPin className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{address.label}</p>
                            <Badge variant="outline" className="text-[10px]">{address.municipality}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5">{address.address_line}</p>
                          {address.reference && (
                            <p className="text-xs text-muted-foreground mt-0.5 italic">Ref: {address.reference}</p>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                    </CardContent>
                  </Card>
                ))}

                <button
                  type="button"
                  onClick={() => setIsAddAddressOpen(true)}
                  className="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary font-medium text-sm transition-all cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar otra dirección</span>
                </button>
              </div>
            )}
          </div>
        );

      case 4:
        const currentDate = state.scheduledDate || next7Days[0];
        const allSlotsPassedToday = TIME_SLOTS.every((s) => isTimeSlotInThePast(s.start_time, currentDate, 120));
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold mb-1">Fecha</h2>
              <p className="text-sm text-muted-foreground mb-3">Selecciona el día de tu cita</p>
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
                {next7Days.map((date, idx) => {
                  const [y, m, d] = date.split('-').map(Number);
                  const dateObj = new Date(y, m - 1, d, 12, 0, 0);
                  const dayName = dateObj.toLocaleDateString("es-VE", { weekday: "short" });
                  const dayNum = d;
                  const isSelected = state.scheduledDate === date || (!state.scheduledDate && idx === 0);

                  return (
                    <button
                      key={date}
                      type="button"
                      onClick={() => setSchedule(date, "")}
                      className={cn(
                        "flex flex-col items-center justify-center min-w-[4.5rem] p-3 rounded-xl border transition-all shrink-0 active:scale-95 cursor-pointer",
                        isSelected 
                          ? "bg-primary border-primary text-primary-foreground shadow-md ring-2 ring-primary/20" 
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <span className="text-xs uppercase font-medium">{dayName}</span>
                      <span className="text-xl font-bold mt-1">{dayNum}</span>
                      {idx === 0 && <span className="text-[10px] mt-0.5">Hoy</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-lg font-bold">Horario disponible</h2>
                {isLoadingSlots && <span className="text-xs text-muted-foreground animate-pulse">Verificando disponibilidad...</span>}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                {allSlotsPassedToday
                  ? "Para hoy ya no quedan turnos con al menos 2 horas de anticipación. Por favor selecciona mañana u otra fecha."
                  : "Toca la franja que más te convenga (se requiere un mínimo de 2 horas de anticipación para el traslado del técnico)"}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {TIME_SLOTS.map((slot) => {
                  const normId = slot.id;
                  const isOccupied = bookedSlots.includes(normId);
                  const reason = getTimeSlotUnavailabilityReason(slot.start_time, currentDate, isOccupied, 120);
                  const isUnavailable = !!reason;
                  const isSelected = state.scheduledTimeSlot === normId;

                  if (isUnavailable) {
                    return (
                      <div
                        key={slot.id}
                        className="p-3.5 rounded-xl border border-border/40 bg-muted/20 flex items-center justify-between opacity-55 cursor-not-allowed select-none"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm line-through text-muted-foreground">{slot.label}</p>
                            {reason === 'occupied' ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-destructive border-destructive/30 bg-destructive/10 font-normal">
                                Ocupado
                              </Badge>
                            ) : reason === 'insufficient_time' ? (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-500 border-amber-500/30 bg-amber-500/10 font-normal">
                                Mín. 2h de anticipación
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-500 border-amber-500/30 bg-amber-500/10 font-normal">
                                Horario pasado
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground/70 mt-0.5">
                            {slot.start_time} - {slot.end_time}
                          </p>
                        </div>
                        <Clock className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                      </div>
                    );
                  }

                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => handleSelectTimeSlot(slot.id)}
                      className={cn(
                        "p-3.5 rounded-xl border text-left transition-all active:scale-[0.98] flex items-center justify-between cursor-pointer",
                        isSelected
                          ? "bg-primary border-primary text-primary-foreground shadow-md ring-2 ring-primary/20"
                          : "bg-card border-border hover:border-primary/50"
                      )}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm">{slot.label}</p>
                          <Badge variant="secondary" className="text-[10px] py-0 px-1.5 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                            Disponible
                          </Badge>
                        </div>
                        <p className={cn("text-xs mt-0.5", isSelected ? "text-primary-foreground/80" : "text-muted-foreground")}>
                          {slot.start_time} - {slot.end_time}
                        </p>
                      </div>
                      <Clock className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-muted-foreground")} />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );

      case 5:
        const pricing = calculatePricing();
        const currentRate = Number(appSettings?.bcv_exchange_rate) || EXCHANGE_RATE.rate || 36.5;
        const totalVes = pricing.total * currentRate;

        return (
          <div className="space-y-5">
            <div className="text-center">
              <h2 className="text-xl font-bold">Resumen de tu reserva</h2>
              <p className="text-sm text-muted-foreground">Verifica los detalles antes de confirmar</p>
            </div>

            {bookingError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-xs leading-snug">{bookingError}</p>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="mt-2 h-7 text-xs" 
                    onClick={() => {
                      setBookingError(null);
                      prevStep();
                    }}
                  >
                    Cambiar fecha u horario
                  </Button>
                </div>
              </div>
            )}
            
            <Card className="shadow-sm">
              <CardContent className="p-4 space-y-3.5">
                {/* Vehículo */}
                <div className="flex gap-3 items-center">
                  <div className="bg-primary/10 p-2.5 rounded-full text-primary shrink-0">
                    <Car className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{state.vehicle?.brand} {state.vehicle?.model}</p>
                    <p className="text-xs text-muted-foreground font-mono">{state.vehicle?.plate} • {state.vehicle?.color}</p>
                  </div>
                </div>
                <Separator />
                
                {/* Servicio */}
                <div className="flex gap-3 items-center">
                  <div className="bg-primary/10 p-2.5 rounded-full text-primary shrink-0">
                    <Droplets className="h-5 w-5" />
                  </div>
                  <div className="flex-1 flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{state.service?.name}</p>
                      <p className="text-xs text-muted-foreground">{state.service?.base_duration_minutes} min de servicio</p>
                    </div>
                    <span className="font-semibold">{formatCurrency(pricing.servicePrice || 0, "USD")}</span>
                  </div>
                </div>

                {/* Extras */}
                {state.addons.length > 0 && (
                  <>
                    <Separator />
                    <div className="space-y-1.5 pl-11">
                      <p className="text-xs font-semibold text-muted-foreground uppercase">Adicionales:</p>
                      {state.addons.map(addon => {
                        const price = addon.price_by_vehicle_size 
                          ? addon.price_by_vehicle_size[state.vehicle!.size_category] 
                          : addon.price_usd;
                        return (
                          <div key={addon.id} className="flex justify-between text-xs text-muted-foreground">
                            <span>+ {addon.name}</span>
                            <span>{formatCurrency(price, "USD")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
                
                {/* Dirección */}
                <Separator />
                <div className="flex gap-3 items-center">
                  <div className="bg-primary/10 p-2.5 rounded-full text-primary shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">{state.address?.label} ({state.address?.municipality})</p>
                    <p className="text-xs text-muted-foreground line-clamp-1">{state.address?.address_line}</p>
                  </div>
                </div>
                
                {/* Fecha y Hora */}
                <Separator />
                <div className="flex gap-3 items-center">
                  <div className="bg-primary/10 p-2.5 rounded-full text-primary shrink-0">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {state.scheduledDate || next7Days[0]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Turno: {TIME_SLOTS.find(s => s.id === state.scheduledTimeSlot)?.label || "Mañana"}
                    </p>
                  </div>
                </div>

                {/* Desglose de Pago */}
                <Separator />
                <div className="space-y-1.5 pt-1">
                  {pricing.addonsTotal > 0 && (
                    <>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Servicio</span>
                        <span>{formatCurrency(pricing.servicePrice, "USD")}</span>
                      </div>
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Adicionales</span>
                        <span>{formatCurrency(pricing.addonsTotal, "USD")}</span>
                      </div>
                    </>
                  )}
                  <div className={cn("flex justify-between font-bold text-lg text-primary", pricing.addonsTotal > 0 ? "pt-2 border-t" : "")}>
                    <span>Total a Pagar</span>
                    <span>{formatCurrency(pricing.total)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground pt-1">
                    <span>Tasa: {currentRate} Bs/$</span>
                    <span className="font-semibold text-foreground">Ref. {formatCurrency(totalVes, "VES")}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 6:
        const finalPricing = calculatePricing();
        const finalRate = Number(appSettings?.bcv_exchange_rate) || EXCHANGE_RATE.rate || 36.5;
        const finalTotalVes = finalPricing.total * finalRate;

        return (
          <div className="space-y-4 py-2 pb-10">
            <div className="text-center pt-1">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-500 mb-2">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-foreground">¡Cita Registrada!</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Código de reserva: <span className="font-mono font-bold text-primary">{bookingCode}</span>
              </p>
            </div>

            <PaymentReportCard
              bookingId={createdBookingId || bookingCode}
              bookingCode={bookingCode}
              totalUsd={finalPricing.total}
              totalVes={finalTotalVes}
              exchangeRate={finalRate}
              currentStatus="pending_payment"
              createdAt={new Date().toISOString()}
              onPaymentReported={() => {}}
            />

            <div className="pt-2 text-center">
              <Button
                variant="outline"
                className="w-full h-11 text-sm font-medium"
                onClick={handleFinish}
              >
                Ver Mis Reservas
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background pb-28 relative">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-md border-b px-4 h-14 flex items-center gap-3">
        {state.currentStep > 0 && state.currentStep < 6 && (
          <Button variant="ghost" size="icon" onClick={prevStep} className="-ml-2 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        {state.currentStep === 0 && (
          <Link href="/client">
            <Button variant="ghost" size="icon" className="-ml-2 shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
        )}
        <div className="flex-1">
          <h1 className="font-semibold text-lg line-clamp-1">
            {state.currentStep < 6 ? BOOKING_STEPS[state.currentStep].label : "Completado"}
          </h1>
        </div>
        {state.currentStep < 6 && (
          <div className="flex items-center gap-2 shrink-0">
            <Badge variant="secondary" className="text-xs font-semibold">
              Paso {state.currentStep + 1} de 6
            </Badge>
            {state.currentStep > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
                onClick={() => {
                  reset();
                  router.push("/client");
                }}
                title="Salir al Inicio"
              >
                <Home className="h-4 w-4 text-primary" />
              </Button>
            )}
          </div>
        )}
      </header>

      {/* Progress bar */}
      {state.currentStep < 6 && (
        <div className="h-1.5 bg-muted w-full">
          <div 
            className="h-full bg-primary transition-all duration-300" 
            style={{ width: `${((state.currentStep + 1) / 6) * 100}%` }}
          />
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {renderStepContent()}
      </main>



      {/* Dialog to add vehicle in-place without leaving booking */}
      <Dialog open={isAddVehicleOpen} onOpenChange={setIsAddVehicleOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Vehículo</DialogTitle>
            <DialogDescription>
              Ingresa los datos de tu vehículo para asignarlo de inmediato a tu reserva.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onAddVehicleSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-plate">Placa</Label>
              <Input 
                id="b-plate" 
                placeholder="AB123CD" 
                className="uppercase"
                {...register('plate')} 
              />
              {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-brand">Marca</Label>
                <Input id="b-brand" placeholder="Toyota" {...register('brand')} />
                {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-model">Modelo</Label>
                <Input id="b-model" placeholder="Corolla" {...register('model')} />
                {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="b-year">Año</Label>
                <Input id="b-year" placeholder="2023" type="number" {...register('year')} />
                {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="b-color">Color</Label>
                <Input id="b-color" placeholder="Blanco" {...register('color')} />
                {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-type">Tipo de Vehículo</Label>
              <Select 
                value={selectedType} 
                onValueChange={(val: string | null) => {
                  if (val) {
                    setSelectedType(val);
                    setValue('type', val);
                  }
                }}
              >
                <SelectTrigger id="b-type">
                  <SelectValue placeholder="Selecciona el tipo" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>

            <Button type="submit" className="w-full mt-2 h-11">
              Guardar y Seleccionar
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog to add address in-place without leaving booking */}
      <Dialog open={isAddAddressOpen} onOpenChange={setIsAddAddressOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Agregar Dirección</DialogTitle>
            <DialogDescription>
              Ingresa el lugar donde se prestará el servicio de lavado para continuar con tu reserva.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onAddAddressSubmit} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="b-addrLabel">Etiqueta</Label>
              <div className="flex gap-2">
                {["Casa", "Oficina", "Apto", "Otro"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={addrLabel === type ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs cursor-pointer"
                    onClick={() => setAddrLabel(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-addrMunicipality">Municipio (Caracas)</Label>
              <select
                id="b-addrMunicipality"
                value={addrMunicipality}
                onChange={(e) => setAddrMunicipality(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
              >
                <option value="Chacao">Chacao</option>
                <option value="Baruta">Baruta</option>
                <option value="El Hatillo">El Hatillo</option>
                <option value="Sucre">Sucre</option>
                <option value="Libertador">Libertador</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-addrLine">Dirección Detallada</Label>
              <Input
                id="b-addrLine"
                value={addrLine}
                onChange={(e) => setAddrLine(e.target.value)}
                placeholder="Av. / Calle, Edificio / Casa, Piso / Nro"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="b-addrRef">Punto de Referencia (Opcional)</Label>
              <Input
                id="b-addrRef"
                value={addrReference}
                onChange={(e) => setAddrReference(e.target.value)}
                placeholder="Frente a la farmacia, portón negro..."
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={isSavingAddress || !addrLine.trim()} 
                className="w-full h-11 text-sm font-semibold cursor-pointer"
              >
                {isSavingAddress ? "Guardando..." : "Guardar y Continuar"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bottom action bar */}
      {state.currentStep < 6 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/95 backdrop-blur-md border-t shadow-lg z-50 pb-safe">
          <div className="max-w-lg mx-auto flex items-center gap-2 sm:gap-3">
            {state.currentStep > 0 && (
              <>
                <Button 
                  type="button"
                  variant="outline"
                  className="h-12 px-3 sm:px-4 gap-1.5 text-xs sm:text-sm font-semibold border-border hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer shrink-0"
                  onClick={() => {
                    reset();
                    router.push("/client");
                  }}
                  title="Cancelar y volver a Inicio"
                >
                  <Home className="h-4 w-4 text-primary" />
                  <span>Inicio</span>
                </Button>

                <Button 
                  type="button"
                  variant="outline"
                  className="h-12 px-3.5 sm:px-5 text-sm sm:text-base font-semibold border-border hover:bg-muted cursor-pointer shrink-0"
                  onClick={prevStep}
                >
                  Atrás
                </Button>
              </>
            )}
            <Button 
              className="flex-1 h-12 text-sm sm:text-base font-semibold shadow-md cursor-pointer" 
              onClick={handleNext} 
              disabled={!canProceed()}
            >
              {state.currentStep === 5 
                ? "Confirmar Reserva" 
                : state.currentStep === 2 
                  ? (state.addons.length > 0 ? `Continuar (${state.addons.length} extras)` : "Omitir y continuar") 
                  : "Continuar"}
              {state.currentStep < 5 && <ArrowRight className="ml-1.5 h-4 w-4" />}
            </Button>
          </div>
        </div>
      )}
      
      {state.currentStep === 6 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t shadow-lg z-50 pb-safe">
          <div className="max-w-lg mx-auto">
            <Button variant="outline" className="w-full h-11 text-sm font-medium" onClick={handleFinish}>
              Reportar más tarde (Ir a mis reservas)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
