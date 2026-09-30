"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  fetchServices,
  fetchServiceAddons,
  insertService,
  updateService,
  deleteService,
  insertAddon,
  updateAddon,
  deleteAddon,
} from "@/lib/supabase/api";
import { formatCurrency } from "@/lib/utils";
import type { Service, ServiceAddon, VehicleSizeCategory } from "@/lib/types";
import {
  Droplets,
  Clock,
  DollarSign,
  Edit,
  Plus,
  Check,
  X,
  Sparkles,
  Users,
  Trash2,
} from "lucide-react";

export default function ServicesAdminPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [addons, setAddons] = useState<ServiceAddon[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals state
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isNewService, setIsNewService] = useState(false);

  const [addonModalOpen, setAddonModalOpen] = useState(false);
  const [editingAddon, setEditingAddon] = useState<ServiceAddon | null>(null);
  const [isNewAddon, setIsNewAddon] = useState(false);

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_services_updated", handleUpdate);
    window.addEventListener("autospa_addons_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_services_updated", handleUpdate);
      window.removeEventListener("autospa_addons_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [sData, aData] = await Promise.all([
      fetchServices(),
      fetchServiceAddons(),
    ]);
    setServices(sData);
    setAddons(aData);
    setIsLoading(false);
  }

  // --- SERVICE ACTIONS ---
  const handleOpenEditService = (service: Service) => {
    setEditingService({ ...service });
    setIsNewService(false);
    setServiceModalOpen(true);
  };

  const handleOpenNewService = () => {
    setEditingService({
      id: "srv_" + Date.now(),
      category_id: "cat_wash",
      name: "",
      short_description: "",
      description: "",
      includes: ["Lavado exterior con espuma", "Aspirado interior", "Limpieza de vidrios"],
      excludes: [],
      base_duration_minutes: 45,
      base_price_usd: 15,
      price_by_vehicle_size: {
        small: 15,
        medium: 20,
        large: 25,
        xlarge: 30,
      },
      tax_rate: 0,
      min_technicians: 1,
      is_active: true,
      sort_order: services.length + 1,
    });
    setIsNewService(true);
    setServiceModalOpen(true);
  };

  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    setIsSaving(true);

    try {
      const payload: Service = {
        ...editingService,
        base_price_usd: editingService.price_by_vehicle_size?.small || editingService.base_price_usd || 15,
      };

      if (isNewService) {
        await insertService(payload);
      } else {
        await updateService(payload.id, payload);
      }
      await loadData();
      setServiceModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este servicio?")) return;
    await deleteService(id);
    await loadData();
  };

  // --- ADDON ACTIONS ---
  const handleOpenEditAddon = (addon: ServiceAddon) => {
    setEditingAddon({ ...addon });
    setIsNewAddon(false);
    setAddonModalOpen(true);
  };

  const handleOpenNewAddon = () => {
    setEditingAddon({
      id: "add_" + Date.now(),
      name: "",
      description: "",
      price_usd: 5,
      price_by_vehicle_size: null,
      duration_minutes: 15,
      is_active: true,
    });
    setIsNewAddon(true);
    setAddonModalOpen(true);
  };

  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddon) return;
    setIsSaving(true);

    try {
      if (isNewAddon) {
        await insertAddon(editingAddon);
      } else {
        await updateAddon(editingAddon.id, editingAddon);
      }
      await loadData();
      setAddonModalOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAddon = async (id: string) => {
    if (!confirm("¿Estás seguro de que deseas eliminar este adicional?")) return;
    await deleteAddon(id);
    await loadData();
  };

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader
        title="Servicios y Precios"
        action={
          <Button size="sm" className="gap-1 shadow-xs" onClick={handleOpenNewService}>
            <Plus className="h-4 w-4" />
            Nuevo Servicio
          </Button>
        }
      />

      <Tabs defaultValue="services" className="px-4 pt-4">
        <div className="flex items-center justify-between gap-3">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="services">Servicios ({services.length})</TabsTrigger>
            <TabsTrigger value="addons">Extras / Adicionales ({addons.length})</TabsTrigger>
          </TabsList>
        </div>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-3 mt-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-32 bg-muted/40" />
                </Card>
              ))}
            </div>
          ) : services.length > 0 ? (
            services.map((service) => (
              <Card key={service.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Droplets className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-base truncate">
                          {service.name}
                        </h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {service.short_description}
                      </p>

                      {/* Price grid by vehicle size */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                        {(["small", "medium", "large", "xlarge"] as VehicleSizeCategory[]).map(
                          (size) => (
                            <div
                              key={size}
                              className="flex items-center justify-between text-xs bg-muted/50 rounded-md px-2.5 py-1.5 border"
                            >
                              <span className="text-muted-foreground font-medium">
                                {size === "small"
                                  ? "Pequeño"
                                  : size === "medium"
                                  ? "Mediano"
                                  : size === "large"
                                  ? "Grande"
                                  : "Extra G."}
                              </span>
                              <span className="font-bold text-primary">
                                {formatCurrency(service.price_by_vehicle_size?.[size] ?? service.base_price_usd)}
                              </span>
                            </div>
                          )
                        )}
                      </div>

                      {/* Meta info */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {service.base_duration_minutes} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {service.min_technicians} técnico
                          {service.min_technicians > 1 ? "s" : ""}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={service.is_active ? "default" : "secondary"}>
                        {service.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => handleOpenEditService(service)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => handleDeleteService(service.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Includes */}
                  {service.includes && service.includes.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs font-medium text-muted-foreground mb-1.5">
                        Incluye:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {service.includes.map((item, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 rounded-full px-2.5 py-0.5 border border-emerald-200"
                          >
                            <Check className="h-3 w-3" />
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Droplets className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No hay servicios registrados</p>
                <Button size="sm" className="mt-3" onClick={handleOpenNewService}>
                  Crear primer servicio
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Addons Tab */}
        <TabsContent value="addons" className="space-y-3 mt-4">
          <div className="flex justify-end">
            <Button size="sm" variant="outline" className="gap-1 shadow-xs" onClick={handleOpenNewAddon}>
              <Plus className="h-4 w-4" />
              Nuevo Extra
            </Button>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-20 bg-muted/40" />
                </Card>
              ))}
            </div>
          ) : addons.length > 0 ? (
            addons.map((addon) => (
              <Card key={addon.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-primary shrink-0" />
                        <h3 className="font-semibold text-base truncate">{addon.name}</h3>
                      </div>
                      {addon.description && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {addon.description}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs">
                        <span className="font-bold text-sm text-primary">
                          {formatCurrency(addon.price_usd)}
                        </span>
                        {addon.duration_minutes > 0 && (
                          <span className="flex items-center gap-1 text-muted-foreground">
                            <Clock className="h-3 w-3" />+{addon.duration_minutes} min
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={addon.is_active ? "default" : "secondary"}>
                        {addon.is_active ? "Activo" : "Inactivo"}
                      </Badge>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => handleOpenEditAddon(addon)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteAddon(addon.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Sparkles className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="font-medium">No hay servicios adicionales registrados</p>
                <Button size="sm" className="mt-3" onClick={handleOpenNewAddon}>
                  Crear primer adicional
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* SERVICE EDIT/NEW MODAL */}
      <Dialog open={serviceModalOpen} onOpenChange={setServiceModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isNewService ? "Nuevo Servicio" : "Editar Servicio"}
            </DialogTitle>
            <DialogDescription>
              Configura los datos del servicio y sus tarifas según el tamaño del vehículo.
            </DialogDescription>
          </DialogHeader>

          {editingService && (
            <form onSubmit={handleSaveService} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="srv_name">Nombre del servicio</Label>
                <Input
                  id="srv_name"
                  required
                  value={editingService.name}
                  onChange={(e) =>
                    setEditingService({ ...editingService, name: e.target.value })
                  }
                  placeholder="Ej. Lavado Básico, Detallado Full"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="srv_short_desc">Descripción corta</Label>
                <Input
                  id="srv_short_desc"
                  required
                  value={editingService.short_description}
                  onChange={(e) =>
                    setEditingService({ ...editingService, short_description: e.target.value })
                  }
                  placeholder="Ej. Lavado exterior con espuma y aspirado"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="srv_duration">Duración estimada (min)</Label>
                  <Input
                    id="srv_duration"
                    type="number"
                    min="10"
                    step="5"
                    required
                    value={editingService.base_duration_minutes}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        base_duration_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="srv_status">Estado</Label>
                  <select
                    id="srv_status"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                    value={editingService.is_active ? "active" : "inactive"}
                    onChange={(e) =>
                      setEditingService({
                        ...editingService,
                        is_active: e.target.value === "active",
                      })
                    }
                  >
                    <option value="active">Activo</option>
                    <option value="inactive">Inactivo</option>
                  </select>
                </div>
              </div>

              {/* Price per vehicle size category */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="font-semibold text-sm">
                  Precios en USD ($) por tamaño de vehículo:
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="price_small" className="text-xs text-muted-foreground">
                      Pequeño (Sedan / Hatchback)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price_small"
                        type="number"
                        step="1"
                        min="0"
                        required
                        className="pl-6"
                        value={editingService.price_by_vehicle_size.small}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            price_by_vehicle_size: {
                              ...editingService.price_by_vehicle_size,
                              small: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="price_med" className="text-xs text-muted-foreground">
                      Mediano (SUV / Crossover)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price_med"
                        type="number"
                        step="1"
                        min="0"
                        required
                        className="pl-6"
                        value={editingService.price_by_vehicle_size.medium}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            price_by_vehicle_size: {
                              ...editingService.price_by_vehicle_size,
                              medium: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="price_large" className="text-xs text-muted-foreground">
                      Grande (Camioneta / Pickup)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price_large"
                        type="number"
                        step="1"
                        min="0"
                        required
                        className="pl-6"
                        value={editingService.price_by_vehicle_size.large}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            price_by_vehicle_size: {
                              ...editingService.price_by_vehicle_size,
                              large: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="price_xlarge" className="text-xs text-muted-foreground">
                      Extra Grande (Van / Minivan)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="price_xlarge"
                        type="number"
                        step="1"
                        min="0"
                        required
                        className="pl-6"
                        value={editingService.price_by_vehicle_size.xlarge}
                        onChange={(e) =>
                          setEditingService({
                            ...editingService,
                            price_by_vehicle_size: {
                              ...editingService.price_by_vehicle_size,
                              xlarge: parseFloat(e.target.value) || 0,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Items included */}
              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="srv_includes" className="text-xs text-muted-foreground">
                  Incluye (un ítem por línea)
                </Label>
                <Textarea
                  id="srv_includes"
                  rows={3}
                  value={editingService.includes?.join("\n") || ""}
                  onChange={(e) =>
                    setEditingService({
                      ...editingService,
                      includes: e.target.value.split("\n").filter((x) => x.trim() !== ""),
                    })
                  }
                  placeholder="Lavado exterior&#10;Aspirado interior&#10;Brillo de cauchos"
                />
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setServiceModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Servicio"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* ADDON EDIT/NEW MODAL */}
      <Dialog open={addonModalOpen} onOpenChange={setAddonModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isNewAddon ? "Nuevo Adicional / Extra" : "Editar Adicional"}
            </DialogTitle>
            <DialogDescription>
              Configura el nombre, precio en USD y duración añadida.
            </DialogDescription>
          </DialogHeader>

          {editingAddon && (
            <form onSubmit={handleSaveAddon} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label htmlFor="add_name">Nombre del adicional</Label>
                <Input
                  id="add_name"
                  required
                  value={editingAddon.name}
                  onChange={(e) =>
                    setEditingAddon({ ...editingAddon, name: e.target.value })
                  }
                  placeholder="Ej. Encerado Premium, Lavado de Motor"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add_desc">Descripción (opcional)</Label>
                <Input
                  id="add_desc"
                  value={editingAddon.description || ""}
                  onChange={(e) =>
                    setEditingAddon({ ...editingAddon, description: e.target.value })
                  }
                  placeholder="Ej. Cera sintética hidrofóbica"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="add_price">Precio USD ($)</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="add_price"
                      type="number"
                      step="0.5"
                      min="0"
                      required
                      className="pl-6"
                      value={editingAddon.price_usd}
                      onChange={(e) =>
                        setEditingAddon({
                          ...editingAddon,
                          price_usd: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="add_duration">Tiempo extra (min)</Label>
                  <Input
                    id="add_duration"
                    type="number"
                    step="5"
                    min="0"
                    required
                    value={editingAddon.duration_minutes}
                    onChange={(e) =>
                      setEditingAddon({
                        ...editingAddon,
                        duration_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="add_status">Estado</Label>
                <select
                  id="add_status"
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                  value={editingAddon.is_active ? "active" : "inactive"}
                  onChange={(e) =>
                    setEditingAddon({
                      ...editingAddon,
                      is_active: e.target.value === "active",
                    })
                  }
                >
                  <option value="active">Activo</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </div>

              <DialogFooter className="pt-3 gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddonModalOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? "Guardando..." : "Guardar Adicional"}
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="h-24" />
    </div>
  );
}
