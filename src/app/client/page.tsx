"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { CalendarPlus, Droplets, Car, Shield, Bell, ArrowRight, Sparkles, Navigation, MapPin } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchBookings, fetchServices, fetchAppSettings } from "@/lib/supabase/api";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate, getInitials, formatTimeSlot, playAudioChime } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { showSystemNotification } from "@/lib/notifications";
import { NotificationPermissionPrompt } from "@/components/shared/notification-permission-prompt";
import type { Booking, Service, AppSettings } from "@/lib/types";

function playClientNotificationSound() {
  playAudioChime("subtle");
}

function getStatusNotificationDetails(status: string) {
  switch (status) {
    case "confirmed":
      return {
        title: "¡Orden Confirmada!",
        message: "Tu pago fue verificado y tu reserva ha sido aprobada.",
      };
    case "assigned":
      return {
        title: "¡Técnico Asignado!",
        message: "Un especialista certificado ha sido asignado a tu servicio.",
      };
    case "en_route":
      return {
        title: "🚗 ¡Tu técnico va en camino!",
        message: "El especialista ya inició el viaje hacia tu dirección.",
      };
    case "arrived":
      return {
        title: "📍 ¡Tu técnico ha llegado!",
        message: "El especialista ya está en la ubicación acordada.",
      };
    case "in_progress":
      return {
        title: "🫧 ¡Lavado en proceso!",
        message: "Estamos consintiendo y dejando impecable tu vehículo.",
      };
    case "quality_check":
      return {
        title: "🔍 Control de Calidad",
        message: "Revisando los últimos detalles y acabados del servicio.",
      };
    case "completed":
      return {
        title: "✨ ¡Vehículo listo e impecable!",
        message: "Tu servicio ha concluido exitosamente. ¡Gracias por elegir AutoSpa!",
      };
    default:
      return {
        title: "Actualización de tu reserva",
        message: "El estado de tu orden de servicio ha sido actualizado.",
      };
  }
}

