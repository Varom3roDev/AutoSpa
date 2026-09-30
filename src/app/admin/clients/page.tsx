"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { fetchAdminClients, fetchBookings } from "@/lib/supabase/api";
import { getInitials } from "@/lib/utils";
import type { Customer, Booking } from "@/lib/types";
import {
  Search,
  Phone,
  Mail,
  Car,
  CalendarDays,
  Cake,
  Users,
} from "lucide-react";

export default function ClientsPage() {
  const [clients, setClients] = useState<Customer[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [clientsData, bookingsData] = await Promise.all([
      fetchAdminClients(),
      fetchBookings(),
    ]);
    setClients(clientsData);
    setBookings(bookingsData);
    setIsLoading(false);
  }

  const filteredClients = clients.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      (c.full_name || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.phone || "").includes(q)
    );
  });

  const getClientBookingCount = (clientId: string) =>
    bookings.filter((b) => b.customer_id === clientId).length;

  const getClientVehicleCount = (client: Customer) =>
    client.vehicles?.length || 0;

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader title="Clientes Registrados" />

      {/* Search */}
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nombre, email o teléfono..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 pt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {isLoading
            ? "Cargando..."
            : `${filteredClients.length} cliente${filteredClients.length !== 1 ? "s" : ""} registrado${filteredClients.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Client list */}
      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-24 bg-muted/40" />
              </Card>
            ))}
          </div>
        ) : filteredClients.length > 0 ? (
          filteredClients.map((client) => {
            const vehicleCount = getClientVehicleCount(client);
            const bookingCount = getClientBookingCount(client.id);

            return (
              <Card key={client.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Initials Avatar */}
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shrink-0 font-bold text-sm shadow-xs">
                      {getInitials(client.full_name)}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-base truncate">
                          {client.full_name || "Sin nombre"}
                        </h3>
                        <Badge variant="outline" className="text-[10px] shrink-0 font-normal">
                          Cliente
                        </Badge>
                      </div>

                      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center gap-1.5 truncate">
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.birth_date && (
                          <div className="flex items-center gap-1.5 text-primary">
                            <Cake className="h-3 w-3 shrink-0" />
                            <span>Cumpleaños: {client.birth_date}</span>
                          </div>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t">
                        <Badge variant="secondary" className="text-xs">
                          <Car className="h-3 w-3 mr-1" />
                          {vehicleCount} vehículo{vehicleCount !== 1 ? "s" : ""}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          <CalendarDays className="h-3 w-3 mr-1" />
                          {bookingCount} servicio{bookingCount !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium text-foreground">
                {searchQuery ? "No se encontraron clientes" : "No hay clientes registrados"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {searchQuery
                  ? "Prueba con otro término de búsqueda."
                  : "Los nuevos clientes que se registren aparecerán aquí automáticamente."}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="h-24" />
    </div>
  );
}
