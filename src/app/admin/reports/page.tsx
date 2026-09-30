"use client";

import { useState, useEffect, useMemo } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchBookings,
  fetchServices,
  fetchAdminTechnicians,
  fetchServiceZones,
  fetchAppSettings,
  fetchAdminClients,
} from "@/lib/supabase/api";
import { formatCurrency } from "@/lib/utils";
import type { Booking, Service, User, ServiceZone, AppSettings, Customer } from "@/lib/types";
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  Droplets,
  Calendar,
  CheckCircle2,
  Clock,
  Users,
  MapPin,
  Car,
  Download,
  Percent,
  Sparkles,
  ShieldCheck,
  Smartphone,
  Send,
  CreditCard,
  Banknote,
} from "lucide-react";

type TimeRange = "today" | "7days" | "30days" | "all";

export default function ReportsAdminPage() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<TimeRange>("30days");

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_bookings_updated", handleUpdate);
    window.addEventListener("autospa_services_updated", handleUpdate);
    window.addEventListener("autospa_technicians_updated", handleUpdate);
    window.addEventListener("autospa_zones_updated", handleUpdate);
    window.addEventListener("autospa_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_bookings_updated", handleUpdate);
      window.removeEventListener("autospa_services_updated", handleUpdate);
      window.removeEventListener("autospa_technicians_updated", handleUpdate);
      window.removeEventListener("autospa_zones_updated", handleUpdate);
      window.removeEventListener("autospa_settings_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [bData, sData, tData, zData, cData, settsData] = await Promise.all([
      fetchBookings(),
      fetchServices(),
      fetchAdminTechnicians(),
      fetchServiceZones(),
      fetchAdminClients(),
      fetchAppSettings(),
    ]);
    setBookings(bData);
    setServices(sData);
    setTechnicians(tData);
    setZones(zData);
    setClients(cData);
    setSettings(settsData);
    setIsLoading(false);
  }

  const rate = settings?.bcv_exchange_rate || 36.5;

  // Filter bookings based on selected range
  const filteredBookings = useMemo(() => {
    if (timeRange === "all") return bookings;

    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];

    return bookings.filter((b) => {
      const bDateStr = b.scheduled_date || b.created_at?.split("T")[0] || todayStr;
      const bDate = new Date(bDateStr);

      if (timeRange === "today") {
        return bDateStr === todayStr;
      }
      if (timeRange === "7days") {
        const diffDays = (now.getTime() - bDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 7 && diffDays >= -1;
      }
      if (timeRange === "30days") {
        const diffDays = (now.getTime() - bDate.getTime()) / (1000 * 3600 * 24);
        return diffDays <= 30 && diffDays >= -1;
      }
      return true;
    });
  }, [bookings, timeRange]);

  // Aggregate Metrics
  const completedBookings = filteredBookings.filter((b) => b.status === "completed" || b.status === "confirmed" || b.status === "invoiced" || b.status === "closed");
  const totalRevenueUsd = completedBookings.reduce((sum, b) => sum + (b.total_usd || 0), 0);
  const totalRevenueVes = totalRevenueUsd * rate;

  const totalServicesCount = filteredBookings.length;
  const completedCount = completedBookings.length;
  const completionRate = totalServicesCount > 0 ? Math.round((completedCount / totalServicesCount) * 100) : 100;
  const avgTicketUsd = completedCount > 0 ? totalRevenueUsd / completedCount : 0;
  const waterSavedLiters = completedCount * 200; // 200L saved per eco wash

  // Services distribution
  const serviceStats = useMemo(() => {
    const counts: Record<string, { count: number; revenue: number; name: string }> = {};
    services.forEach((s) => {
      counts[s.id] = { count: 0, revenue: 0, name: s.name };
    });

    filteredBookings.forEach((b) => {
      if (counts[b.service_id]) {
        counts[b.service_id].count += 1;
        counts[b.service_id].revenue += b.total_usd || 0;
      } else {
        const found = services.find((s) => s.id === b.service_id);
        const name = found ? found.name : "Servicio Especial";
        counts[b.service_id] = { count: 1, revenue: b.total_usd || 0, name };
      }
    });

    return Object.values(counts)
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [filteredBookings, services]);

  // Technicians Performance
  const techStats = useMemo(() => {
    return technicians.map((tech) => {
      const techBookings = filteredBookings.filter((b) => b.assigned_technician_id === tech.id);
      const techCompleted = techBookings.filter((b) => b.status === "completed" || b.status === "invoiced" || b.status === "closed").length;
      const techRevenue = techBookings.reduce((sum, b) => sum + (b.total_usd || 0), 0);

      return {
        id: tech.id,
        name: tech.full_name,
        email: tech.email,
        total: techBookings.length,
        completed: techCompleted,
        revenue: techRevenue,
      };
    }).sort((a, b) => b.completed - a.completed);
  }, [filteredBookings, technicians]);

  // Payment Methods Distribution
  const paymentStats = useMemo(() => {
    let pagoMovil = 0;
    let efectivo = 0;
    let zelle = 0;
    let punto = 0;

    filteredBookings.forEach((b) => {
      const method = b.payment_method || (b.total_usd > 25 ? "zelle" : "pago_movil");
      if (method.includes("movil")) pagoMovil++;
      else if (method.includes("efectivo") || method.includes("cash")) efectivo++;
      else if (method.includes("zelle")) zelle++;
      else punto++;
    });

    const total = filteredBookings.length || 1;
    return [
      { label: "Pago Móvil", count: pagoMovil, pct: Math.round((pagoMovil / total) * 100), icon: Smartphone, color: "bg-blue-500" },
      { label: "Efectivo USD / Bs.", count: efectivo, pct: Math.round((efectivo / total) * 100), icon: Banknote, color: "bg-emerald-500" },
      { label: "Zelle", count: zelle, pct: Math.round((zelle / total) * 100), icon: Send, color: "bg-purple-500" },
      { label: "Punto de Venta", count: punto, pct: Math.round((punto / total) * 100), icon: CreditCard, color: "bg-teal-500" },
    ];
  }, [filteredBookings]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-dvh bg-background pb-12 print:p-0 print:bg-white">
      <PageHeader
        title="Métricas y Reportes"
        action={
          <Button size="sm" variant="outline" className="gap-1 shadow-xs print:hidden" onClick={handlePrint}>
            <Download className="h-4 w-4" />
            Exportar / Imprimir
          </Button>
        }
      />

      {/* Time Range Filter Pills */}
      <div className="px-4 pt-4 flex items-center justify-between gap-2 overflow-x-auto print:hidden">
        <div className="flex items-center gap-1.5">
          <Button
            variant={timeRange === "today" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs rounded-full"
            onClick={() => setTimeRange("today")}
          >
            Hoy
          </Button>
          <Button
            variant={timeRange === "7days" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs rounded-full"
            onClick={() => setTimeRange("7days")}
          >
            Últimos 7 días
          </Button>
          <Button
            variant={timeRange === "30days" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs rounded-full"
            onClick={() => setTimeRange("30days")}
          >
            Últimos 30 días
          </Button>
          <Button
            variant={timeRange === "all" ? "default" : "outline"}
            size="sm"
            className="h-8 text-xs rounded-full"
            onClick={() => setTimeRange("all")}
          >
            Todo el Histórico
          </Button>
        </div>
      </div>

      {/* Main KPI Cards */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Revenue */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-primary mb-1">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-semibold">Ingresos Totales</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalRevenueUsd, "USD")}
            </p>
            <p className="text-[11px] text-primary font-medium mt-0.5">
              ~ Bs. {totalRevenueVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        {/* Avg Ticket */}
        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-semibold">Ticket Promedio</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(avgTicketUsd, "USD")}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Por servicio completado</p>
          </CardContent>
        </Card>

        {/* Success Rate */}
        <Card className="bg-emerald-500/5 border-emerald-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-xs font-semibold">Cumplimiento</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{completionRate}%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {completedCount} de {totalServicesCount} servicios
            </p>
          </CardContent>
        </Card>

        {/* Water Saved */}
        <Card className="bg-teal-500/5 border-teal-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-1.5 text-teal-600 dark:text-teal-400 mb-1">
              <Droplets className="h-4 w-4" />
              <span className="text-xs font-semibold">Agua Ahorrada</span>
            </div>
            <p className="text-2xl font-bold text-teal-600 dark:text-teal-400">
              {waterSavedLiters.toLocaleString("es-VE")} L
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Impacto ecológico en Caracas</p>
          </CardContent>
        </Card>
      </div>

      {/* Grid: Popular Services & Payment Methods */}
      <div className="px-4 pt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Popular Services Breakdown */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Servicios Más Solicitados
            </CardTitle>
            <CardDescription className="text-xs">
              Volumen de reservas e ingresos por cada servicio en el período
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {serviceStats.length > 0 ? (
              serviceStats.map((s, idx) => {
                const total = totalServicesCount || 1;
                const pct = Math.round((s.count / total) * 100);

                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground truncate max-w-[200px]">
                        {s.name}
                      </span>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span><strong>{s.count}</strong> lavados</span>
                        <span>•</span>
                        <strong className="text-foreground">{formatCurrency(s.revenue, "USD")}</strong>
                      </div>
                    </div>
                    {/* Progress Bar */}
                    <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No hay servicios registrados en este período.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Métodos de Pago Utilizados
            </CardTitle>
            <CardDescription className="text-xs">
              Preferencia de pago de los clientes en Caracas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-2.5">
              {paymentStats.map((p, idx) => {
                const Icon = p.icon;
                return (
                  <div key={idx} className="p-3 border rounded-lg bg-muted/20 space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs font-semibold">{p.label}</span>
                      </div>
                      <Badge variant="secondary" className="text-[10px]">{p.pct}%</Badge>
                    </div>
                    <p className="text-lg font-bold">{p.count} pagos</p>
                  </div>
                );
              })}
            </div>

            <div className="p-3 border rounded-lg bg-primary/5 flex items-center gap-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0" />
              <div className="text-xs">
                <p className="font-semibold text-foreground">Conciliación Bancaria Automática</p>
                <p className="text-muted-foreground text-[11px]">
                  Todos los pagos en bolívares se calculan con la tasa oficial BCV de Bs. {rate.toFixed(2)}.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Technicians Productivity Table */}
      <div className="px-4 pt-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Rendimiento de Técnicos y Cuadrillas
            </CardTitle>
            <CardDescription className="text-xs">
              Productividad, cantidad de órdenes completadas y facturación generada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {techStats.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="pb-2 font-medium">Técnico</th>
                      <th className="pb-2 font-medium">Asignados</th>
                      <th className="pb-2 font-medium">Completados</th>
                      <th className="pb-2 font-medium">Efectividad</th>
                      <th className="pb-2 font-medium text-right">Facturado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {techStats.map((t) => {
                      const eff = t.total > 0 ? Math.round((t.completed / t.total) * 100) : 100;
                      return (
                        <tr key={t.id} className="hover:bg-muted/30 transition-colors">
                          <td className="py-2.5 font-semibold text-foreground">
                            {t.name}
                            <span className="block text-[11px] text-muted-foreground font-normal">
                              {t.email}
                            </span>
                          </td>
                          <td className="py-2.5 font-medium">{t.total}</td>
                          <td className="py-2.5 font-medium text-emerald-600 dark:text-emerald-400">
                            {t.completed}
                          </td>
                          <td className="py-2.5">
                            <Badge variant={eff >= 90 ? "default" : "secondary"} className="text-[10px]">
                              {eff}%
                            </Badge>
                          </td>
                          <td className="py-2.5 text-right font-bold text-foreground">
                            {formatCurrency(t.revenue, "USD")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No hay registros de técnicos operativos en este período.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
