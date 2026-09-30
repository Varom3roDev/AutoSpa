"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  fetchAdminTechnicians,
  fetchBookings,
  insertTechnician,
  updateTechnician,
  deleteTechnician,
} from "@/lib/supabase/api";
import { getInitials } from "@/lib/utils";
import type { User, Booking } from "@/lib/types";
import {
  Users,
  Search,
  Plus,
  Phone,
  Mail,
  Edit,
  Trash2,
  CalendarDays,
  CheckCircle2,
  MessageSquare,
  ShieldCheck,
  UserCheck,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  Copy,
} from "lucide-react";

export default function TechniciansAdminPage() {
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTech, setEditingTech] = useState<User | null>(null);
  const [isNewTech, setIsNewTech] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [techPassword, setTechPassword] = useState("AutoSpa2026*");
  const [showPassword, setShowPassword] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("autospa_technicians_catalog");
      } catch {}
    }
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_technicians_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_technicians_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [tData, bData] = await Promise.all([
      fetchAdminTechnicians(),
      fetchBookings(),
    ]);
    setTechnicians(tData);
    setBookings(bData);
    setIsLoading(false);
  }

  const filteredTechs = technicians.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (t.full_name || "").toLowerCase().includes(q) ||
      (t.email || "").toLowerCase().includes(q) ||
      (t.phone || "").includes(q)
    );
  });

  const getTechAssignedBookings = (techId: string) => {
    return bookings.filter((b) => b.assigned_technician_id === techId);
  };

  const getTechActiveBookings = (techId: string) => {
    return bookings.filter(
      (b) =>
        b.assigned_technician_id === techId &&
        ["assigned", "en_route", "arrived", "in_progress", "quality_check"].includes(b.status)
    );
  };

  const generateRandomPassword = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setTechPassword(`AutoSpa${randomDigits}*`);
  };

  const handleOpenNewTech = () => {
    setEditingTech({
      id: "",
      full_name: "",
      email: "",
      phone: "+58 ",
      role: "technician",
    });
    setTechPassword("AutoSpa2026*");
    setDialogError(null);
    setIsNewTech(true);
    setIsDialogOpen(true);
  };

  const handleOpenEditTech = (tech: User) => {
    setEditingTech({ ...tech });
    setDialogError(null);
    setIsNewTech(false);
    setIsDialogOpen(true);
  };

  const handleSaveTech = async (e: React.FormEvent) => {
    e.preventDefault();
    setDialogError(null);

    if (!editingTech || !editingTech.full_name.trim() || !editingTech.email.trim()) {
      setDialogError("Por favor completa el nombre y el correo electrónico.");
      return;
    }

    if (isNewTech && (!techPassword || techPassword.length < 6)) {
      setDialogError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setIsSaving(true);
    try {
      if (isNewTech) {
        await insertTechnician({
          ...editingTech,
          password: techPassword,
        });
        setSuccessNotice(
          `¡Técnico "${editingTech.full_name}" creado con éxito! Ya puede iniciar sesión con ${editingTech.email} y clave "${techPassword}".`
        );
      } else {
        await updateTechnician(editingTech.id, editingTech);
        setSuccessNotice(`Datos del técnico "${editingTech.full_name}" actualizados.`);
      }
      await loadData();
      setIsDialogOpen(false);
      setTimeout(() => setSuccessNotice(null), 8000);
    } catch (err: any) {
      console.error("Error saving technician:", err);
      setDialogError(err.message || "Error al registrar el técnico en Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteTech = async (techId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al técnico ${name}?`)) {
      return;
    }
    await deleteTechnician(techId);
    await loadData();
  };

  const activeTechCount = technicians.length;
  const assignedNowCount = technicians.filter(
    (t) => getTechActiveBookings(t.id).length > 0
  ).length;

  return (
    <div className="min-h-dvh bg-background pb-12">
      <PageHeader
        title="Técnicos y Cuadrillas"
        action={
          <Button size="sm" className="gap-1 shadow-xs" onClick={handleOpenNewTech}>
            <Plus className="h-4 w-4" />
            Nuevo Técnico
          </Button>
        }
      />

      {/* Success Notification */}
      {successNotice && (
        <div className="mx-4 mt-4 p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs flex items-start justify-between gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" />
            <span className="font-medium leading-relaxed">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-400/70 hover:text-emerald-400 text-xs font-bold px-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-primary">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Total Técnicos</span>
            </div>
            <p className="text-2xl font-bold">{activeTechCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Disponibles en Caracas</p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-amber-600 dark:text-amber-400">
              <UserCheck className="h-4 w-4" />
              <span className="text-xs font-medium">En Servicio Hoy</span>
            </div>
            <p className="text-2xl font-bold">{assignedNowCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Con órdenes activas</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-medium">Calidad AutoSpa</span>
            </div>
            <p className="text-2xl font-bold">100%</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Personal capacitado</p>
          </CardContent>
        </Card>
      </div>

      {/* Search Input */}
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

      {/* List Count */}
      <div className="px-4 pt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {isLoading
            ? "Cargando personal..."
            : `${filteredTechs.length} técnico${filteredTechs.length !== 1 ? "s" : ""} registrado${filteredTechs.length !== 1 ? "s" : ""}`}
        </span>
      </div>

      {/* Technicians List */}
      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-28 bg-muted/40" />
              </Card>
            ))}
          </div>
        ) : filteredTechs.length > 0 ? (
          filteredTechs.map((tech) => {
            const allBookings = getTechAssignedBookings(tech.id);
            const activeBookings = getTechActiveBookings(tech.id);
            const isCurrentlyBusy = activeBookings.length > 0;
            const cleanPhone = (tech.phone || "").replace(/\D/g, "");

            return (
              <Card key={tech.id} className="overflow-hidden hover:shadow-xs transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: Avatar + Info */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="relative shrink-0">
                        <div className="w-11 h-11 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm border border-primary/20">
                          {getInitials(tech.full_name || tech.email)}
                        </div>
                        <span
                          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background ${
                            isCurrentlyBusy ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          title={isCurrentlyBusy ? "En servicio" : "Disponible"}
                        />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-base leading-tight">
                            {tech.full_name}
                          </h3>
                          <Badge
                            variant={isCurrentlyBusy ? "secondary" : "default"}
                            className="text-[11px] px-2 py-0.5"
                          >
                            {isCurrentlyBusy ? "En servicio" : "Disponible"}
                          </Badge>
                        </div>

                        {/* Contact details */}
                        <div className="mt-1.5 space-y-1 text-xs text-muted-foreground">
                          {tech.email && (
                            <div className="flex items-center gap-1.5 truncate">
                              <Mail className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                              <span className="truncate">{tech.email}</span>
                            </div>
                          )}
                          {tech.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
                              <span>{tech.phone}</span>
                            </div>
                          )}
                        </div>

                        {/* Stats pills */}
                        <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-primary" />
                            <strong>{allBookings.length}</strong> servicios asignados
                          </span>
                          {activeBookings.length > 0 && (
                            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {activeBookings.length} en curso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col gap-1.5 shrink-0">
                      <div className="flex items-center gap-1">
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-8 w-8 rounded-md bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors"
                            title="Chat por WhatsApp"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </a>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEditTech(tech)}
                          title="Editar datos"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteTech(tech.id, tech.full_name)}
                          title="Eliminar técnico"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 border rounded-xl bg-card">
            <Users className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-base">No se encontraron técnicos</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {searchQuery
                ? "No hay resultados para tu búsqueda."
                : "Agrega tu primer técnico operativo para asignarlo a las reservas."}
            </p>
            <Button size="sm" onClick={handleOpenNewTech}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Técnico
            </Button>
          </div>
        )}
      </div>

      {/* Dialog for Add / Edit Technician */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveTech}>
            <DialogHeader>
              <DialogTitle>
                {isNewTech ? "Registrar Nuevo Técnico" : "Editar Técnico"}
              </DialogTitle>
              <DialogDescription>
                Información del personal operativo de AutoSpa en Caracas.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {dialogError && (
                <div className="p-3 rounded-lg bg-destructive/15 border border-destructive/30 text-destructive text-xs flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span className="leading-relaxed">{dialogError}</span>
                </div>
              )}

              {editingTech && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="tech_name">Nombre completo *</Label>
                    <Input
                      id="tech_name"
                      required
                      value={editingTech.full_name}
                      onChange={(e) =>
                        setEditingTech({ ...editingTech, full_name: e.target.value })
                      }
                      placeholder="Ej. Miguel Pérez"
                      disabled={isSaving}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tech_email">Correo electrónico *</Label>
                    <Input
                      id="tech_email"
                      type="email"
                      required
                      value={editingTech.email}
                      onChange={(e) =>
                        setEditingTech({ ...editingTech, email: e.target.value })
                      }
                      placeholder="Ej. miguel@autospa.com.ve"
                      disabled={isSaving || !isNewTech}
                    />
                    {!isNewTech && (
                      <p className="text-[11px] text-muted-foreground">
                        El correo está vinculado a la cuenta de acceso y no puede editarse directamente.
                      </p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tech_phone">Teléfono / WhatsApp *</Label>
                    <Input
                      id="tech_phone"
                      required
                      value={editingTech.phone}
                      onChange={(e) =>
                        setEditingTech({ ...editingTech, phone: e.target.value })
                      }
                      placeholder="Ej. +58 416 1234567"
                      disabled={isSaving}
                    />
                  </div>

                  {isNewTech && (
                    <div className="space-y-2 pt-2 border-t border-[#2B313A]">
                      <div className="flex items-center justify-between">
                        <Label
                          htmlFor="tech_password"
                          className="flex items-center gap-1.5 text-xs font-semibold text-primary"
                        >
                          <Key className="h-3.5 w-3.5" /> Contraseña de Acceso *
                        </Label>
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="text-[11px] text-primary hover:underline font-medium cursor-pointer"
                        >
                          Generar aleatoria
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="tech_password"
                          type={showPassword ? "text" : "password"}
                          required
                          value={techPassword}
                          onChange={(e) => setTechPassword(e.target.value)}
                          placeholder="Mínimo 6 caracteres"
                          className="pr-10"
                          disabled={isSaving}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        El técnico usará este correo y clave para ingresar a la App de Técnicos en{" "}
                        <span className="text-primary font-mono">/login</span>.
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : isNewTech ? "Crear Técnico" : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
