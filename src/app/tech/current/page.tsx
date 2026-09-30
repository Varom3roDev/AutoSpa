"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  fetchBookings,
  updateBookingStatus,
  fetchServices,
  fetchAdminClients,
  fetchCustomerVehicles,
  fetchCustomerAddresses,
  fetchAppSettings,
} from "@/lib/supabase/api";
import { formatCurrency, getStatusLabel, formatTimeSlot, playAudioChime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { showSystemNotification } from "@/lib/notifications";
import { NotificationPermissionPrompt } from "@/components/shared/notification-permission-prompt";
import type { Booking, Service, Customer, Vehicle, CustomerAddress, BookingStatus, AppSettings } from "@/lib/types";
import {
  Wrench,
  Navigation,
  MapPin,
  Play,
  CheckCircle2,
  Phone,
  MessageSquare,
  Car,
  Clock,
  CheckSquare,
  Square,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  Sparkles,
  DollarSign,
  ChevronRight,
  ArrowLeft,
  Calendar,
  Bell,
  ArrowRight,
} from "lucide-react";

function playNotificationSound() {
  playAudioChime("prominent");
}

export default function TechnicianCurrentOrderPage() {
  const { user } = useAuth();
  const [activeBooking, setActiveBooking] = useState<Booking | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [client, setClient] = useState<Customer | null>(null);
  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [address, setAddress] = useState<CustomerAddress | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState<{ code: string } | null>(null);

  // Quality check checklist items
  const [checklist, setChecklist] = useState<Record<string, boolean>>({
    exterior_wash: false,
    wheels_tires: false,
    interior_vacuum: false,
    windows_clean: false,
    wax_fragrance: false,
  });

  useEffect(() => {
    loadCurrentOrder();

    const handleUpdate = () => {
      loadCurrentOrder();
    };

    window.addEventListener("autospa_bookings_updated", handleUpdate);

    // Suscripción Realtime con Supabase
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === "realtime:tech-current-realtime");
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel("tech-current-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload: any) => {
          loadCurrentOrder();
          const assignedId = payload.new?.assigned_technician_id;
          if (assignedId && (assignedId === user?.id || user?.role === "technician")) {
            playNotificationSound();
            const code = payload.new?.code || "Orden Actualizada";
            setNewOrderAlert({ code });
            showSystemNotification("¡Orden Actualizada!", {
              body: `La orden ${code} ha tenido cambios. Toca para verla.`,
              url: "/tech/current",
            });
            setTimeout(() => setNewOrderAlert(null), 8000);
          }
        }
      )
      .on("broadcast", { event: "tech_assigned" }, (payload: any) => {
        loadCurrentOrder();
        const techId = payload.payload?.technicianId;
        if (!techId || techId === user?.id || user?.role === "technician") {
          playNotificationSound();
          const code = payload.payload?.code || "Nueva Asignación";
          setNewOrderAlert({ code });
          showSystemNotification("¡Nueva Asignación!", {
            body: `Se te ha asignado la orden ${code}. Toca para comenzar.`,
            url: "/tech/current",
          });
          setTimeout(() => setNewOrderAlert(null), 8000);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("autospa_bookings_updated", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  async function loadCurrentOrder() {
    setIsLoading(true);
    try {
      const [bookingsData, servicesData, clientsData, vehiclesData, addressesData, settingsData] = await Promise.all([
        fetchBookings(),
        fetchServices(),
        fetchAdminClients(),
        fetchCustomerVehicles(),
        fetchCustomerAddresses(),
        fetchAppSettings(),
      ]);

      setSettings(settingsData);

      // Find the active order assigned to this technician (or any active order for testing/demo)
      const techBookings = bookingsData.filter((b) => {
        if (user?.id && b.assigned_technician_id === user.id) return true;
        // Fallback for demo tech user 'u_2' or 'u_3'
        if (b.assigned_technician_id === "u_2" || b.assigned_technician_id === "u_3") return true;
        // Or any non-completed order if logged in as technician
        return !["completed", "cancelled"].includes(b.status);
      });

      // Priority: currently in_progress > en_route > arrived > assigned > confirmed > pending_payment
      const current = techBookings.find((b) => ["in_progress", "quality_check"].includes(b.status)) ||
        techBookings.find((b) => b.status === "arrived") ||
        techBookings.find((b) => b.status === "en_route") ||
        techBookings.find((b) => b.status === "assigned") ||
        techBookings.find((b) => b.status === "confirmed") ||
        techBookings.find((b) => b.status === "pending_payment") ||
        null;

      setActiveBooking(current);

      if (current) {
        const s = servicesData.find((svc) => svc.id === current.service_id) || null;
        const c = clientsData.find((cl) => cl.id === current.customer_id) || null;
        const v = vehiclesData.find((vh) => vh.id === current.vehicle_id) || (c?.vehicles && c.vehicles[0]) || null;
        const a = addressesData.find((ad) => ad.id === current.address_id) || (c?.addresses && c.addresses[0]) || null;

        setService(s);
        setClient(c);
        setVehicle(v);
        setAddress(a);

        // Pre-check checklist if already in progress or quality check
        if (current.status === "quality_check" || current.status === "completed") {
          setChecklist({
            exterior_wash: true,
            wheels_tires: true,
            interior_vacuum: true,
            windows_clean: true,
            wax_fragrance: true,
          });
        }
      }
    } catch (err) {
      console.error("Error loading technician current order:", err);
    } finally {
      setIsLoading(false);
    }
  }

  const rate = settings?.bcv_exchange_rate || 36.5;

  const handleStatusTransition = async (nextStatus: BookingStatus, note: string) => {
    if (!activeBooking) return;
    setIsUpdating(true);
    try {
      await updateBookingStatus(activeBooking.id, nextStatus, note, user?.full_name || "Técnico");
      await loadCurrentOrder();
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleChecklistItem = (key: string) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const allChecked = Object.values(checklist).every(Boolean);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 p-4 space-y-4">
        <PageHeader title="Orden Actual" />
        <Card className="animate-pulse">
          <CardContent className="p-6 h-64 bg-muted/40" />
        </Card>
      </div>
    );
  }

  if (!activeBooking) {
    return (
      <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 pb-24">
        <PageHeader
          title="Orden Actual"
          subtitle={
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En Vivo
            </span>
          }
          action={
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_2px_10px_rgba(213,174,51,0.35)]" 
            />
          }
        />
        <div className="p-4 max-w-lg mx-auto space-y-4">
          {newOrderAlert && (
            <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-2 border-primary/60 rounded-xl p-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/20 text-primary rounded-lg animate-bounce shrink-0">
                  <Bell className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-primary">¡Nueva Asignación!</span>
                    <span className="text-xs text-muted-foreground font-mono font-semibold">({newOrderAlert.code})</span>
                  </div>
                  <p className="text-xs text-foreground font-medium">
                    El administrador te acaba de asignar un nuevo servicio.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
                aria-label="Cerrar notificación"
              >
                ✕
              </button>
            </div>
          )}

          <Card className="text-center py-12 px-6 border-dashed">
            <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h3 className="font-bold text-lg text-foreground mb-1">¡Sin órdenes activas en este momento!</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Has completado todos tus servicios asignados o estás a la espera del próximo turno de trabajo.
            </p>
            <Link href="/tech/agenda">
              <Button className="w-full gap-2">
                <Calendar className="h-4 w-4" />
                Ver Agenda del Día
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  const status = activeBooking.status;
  const cleanPhone = client?.phone ? client.phone.replace(/\D/g, "") : "";
  const googleMapsUrl = address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${address.address_line}, ${address.municipality}, Caracas`)}`
    : "#";

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 pb-28">
      <PageHeader
        title="Orden en Curso"
        subtitle={
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En Vivo
          </span>
        }
        action={
          <div className="flex items-center gap-2.5">
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-8 md:h-9 w-auto object-contain drop-shadow-[0_2px_8px_rgba(213,174,51,0.3)]" 
            />
            <Badge className="text-xs px-2.5 py-1">
              {activeBooking.code || `BK-${activeBooking.id.slice(-4)}`}
            </Badge>
          </div>
        }
      />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Realtime Alert Banner */}
        {newOrderAlert && (
          <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-2 border-primary/60 rounded-xl p-4 flex items-center justify-between shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg animate-bounce shrink-0">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">¡Nueva Actualización!</span>
                  <span className="text-xs text-muted-foreground font-mono font-semibold">({newOrderAlert.code})</span>
                </div>
                <p className="text-xs text-foreground font-medium">
                  Se ha actualizado la orden asignada en tiempo real.
                </p>
              </div>
            </div>
            <button
              onClick={() => setNewOrderAlert(null)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
        )}
        {/* Step Progress Bar Header */}
        <Card className="border-primary/20 bg-primary/5 overflow-hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                <Wrench className="h-4 w-4" /> Estado Operativo
              </span>
              <Badge variant={status === "in_progress" ? "default" : "secondary"}>
                {getStatusLabel(status)}
              </Badge>
            </div>

            {/* Workflow Action Button based on current status */}
            <div className="space-y-2">
              {status === "assigned" && (
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  disabled={isUpdating}
                  onClick={() => handleStatusTransition("en_route", "Técnico inició traslado hacia el cliente")}
                >
                  <Navigation className="h-5 w-5" />
                  {isUpdating ? "Actualizando..." : "1. Iniciar Traslado (Voy en camino)"}
                </Button>
              )}

              {status === "en_route" && (
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-bold bg-teal-600 hover:bg-teal-700 text-white shadow-md gap-2"
                  disabled={isUpdating}
                  onClick={() => handleStatusTransition("arrived", "Técnico llegó al sitio del cliente")}
                >
                  <MapPin className="h-5 w-5" />
                  {isUpdating ? "Actualizando..." : "2. Llegué al Sitio (Notificar Cliente)"}
                </Button>
              )}

              {status === "arrived" && (
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-md gap-2"
                  disabled={isUpdating}
                  onClick={() => handleStatusTransition("in_progress", "Servicio de lavado iniciado")}
                >
                  <Play className="h-5 w-5" />
                  {isUpdating ? "Actualizando..." : "3. Iniciar Servicio de Lavado"}
                </Button>
              )}

              {status === "in_progress" && (
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md gap-2"
                  disabled={isUpdating}
                  onClick={() => handleStatusTransition("quality_check", "Lavado completado, pasando a control de calidad")}
                >
                  <Sparkles className="h-5 w-5" />
                  {isUpdating ? "Actualizando..." : "4. Lavado Listo (Control de Calidad)"}
                </Button>
              )}

              {status === "quality_check" && (
                <Button
                  size="lg"
                  className="w-full h-14 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md gap-2"
                  disabled={isUpdating || !allChecked}
                  onClick={() => handleStatusTransition("completed", "Servicio completado y verificado con éxito")}
                >
                  <CheckCircle2 className="h-5 w-5" />
                  {isUpdating ? "Finalizando..." : "5. Finalizar Servicio y Cobro"}
                </Button>
              )}

              {status === "completed" && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg text-center">
                  <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> ¡Servicio completado con éxito!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Client & Navigation Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span>Cliente y Ubicación</span>
              <span className="text-xs text-muted-foreground font-normal flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-primary" /> {formatTimeSlot(activeBooking.scheduled_time_slot)}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-semibold text-base">{client?.full_name || "Cliente AutoSpa"}</h4>
                <p className="text-xs text-muted-foreground">{client?.phone || "+58 (Caracas)"}</p>
              </div>

              {/* Communication Buttons */}
              <div className="flex items-center gap-2">
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(`¡Hola! Soy tu técnico de AutoSpa. Ya me encuentro coordinando tu servicio de lavado.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-9 w-9 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center hover:bg-emerald-500/20 transition-colors"
                    title="WhatsApp"
                  >
                    <MessageSquare className="h-4 w-4" />
                  </a>
                )}
                {client?.phone && (
                  <a
                    href={`tel:${client.phone}`}
                    className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
                    title="Llamar"
                  >
                    <Phone className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>

            <Separator />

            {/* Address */}
            <div className="space-y-1.5">
              <div className="flex items-start gap-2 text-xs">
                <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium text-foreground text-sm">
                    {address?.address_line || "Dirección en Caracas"}
                  </p>
                  {address?.reference && (
                    <p className="text-muted-foreground text-xs">
                      Ref: {address.reference}
                    </p>
                  )}
                  <p className="text-primary font-medium text-xs">
                    {address?.municipality || "Caracas"}
                  </p>
                </div>
              </div>

              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full mt-2 inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-secondary text-secondary-foreground hover:bg-secondary/80 text-xs font-medium transition-colors"
              >
                <Navigation className="h-3.5 w-3.5 text-primary" />
                Abrir en Google Maps / Waze
                <ExternalLink className="h-3 w-3 text-muted-foreground" />
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Vehicle & Service Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-1.5">
              <Car className="h-4 w-4 text-primary" /> Vehículo y Servicio
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Vehicle details */}
            <div className="p-3 border rounded-lg bg-muted/20 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-foreground">
                  {vehicle ? `${vehicle.brand} ${vehicle.model} (${vehicle.year})` : "Vehículo registrado"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Color: {vehicle?.color || "N/A"} • Tipo: {vehicle?.type?.toUpperCase() || "SEDÁN"}
                </p>
              </div>
              <Badge variant="outline" className="font-mono text-xs font-bold px-2 py-1 bg-background">
                {vehicle?.plate || "SIN PLACA"}
              </Badge>
            </div>

            {/* Service details */}
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold text-sm">
                <span>{service?.name || "Servicio AutoSpa"}</span>
                <span className="text-primary font-bold">
                  {formatCurrency(activeBooking.total_usd, "USD")} (~Bs. {(activeBooking.total_usd * rate).toFixed(2)})
                </span>
              </div>
              <p className="text-muted-foreground text-xs">
                {service?.short_description || service?.description}
              </p>
            </div>

            {/* Addons if any */}
            {activeBooking.addons && activeBooking.addons.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                  Extras / Adicionales contratados:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {activeBooking.addons.map((a, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] bg-primary/10 text-primary font-medium"
                    >
                      <Sparkles className="h-3 w-3" /> {a.name} (+${a.price_usd})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quality Checklist (Mandatory to complete) */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                Checklist de Calidad AutoSpa
              </span>
              <span className="text-xs font-normal text-muted-foreground">
                {Object.values(checklist).filter(Boolean).length}/5 listas
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div
              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs transition-colors"
              onClick={() => toggleChecklistItem("exterior_wash")}
            >
              {checklist.exterior_wash ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={checklist.exterior_wash ? "line-through text-muted-foreground" : "font-medium"}>
                Lavado exterior con espuma y remoción de suciedad
              </span>
            </div>

            <div
              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs transition-colors"
              onClick={() => toggleChecklistItem("wheels_tires")}
            >
              {checklist.wheels_tires ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={checklist.wheels_tires ? "line-through text-muted-foreground" : "font-medium"}>
                Limpieza profunda de rines y brillo de cauchos
              </span>
            </div>

            <div
              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs transition-colors"
              onClick={() => toggleChecklistItem("interior_vacuum")}
            >
              {checklist.interior_vacuum ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={checklist.interior_vacuum ? "line-through text-muted-foreground" : "font-medium"}>
                Aspirado de asientos, alfombras y maletero
              </span>
            </div>

            <div
              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs transition-colors"
              onClick={() => toggleChecklistItem("windows_clean")}
            >
              {checklist.windows_clean ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={checklist.windows_clean ? "line-through text-muted-foreground" : "font-medium"}>
                Limpieza de vidrios y parabrisas por dentro y por fuera
              </span>
            </div>

            <div
              className="flex items-center gap-2.5 p-2 rounded-md hover:bg-muted/40 cursor-pointer text-xs transition-colors"
              onClick={() => toggleChecklistItem("wax_fragrance")}
            >
              {checklist.wax_fragrance ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              ) : (
                <Square className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className={checklist.wax_fragrance ? "line-through text-muted-foreground" : "font-medium"}>
                Aplicación de cera protectora y aromatizante premium
              </span>
            </div>
          </CardContent>
        </Card>
      </main>

      <NotificationPermissionPrompt role="technician" />
    </div>
  );
}