export default function ClientDashboardPage() {
  const { user } = useAuth();
  const [upcomingBooking, setUpcomingBooking] = useState<Booking | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clientAlert, setClientAlert] = useState<{
    bookingId: string;
    code: string;
    title: string;
    message: string;
  } | null>(null);

  const cleanFullName = (user?.full_name || "").trim().replace(/\s+/g, ' ');
  const firstName = cleanFullName 
    ? cleanFullName.split(" ")[0] 
    : (user?.email ? user.email.split("@")[0] : "Cliente");

  async function loadDashboard() {
    setIsLoading(true);
    try {
      const [bookingsData, servicesData, settingsData] = await Promise.all([
        user?.id ? fetchBookings({ customerId: user.id }) : Promise.resolve([]),
        fetchServices(),
        fetchAppSettings(),
      ]);
      setServices(servicesData);
      setSettings(settingsData);
      const active = bookingsData.find(
        (b) => !["completed", "cancelled"].includes(b.status)
      );
      setUpcomingBooking(active || null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();

    const handleUpdate = () => {
      loadDashboard();
    };

    window.addEventListener("autospa_services_updated", handleUpdate);
    window.addEventListener("autospa_settings_updated", handleUpdate);
    window.addEventListener("autospa_bookings_updated", handleUpdate);

    // Suscripción Realtime con Supabase
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === "realtime:client-bookings-realtime");
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel("client-bookings-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload: any) => {
          loadDashboard();
          const targetCustomerId = payload.new?.customer_id;
          if (!targetCustomerId || targetCustomerId === user?.id || user?.role === "client") {
            const status = payload.new?.status;
            if (status && status !== "pending_payment") {
              playClientNotificationSound();
              const details = getStatusNotificationDetails(status);
              const code = payload.new?.code || "Tu Reserva";
              const targetUrl = payload.new?.id ? `/client/reservations/${payload.new.id}` : "/client";
              setClientAlert({
                bookingId: payload.new?.id || "",
                code,
                title: details.title,
                message: details.message,
              });
              showSystemNotification(details.title, {
                body: `${code}: ${details.message}`,
                url: targetUrl,
              });
              setTimeout(() => setClientAlert(null), 12000);
            }
          }
        }
      )
      .on("broadcast", { event: "client_booking_updated" }, (payload: any) => {
        loadDashboard();
        const targetCustomerId = payload.payload?.customerId;
        if (!targetCustomerId || targetCustomerId === user?.id || user?.role === "client") {
          playClientNotificationSound();
          const status = payload.payload?.status;
          const details = getStatusNotificationDetails(status);
          const code = payload.payload?.code || "Tu Reserva";
          const targetUrl = payload.payload?.bookingId ? `/client/reservations/${payload.payload.bookingId}` : "/client";
          setClientAlert({
            bookingId: payload.payload?.bookingId || "",
            code,
            title: details.title,
            message: details.message,
          });
          showSystemNotification(details.title, {
            body: `${code}: ${details.message}`,
            url: targetUrl,
          });
          setTimeout(() => setClientAlert(null), 12000);
        }
      })
      .subscribe();

    return () => {
      window.removeEventListener("autospa_services_updated", handleUpdate);
      window.removeEventListener("autospa_settings_updated", handleUpdate);
      window.removeEventListener("autospa_bookings_updated", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  const upcomingService = upcomingBooking 
    ? services.find(s => s.id === upcomingBooking.service_id)
    : null;

  return (
    <div className="p-4 space-y-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <header className="pt-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          <img 
            src="/logo.png" 
            alt="AutoSpa VZLA" 
            className="h-14 md:h-16 w-auto object-contain drop-shadow-[0_4px_16px_rgba(213,174,51,0.4)] transition-transform hover:scale-105" 
          />
          <div>
            <h1 className="text-xl font-extrabold leading-tight text-white">Hola, {firstName}</h1>
            <p className="text-muted-foreground text-xs">¿Tu auto necesita un lavado hoy?</p>
          </div>
        </div>
        <Link href="/client/profile" title="Ver mi perfil">
          <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shrink-0 shadow-md border border-primary/30 hover:opacity-90 transition-opacity">
            <span className="text-xs font-bold tracking-wider text-black">
              {getInitials(user?.full_name)}
            </span>
          </div>
        </Link>
      </header>

      {/* Realtime Alert Banner */}
      {clientAlert && (
        <div className="bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 border-2 border-primary/60 rounded-xl p-4 shadow-lg animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-primary/20 text-primary rounded-lg animate-bounce shrink-0 mt-0.5">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">{clientAlert.title}</span>
                  <span className="text-xs text-muted-foreground font-mono font-semibold">({clientAlert.code})</span>
                </div>
                <p className="text-xs text-foreground font-medium mt-0.5">
                  {clientAlert.message}
                </p>
              </div>
            </div>
            <button
              onClick={() => setClientAlert(null)}
              className="text-muted-foreground hover:text-foreground text-xs p-1"
              aria-label="Cerrar notificación"
            >
              ✕
            </button>
          </div>
          {clientAlert.bookingId && (
            <div className="mt-3 flex justify-end">
              <Link href={`/client/reservations/${clientAlert.bookingId}`}>
                <Button size="sm" className="h-8 text-xs font-bold gap-1.5 shadow-xs bg-primary text-primary-foreground hover:bg-primary/90">
                  Ver Estado en Vivo
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Primary CTA */}
      <Link href="/client/booking" className="block">
        <Card className="bg-primary text-primary-foreground border-none hover:bg-primary/90 transition-colors shadow-sm">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold mb-1">Reservar Lavado</h2>
              <p className="text-primary-foreground/80 text-sm">Rápido y a domicilio</p>
            </div>
            <div className="bg-primary-foreground/20 p-3 rounded-full">
              <CalendarPlus className="h-8 w-8" />
            </div>
          </CardContent>
        </Card>
      </Link>

      {/* Upcoming Booking */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Próxima reserva</h2>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En Vivo
          </span>
        </div>
        
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Verificando reservas...</p>
        ) : upcomingBooking && upcomingService ? (
          <Card>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-3">
                <span className="text-sm text-muted-foreground font-mono">
                  {upcomingBooking.code}
                </span>
                <StatusBadge status={upcomingBooking.status} />
              </div>
              <div className="mb-4">
                <h3 className="font-semibold">{upcomingService.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {formatDate(upcomingBooking.scheduled_date)} • {formatTimeSlot(upcomingBooking.scheduled_time_slot)}
                </p>
              </div>
              <Link href={`/client/reservations/${upcomingBooking.id}`}>
                <Button variant="outline" className="w-full">
                  Ver detalles
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/50 border-dashed">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4 text-sm">No tienes reservas próximas</p>
              <Link href="/client/booking">
                <Button variant="secondary" size="sm">Programar ahora</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Quick Info Banner */}
      <Card className="border shadow-xs bg-gradient-to-r from-card to-primary/5">
        <CardContent className="p-4 flex items-center gap-3.5">
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Droplets className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {settings?.home_banner_title || "Lavado ecológico y premium"}
            </p>
            <p className="text-xs text-muted-foreground">
              {settings?.home_banner_text || "Ahorramos hasta 200L de agua por servicio en Caracas"}
            </p>
          </div>
        </CardContent>
      </Card>

      <NotificationPermissionPrompt role="client" />
    </div>
  );
}

