"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  fetchBookings,
  fetchServices,
  fetchAdminClients,
  fetchAdminTechnicians,
} from "@/lib/supabase/api";
import { formatCurrency, formatTimeSlot, getLocalDateString } from "@/lib/utils";
import type { Booking, Service, Customer, User as UserType } from "@/lib/types";
import {
  Clock,
  User,
  Car,
  Calendar,
  CalendarDays,
  Wrench,
} from "lucide-react";

export default function AdminAgendaPage() {
  const [selectedDate, setSelectedDate] = useState(
    getLocalDateString()
  );
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clients, setClients] = useState<Customer[]>([]);
  const [technicians, setTechnicians] = useState<UserType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Generate next 7 days based on current local date
  const days = useMemo(() => {
    const list: Date[] = [];
    const now = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(now);
      d.setDate(now.getDate() + i);
      list.push(d);
    }
    return list;
  }, []);

  const todayStr = useMemo(() => getLocalDateString(), []);

  useEffect(() => {
    async function loadAgendaData() {
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
    loadAgendaData();
  }, []);

  // Filter bookings for the selected date
  const dayBookings = useMemo(() => {
    return bookings
      .filter((b) => b.scheduled_date === selectedDate && b.status !== "cancelled")
      .sort((a, b) => (a.scheduled_time_slot || "").localeCompare(b.scheduled_time_slot || ""));
  }, [bookings, selectedDate]);

  const assignedTechsCount = useMemo(() => {
    const techIds = new Set(
      dayBookings
        .map((b) => b.assigned_technician_id)
        .filter((id): id is string => !!id)
    );
    return techIds.size;
  }, [dayBookings]);

  return (
    <div className="min-h-dvh bg-background pb-28">
      <PageHeader
        title="Agenda"
      />

      {/* Day selector - horizontal scroll */}
      <div className="px-4 pt-4">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          {days.map((day) => {
            const dateStr = getLocalDateString(day);
            const isSelected = dateStr === selectedDate;
            const isToday = dateStr === todayStr;

            const dayBookingsCount = bookings.filter(
              (b) => b.scheduled_date === dateStr && b.status !== "cancelled"
            ).length;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[70px] transition-all shrink-0 border ${
                  isSelected
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-card hover:bg-muted/60 border-border"
                }`}
              >
                <span className="text-[11px] font-semibold uppercase">
                  {day.toLocaleDateString("es-VE", { weekday: "short" })}
                </span>
                <span className="text-lg font-bold">{day.getDate()}</span>
                {isToday ? (
                  <span className="text-[10px] font-medium opacity-90">Hoy</span>
                ) : dayBookingsCount > 0 ? (
                  <span className="text-[10px] opacity-80">{dayBookingsCount} serv.</span>
                ) : (
                  <span className="text-[10px] opacity-50">•</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stats summary for selected day */}
      <div className="px-4 pt-3 flex items-center gap-2">
        <Badge variant="secondary" className="text-xs">
          <CalendarDays className="h-3.5 w-3.5 mr-1" />
          {dayBookings.length} servicio{dayBookings.length !== 1 ? "s" : ""}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          <Wrench className="h-3.5 w-3.5 mr-1" />
          {assignedTechsCount > 0
            ? `${assignedTechsCount} técnico${assignedTechsCount !== 1 ? "s" : ""} asignado${assignedTechsCount !== 1 ? "s" : ""}`
            : `${technicians.length} técnicos disponibles`}
        </Badge>
      </div>

      {/* Bookings list */}
      <div className="px-4 pt-4 space-y-3 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-28 bg-muted/40" />
              </Card>
            ))}
          </div>
        ) : dayBookings.length > 0 ? (
          dayBookings.map((booking) => {
            const service = services.find((s) => s.id === booking.service_id);
            const client = clients.find((c) => c.id === booking.customer_id);
            const tech = technicians.find((u) => u.id === booking.assigned_technician_id);

            return (
              <Link key={booking.id} href={`/admin/orders/${booking.id}`}>
                <Card className="hover:shadow-md transition-shadow active:bg-muted/30 overflow-hidden cursor-pointer">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-primary" />
                        <span className="font-semibold text-sm">
                          {formatTimeSlot(booking.scheduled_time_slot)}
                        </span>
                      </div>
                      <StatusBadge status={booking.status} />
                    </div>

                    <h3 className="font-semibold text-base mb-1">
                      {service?.name || "Servicio de Lavado"}
                    </h3>

                    <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 truncate">
                        <User className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate font-medium text-foreground">
                          {client?.full_name || "Cliente"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="flex items-center gap-1 font-mono">
                          <Car className="h-3.5 w-3.5" />
                          {booking.code}
                        </span>
                        <span className="font-bold text-sm text-primary">
                          {formatCurrency(booking.total_usd)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 pt-1 text-muted-foreground border-t mt-2">
                        <Wrench className="h-3.5 w-3.5 shrink-0" />
                        <span>{tech?.full_name || "Sin técnico asignado"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })
        ) : (
          <Card className="border-dashed bg-muted/20">
            <CardContent className="p-8 text-center">
              <Calendar className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-foreground font-medium">
                Sin servicios programados
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                No hay reservas agendadas para el día seleccionado.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="h-24" />
    </div>
  );
}
