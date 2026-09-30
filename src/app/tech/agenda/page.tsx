"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchBookings,
  fetchServices,
  fetchAdminClients,
  fetchCustomerAddresses,
  updateBookingStatus,
} from "@/lib/supabase/api";
import { cn, formatDate, getStatusLabel, getInitials, formatTimeSlot, playAudioChime } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { showSystemNotification } from "@/lib/notifications";
import { NotificationPermissionPrompt } from "@/components/shared/notification-permission-prompt";
import type { Booking, Service, Customer, CustomerAddress, BookingStatus } from "@/lib/types";
import {
  Navigation,
  MapPin,
  Play,
  CheckCircle,
  Clock,
  Wrench,
  Sparkles,
  ArrowRight,
  Car,
  Bell,
} from "lucide-react";

function playNotificationSound() {
  playAudioChime("prominent");
}

export default function TechnicianAgendaPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newOrderAlert, setNewOrderAlert] = useState<{ code: string } | null>(null);

  async function loadAgenda() {
    setIsLoading(true);
    try {
      const [bData, sData, cData, aData] = await Promise.all([
        fetchBookings(),
        fetchServices(),
        fetchAdminClients(),
        fetchCustomerAddresses(),
      ]);
      setBookings(bData);
      setServices(sData);
      setClients(cData);
      setAddresses(aData);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadAgenda();

    const handleUpdate = () => {
      loadAgenda();
    };

    window.addEventListener("autospa_bookings_updated", handleUpdate);

    // Suscripción Realtime con Supabase
    const supabase = createClient();
    const existingChannel = supabase.getChannels().find((c: any) => c.topic === "realtime:tech-assignments-realtime");
    if (existingChannel) {
      supabase.removeChannel(existingChannel);
    }

    const channel = supabase
      .channel("tech-assignments-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "bookings" },
        (payload: any) => {
          loadAgenda();
          const assignedId = payload.new?.assigned_technician_id;
          if (assignedId && (assignedId === user?.id || user?.role === "technician")) {
            playNotificationSound();
            const code = payload.new?.code || "Nueva Asignación";
            setNewOrderAlert({ code });
            showSystemNotification("¡Nueva Orden Asignada!", {
              body: `Se te ha asignado la orden ${code}. Toca para abrir tu agenda.`,
              url: "/tech/agenda",
            });
            setTimeout(() => setNewOrderAlert(null), 10000);
          }
        }
      )
      .on("broadcast", { event: "tech_assigned" }, (payload: any) => {
        loadAgenda();
        const techId = payload.payload?.technicianId;
        if (!techId || techId === user?.id || user?.role === "technician") {
          playNotificationSound();
          const code = payload.payload?.code || "Nueva Asignación";
          setNewOrderAlert({ code });
          showSystemNotification("¡Nueva Orden Asignada!", {
            body: `Se te ha asignado la orden ${code}. Toca para abrir tu agenda.`,
            url: "/tech/agenda",
          });
          setTimeout(() => setNewOrderAlert(null), 10000);
        }
      })
      .on("broadcast", { event: "tech_order_updated" }, (payload: any) => {
        loadAgenda();
      })
      .subscribe();

    return () => {
      window.removeEventListener("autospa_bookings_updated", handleUpdate);
      supabase.removeChannel(channel);
    };
  }, [user?.id, user?.role]);

  // Filter for orders assigned to this tech (or fallback to active orders for demo tech user)
  const todaysOrders = bookings
    .filter((b) => {
      if (user?.id && b.assigned_technician_id === user.id) return true;
      return b.assigned_technician_id === "u_2" || b.assigned_technician_id === "u_3" || !["completed", "cancelled"].includes(b.status);
    })
    .sort((a, b) => a.scheduled_time_slot.localeCompare(b.scheduled_time_slot));

  // Find active/next actionable order
  const activeOrder = todaysOrders.find(
    (b) => ["assigned", "en_route", "arrived", "in_progress", "quality_check"].includes(b.status)
  ) || todaysOrders.find((b) => !["completed", "cancelled"].includes(b.status));

  const activeService = activeOrder ? services.find((s) => s.id === activeOrder.service_id) : null;
  const activeClient = activeOrder ? clients.find((c) => c.id === activeOrder.customer_id) : null;
  const activeAddress = activeOrder
    ? addresses.find((a) => a.id === activeOrder.address_id) || (activeClient?.addresses && activeClient.addresses[0])
    : null;

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground pb-28">
      <PageHeader
        title="Mi Agenda"
        subtitle={
          <span className="flex items-center gap-2">
            <span>{formatDate(new Date())}</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En Vivo
            </span>
          </span>
        }
        action={
          <div className="flex items-center gap-3">
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_2px_10px_rgba(213,174,51,0.35)]" 
            />
            <Link href="/tech/profile" title="Mi Perfil">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-[#eecb52] to-[#d5ae33] text-[#0B0E11] font-extrabold text-xs flex items-center justify-center shrink-0 shadow-sm gold-glow">
                {getInitials(user?.full_name)}
              </div>
            </Link>
          </div>
        }
      />

      <main className="flex-1 p-4 max-w-lg mx-auto w-full space-y-5">
        {/* Realtime Alert Banner */}
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
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/tech/current">
                <Button size="sm" className="h-8 text-xs font-bold gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                  Ver Orden
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
              <button
                onClick={() => setNewOrderAlert(null)}
                className="text-muted-foreground hover:text-foreground text-xs p-1"
                aria-label="Cerrar notificación"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Current / Actionable Order Banner */}
        {activeOrder ? (
          <section className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Wrench className="h-4 w-4 text-primary" /> Orden en Curso
              </h2>
              <Badge variant="outline" className="font-mono text-[10px]">
                {activeOrder.code || `BK-${activeOrder.id.slice(-4)}`}
              </Badge>
            </div>

            <Card className="border-2 border-primary/30 shadow-sm overflow-hidden bg-card">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-foreground leading-tight">
                      {activeService?.name || "Servicio AutoSpa"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Cliente: <strong>{activeClient?.full_name || "Cliente"}</strong>
                    </p>
                  </div>
                  <Badge variant={activeOrder.status === "in_progress" ? "default" : "secondary"}>
                    {getStatusLabel(activeOrder.status)}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-muted-foreground pt-1 border-t">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold text-foreground">
                      {formatTimeSlot(activeOrder.scheduled_time_slot)}
                    </span>
                  </div>
                  {activeAddress && (
                    <div className="flex items-start gap-2">
                      <MapPin className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>
                        {activeAddress.address_line}, {activeAddress.municipality}
                      </span>
                    </div>
                  )}
                </div>

                {/* Direct link to Current Order workflow */}
                <Link href="/tech/current" className="block pt-1">
                  <Button className="w-full h-12 text-sm font-bold gap-2 shadow-xs">
                    <Play className="h-4 w-4" />
                    Abrir Orden Actual y Flujo de Trabajo
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </section>
        ) : (
          <Card className="bg-emerald-500/10 border-emerald-500/20">
            <CardContent className="p-6 text-center">
              <CheckCircle className="h-10 w-10 text-emerald-600 mx-auto mb-2" />
              <h3 className="text-base font-bold text-emerald-800 dark:text-emerald-400">¡Todo al día!</h3>
              <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">
                No tienes pedidos pendientes por ahora.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Today's Orders List */}
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Todos los pedidos asignados ({todaysOrders.length})
          </h2>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-20 bg-muted/40" />
                </Card>
              ))}
            </div>
          ) : todaysOrders.length > 0 ? (
            <div className="space-y-2.5">
              {todaysOrders.map((order) => {
                const isCurrent = order.id === activeOrder?.id;
                const isCompleted = ["completed", "invoiced", "closed"].includes(order.status);
                const svc = services.find((s) => s.id === order.service_id);
                const cl = clients.find((c) => c.id === order.customer_id);
                const addr = addresses.find((a) => a.id === order.address_id) || (cl?.addresses && cl.addresses[0]);

                return (
                  <Link key={order.id} href="/tech/current" className="block">
                    <Card
                      className={cn(
                        "transition-all hover:shadow-xs",
                        isCurrent ? "border-primary/50 bg-primary/5 shadow-2xs" : "",
                        isCompleted ? "opacity-75 bg-muted/30" : ""
                      )}
                    >
                      <CardContent className="p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex flex-col items-center justify-center bg-background border rounded-lg p-2 min-w-[65px] shrink-0">
                            <Clock className="h-3.5 w-3.5 text-primary mb-0.5" />
                            <span className="text-[10px] font-bold text-foreground text-center leading-tight">
                              {formatTimeSlot(order.scheduled_time_slot).split("-")[0]}
                            </span>
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-sm text-foreground truncate">
                              {svc?.name || "Servicio AutoSpa"}
                            </h4>
                            <p className="text-xs text-muted-foreground truncate">
                              {cl?.full_name || "Cliente"} {addr?.municipality ? `• ${addr.municipality}` : ""}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0">
                          <Badge variant={isCompleted ? "outline" : isCurrent ? "default" : "secondary"} className="text-[10px]">
                            {getStatusLabel(order.status)}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          ) : (
            <Card className="text-center py-8 px-4">
              <p className="text-xs text-muted-foreground">No tienes órdenes registradas para hoy.</p>
            </Card>
          )}
        </section>
      </main>

      <NotificationPermissionPrompt role="technician" />
    </div>
  );
}
