"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  fetchBookings,
  fetchServices,
  fetchAdminClients,
  fetchCustomerVehicles,
  fetchCustomerAddresses,
  fetchAppSettings,
} from "@/lib/supabase/api";
import { formatCurrency, formatDateTime, formatTimeSlot } from "@/lib/utils";
import type { Booking, Service, Customer, Vehicle, CustomerAddress, AppSettings } from "@/lib/types";
import {
  History,
  CheckCircle2,
  Calendar,
  Car,
  DollarSign,
  MapPin,
  Clock,
  Sparkles,
  TrendingUp,
} from "lucide-react";

export default function TechnicianHistoryPage() {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const [bData, sData, cData, vData, aData, settsData] = await Promise.all([
          fetchBookings(),
          fetchServices(),
          fetchAdminClients(),
          fetchCustomerVehicles(),
          fetchCustomerAddresses(),
          fetchAppSettings(),
        ]);
        setBookings(bData);
        setServices(sData);
        setClients(cData);
        setVehicles(vData);
        setAddresses(aData);
        setSettings(settsData);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }
    loadHistory();
  }, [user?.id]);

  const rate = settings?.bcv_exchange_rate || 36.5;

  // Filter completed bookings for this technician (or all completed for demo)
  const completedOrders = useMemo(() => {
    return bookings
      .filter((b) => {
        const isCompleted = ["completed", "invoiced", "closed"].includes(b.status);
        if (!isCompleted) return false;
        if (user?.id && b.assigned_technician_id === user.id) return true;
        // Fallback for demo tech
        return b.assigned_technician_id === "u_2" || b.assigned_technician_id === "u_3" || isCompleted;
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [bookings, user]);

  const totalCompletedCount = completedOrders.length;
  const totalEarnedUsd = completedOrders.reduce((sum, b) => sum + (b.total_usd || 0), 0);

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950 pb-28">
      <PageHeader 
        title="Historial de Trabajos" 
        action={
          <img 
            src="/logo.png" 
            alt="AutoSpa VZLA" 
            className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_2px_10px_rgba(213,174,51,0.35)]" 
          />
        }
      />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Summary Card */}
        <div className="grid grid-cols-2 gap-3">
          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-semibold">Servicios Realizados</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{totalCompletedCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Completados con éxito</p>
            </CardContent>
          </Card>

          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 text-primary mb-1">
                <DollarSign className="h-4 w-4" />
                <span className="text-xs font-semibold">Total Atendido</span>
              </div>
              <p className="text-2xl font-bold text-foreground">
                {formatCurrency(totalEarnedUsd, "USD")}
              </p>
              <p className="text-[11px] text-primary font-medium mt-0.5">
                ~ Bs. {(totalEarnedUsd * rate).toFixed(2)}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* History List */}
        <div className="space-y-3">
          <h3 className="font-semibold text-sm text-foreground flex items-center gap-1.5">
            <History className="h-4 w-4 text-primary" /> Servicios Finalizados
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-muted/40" />
                </Card>
              ))}
            </div>
          ) : completedOrders.length > 0 ? (
            completedOrders.map((order) => {
              const svc = services.find((s) => s.id === order.service_id);
              const cl = clients.find((c) => c.id === order.customer_id);
              const vh = vehicles.find((v) => v.id === order.vehicle_id) || (cl?.vehicles && cl.vehicles[0]);
              const addr = addresses.find((a) => a.id === order.address_id) || (cl?.addresses && cl.addresses[0]);

              return (
                <Card key={order.id} className="overflow-hidden hover:shadow-xs transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h4 className="font-semibold text-sm leading-tight">
                            {svc?.name || "Servicio AutoSpa"}
                          </h4>
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {order.code || `BK-${order.id.slice(-4)}`}
                          </Badge>
                          <Badge className="bg-emerald-600 text-white text-[10px] py-0">
                            Completado
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-1">
                          Cliente: <strong>{cl?.full_name || "Cliente"}</strong>
                          {vh && ` • ${vh.brand} ${vh.model} (${vh.plate})`}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {order.scheduled_date} ({formatTimeSlot(order.scheduled_time_slot)})
                          </span>
                          {addr && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {addr.municipality}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-bold text-sm text-foreground">
                          {formatCurrency(order.total_usd, "USD")}
                        </p>
                        <p className="text-[11px] text-muted-foreground font-medium">
                          Bs. {(order.total_usd * rate).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <Card className="text-center py-10 px-4">
              <p className="text-sm font-semibold">No hay servicios finalizados aún</p>
              <p className="text-xs text-muted-foreground mt-1">
                Tus órdenes completadas aparecerán listadas aquí con su balance.
              </p>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
