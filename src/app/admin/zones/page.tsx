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
  fetchServiceZones,
  fetchAppSettings,
  insertServiceZone,
  updateServiceZone,
  deleteServiceZone,
} from "@/lib/supabase/api";
import { formatCurrency } from "@/lib/utils";
import type { ServiceZone, AppSettings } from "@/lib/types";
import {
  MapPin,
  Search,
  Plus,
  Edit,
  Trash2,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Building2,
  Navigation,
} from "lucide-react";

export default function ServiceZonesAdminPage() {
  const [zones, setZones] = useState<ServiceZone[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");

  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingZone, setEditingZone] = useState<ServiceZone | null>(null);
  const [isNewZone, setIsNewZone] = useState(false);
  const [municipalitiesInput, setMunicipalitiesInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_zones_updated", handleUpdate);
    window.addEventListener("autospa_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_zones_updated", handleUpdate);
      window.removeEventListener("autospa_settings_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [zData, sData] = await Promise.all([
      fetchServiceZones(false),
      fetchAppSettings(),
    ]);
    setZones(zData);
    setSettings(sData);
    setIsLoading(false);
  }

  const rate = settings?.bcv_exchange_rate || 36.5;

  const filteredZones = zones.filter((zone) => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      (zone.name || "").toLowerCase().includes(q) ||
      zone.municipalities.some((m) => m.toLowerCase().includes(q));

    if (filterStatus === "active") return matchQuery && zone.is_active;
    if (filterStatus === "inactive") return matchQuery && !zone.is_active;
    return matchQuery;
  });

  const handleOpenNewZone = () => {
    const newZ: ServiceZone = {
      id: "z_" + Date.now(),
      name: "",
      municipalities: ["Caracas"],
      surcharge_usd: 0,
      avg_travel_minutes: 20,
      is_active: true,
    };
    setEditingZone(newZ);
    setMunicipalitiesInput("Caracas");
    setIsNewZone(true);
    setIsDialogOpen(true);
  };

  const handleOpenEditZone = (zone: ServiceZone) => {
    setEditingZone({ ...zone });
    setMunicipalitiesInput(zone.municipalities.join(", "));
    setIsNewZone(false);
    setIsDialogOpen(true);
  };

  const handleSaveZone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingZone || !editingZone.name.trim()) return;

    setIsSaving(true);
    try {
      const parsedMunicipalities = municipalitiesInput
        .split(",")
        .map((m) => m.trim())
        .filter((m) => m.length > 0);

      const payload: ServiceZone = {
        ...editingZone,
        municipalities: parsedMunicipalities.length > 0 ? parsedMunicipalities : [editingZone.name],
        surcharge_usd: Number(editingZone.surcharge_usd) || 0,
        avg_travel_minutes: Number(editingZone.avg_travel_minutes) || 15,
      };

      if (isNewZone) {
        await insertServiceZone(payload);
      } else {
        await updateServiceZone(payload.id, payload);
      }
      await loadData();
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error saving zone:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (zone: ServiceZone) => {
    await updateServiceZone(zone.id, { is_active: !zone.is_active });
    await loadData();
  };

  const handleDeleteZone = async (zoneId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar la zona "${name}"?`)) {
      return;
    }
    await deleteServiceZone(zoneId);
    await loadData();
  };

  const activeZonesCount = zones.filter((z) => z.is_active).length;
  const totalMunicipalities = Array.from(
    new Set(zones.flatMap((z) => z.municipalities))
  ).length;

  return (
    <div className="min-h-dvh bg-background pb-12">
      <PageHeader
        title="Zonas de Cobertura"
        action={
          <Button size="sm" className="gap-1 shadow-xs" onClick={handleOpenNewZone}>
            <Plus className="h-4 w-4" />
            Nueva Zona
          </Button>
        }
      />

      {/* Metrics Banner */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-primary">
              <MapPin className="h-4 w-4" />
              <span className="text-xs font-medium">Zonas Activas</span>
            </div>
            <p className="text-2xl font-bold">{activeZonesCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">De {zones.length} registradas</p>
          </CardContent>
        </Card>

        <Card className="bg-blue-500/5 border-blue-500/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
              <span className="text-xs font-medium">Municipios / Sectores</span>
            </div>
            <p className="text-2xl font-bold">{totalMunicipalities}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">En Gran Caracas</p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Tasa BCV Referencial</span>
            </div>
            <p className="text-2xl font-bold">Bs. {rate.toFixed(2)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Por USD</p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Filter Bar */}
      <div className="px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por zona, municipio o sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <Button
            variant={filterStatus === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full"
            onClick={() => setFilterStatus("all")}
          >
            Todas ({zones.length})
          </Button>
          <Button
            variant={filterStatus === "active" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full"
            onClick={() => setFilterStatus("active")}
          >
            Activas ({activeZonesCount})
          </Button>
          <Button
            variant={filterStatus === "inactive" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full"
            onClick={() => setFilterStatus("inactive")}
          >
            Inactivas ({zones.length - activeZonesCount})
          </Button>
        </div>
      </div>

      {/* Zones List */}
      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-28 bg-muted/40" />
              </Card>
            ))}
          </div>
        ) : filteredZones.length > 0 ? (
          filteredZones.map((zone) => {
            const hasSurcharge = zone.surcharge_usd > 0;

            return (
              <Card key={zone.id} className="overflow-hidden hover:shadow-xs transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <MapPin className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-base leading-tight">
                          {zone.name}
                        </h3>
                        <Badge
                          variant={zone.is_active ? "default" : "secondary"}
                          className="text-[11px] px-2 py-0.2"
                        >
                          {zone.is_active ? "Activa" : "Inactiva"}
                        </Badge>
                      </div>

                      {/* Municipalities tags */}
                      <div className="flex flex-wrap gap-1.5 my-2">
                        {zone.municipalities.map((m, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-secondary text-secondary-foreground font-medium"
                          >
                            {m}
                          </span>
                        ))}
                      </div>

                      {/* Details row */}
                      <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <DollarSign className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <span>
                            Recargo:{" "}
                            {hasSurcharge ? (
                              <strong className="text-foreground">
                                {formatCurrency(zone.surcharge_usd, "USD")} (Bs. {(zone.surcharge_usd * rate).toFixed(2)})
                              </strong>
                            ) : (
                              <strong className="text-emerald-600 dark:text-emerald-400">Sin recargo ($0)</strong>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span>
                            Traslado est.: <strong>{zone.avg_travel_minutes} min</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEditZone(zone)}
                        title="Editar zona"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`h-8 w-8 ${
                          zone.is_active
                            ? "text-amber-600 hover:text-amber-700 hover:bg-amber-500/10"
                            : "text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"
                        }`}
                        onClick={() => handleToggleActive(zone)}
                        title={zone.is_active ? "Desactivar zona" : "Activar zona"}
                      >
                        {zone.is_active ? (
                          <XCircle className="h-4 w-4" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteZone(zone.id, zone.name)}
                        title="Eliminar zona"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="text-center py-12 px-4 border rounded-xl bg-card">
            <Navigation className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-base">No se encontraron zonas de cobertura</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {searchQuery
                ? "No hay zonas que coincidan con tu búsqueda."
                : "Agrega tu primera zona de servicio para que los clientes puedan seleccionarla."}
            </p>
            <Button size="sm" onClick={handleOpenNewZone}>
              <Plus className="h-4 w-4 mr-1" />
              Nueva Zona
            </Button>
          </div>
        )}
      </div>

      {/* Dialog for Add / Edit Zone */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveZone}>
            <DialogHeader>
              <DialogTitle>
                {isNewZone ? "Agregar Zona de Cobertura" : "Editar Zona de Cobertura"}
              </DialogTitle>
              <DialogDescription>
                Define los sectores, municipios y tarifas de traslado en Caracas.
              </DialogDescription>
            </DialogHeader>

            {editingZone && (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="zone_name">Nombre de la Zona *</Label>
                  <Input
                    id="zone_name"
                    required
                    value={editingZone.name}
                    onChange={(e) =>
                      setEditingZone({ ...editingZone, name: e.target.value })
                    }
                    placeholder="Ej. Chacao / Altamira, El Hatillo"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zone_mun">Municipios / Sectores incluidos *</Label>
                  <Input
                    id="zone_mun"
                    required
                    value={municipalitiesInput}
                    onChange={(e) => setMunicipalitiesInput(e.target.value)}
                    placeholder="Ej. Chacao, Altamira, Los Palos Grandes (separados por coma)"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Escribe los sectores o municipios separados por coma.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="zone_surcharge">Recargo traslado (USD $)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="zone_surcharge"
                        type="number"
                        step="0.5"
                        min="0"
                        required
                        className="pl-6"
                        value={editingZone.surcharge_usd}
                        onChange={(e) =>
                          setEditingZone({
                            ...editingZone,
                            surcharge_usd: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="zone_travel">Traslado estimado (min)</Label>
                    <Input
                      id="zone_travel"
                      type="number"
                      step="5"
                      min="5"
                      required
                      value={editingZone.avg_travel_minutes}
                      onChange={(e) =>
                        setEditingZone({
                          ...editingZone,
                          avg_travel_minutes: parseInt(e.target.value) || 15,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="zone_status">Estado de la Zona</Label>
                  <select
                    id="zone_status"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                    value={editingZone.is_active ? "active" : "inactive"}
                    onChange={(e) =>
                      setEditingZone({
                        ...editingZone,
                        is_active: e.target.value === "active",
                      })
                    }
                  >
                    <option value="active">Activa (Disponible para reservas)</option>
                    <option value="inactive">Inactiva (Fuera de servicio)</option>
                  </select>
                </div>
              </div>
            )}

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
                {isSaving ? "Guardando..." : isNewZone ? "Crear Zona" : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
