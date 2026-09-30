"use client";

import { useState, useEffect, useMemo } from "react";
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
  fetchInventoryItems,
  insertInventoryItem,
  updateInventoryItem,
  adjustInventoryStock,
  deleteInventoryItem,
  fetchAppSettings,
} from "@/lib/supabase/api";
import { formatCurrency } from "@/lib/utils";
import type { InventoryItem, InventoryCategory, InventoryUnit, AppSettings } from "@/lib/types";
import {
  Package,
  Search,
  Plus,
  Minus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Sparkles,
  Wrench,
  FlaskConical,
  Truck,
  RotateCcw,
  Layers,
  ShoppingBag,
} from "lucide-react";

export default function InventoryAdminPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Modal State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isNewItem, setIsNewItem] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_inventory_updated", handleUpdate);
    window.addEventListener("autospa_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_inventory_updated", handleUpdate);
      window.removeEventListener("autospa_settings_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [invData, sData] = await Promise.all([
      fetchInventoryItems(),
      fetchAppSettings(),
    ]);
    setItems(invData);
    setSettings(sData);
    setIsLoading(false);
  }

  const rate = settings?.bcv_exchange_rate || 36.5;

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesQuery =
        item.name.toLowerCase().includes(q) ||
        (item.supplier && item.supplier.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q);

      if (selectedCategory === "all") return matchesQuery;
      if (selectedCategory === "low_stock") return matchesQuery && item.quantity <= item.min_stock_alert;
      return matchesQuery && item.category === selectedCategory;
    });
  }, [items, searchQuery, selectedCategory]);

  // Calculations
  const totalItemsCount = items.length;
  const lowStockItems = items.filter((i) => i.quantity <= i.min_stock_alert);
  const totalInventoryValueUsd = items.reduce((sum, i) => sum + i.quantity * (i.cost_usd || 0), 0);
  const totalInventoryValueVes = totalInventoryValueUsd * rate;

  const handleOpenNew = () => {
    setEditingItem({
      id: "inv_" + Date.now(),
      name: "",
      category: "quimicos",
      quantity: 10,
      unit: "galones",
      min_stock_alert: 3,
      cost_usd: 15,
      supplier: "Distribuidor Caracas",
      last_restocked: new Date().toISOString().split("T")[0],
    });
    setIsNewItem(true);
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (item: InventoryItem) => {
    setEditingItem({ ...item });
    setIsNewItem(false);
    setIsDialogOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || !editingItem.name.trim()) return;

    setIsSaving(true);
    try {
      const payload: InventoryItem = {
        ...editingItem,
        quantity: Number(editingItem.quantity) || 0,
        min_stock_alert: Number(editingItem.min_stock_alert) || 0,
        cost_usd: Number(editingItem.cost_usd) || 0,
      };

      if (isNewItem) {
        await insertInventoryItem(payload);
      } else {
        await updateInventoryItem(payload.id, payload);
      }
      await loadData();
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Error saving inventory item:", err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAdjustStock = async (itemId: string, delta: number) => {
    await adjustInventoryStock(itemId, delta);
    await loadData();
  };

  const handleDeleteItem = async (itemId: string, name: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar el insumo "${name}"?`)) {
      return;
    }
    await deleteInventoryItem(itemId);
    await loadData();
  };

  const getCategoryBadge = (cat: InventoryCategory) => {
    switch (cat) {
      case "quimicos":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <FlaskConical className="h-3 w-3" /> Químicos y Lavado
          </span>
        );
      case "accesorios":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300">
            <ShoppingBag className="h-3 w-3" /> Microfibras y Accesorios
          </span>
        );
      case "herramientas":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Wrench className="h-3 w-3" /> Herramientas
          </span>
        );
      case "aromaterapia":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Sparkles className="h-3 w-3" /> Aromas & Ambientadores
          </span>
        );
      default:
        return <Badge variant="outline">{cat}</Badge>;
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-12">
      <PageHeader
        title="Control de Inventario"
        action={
          <Button size="sm" className="gap-1 shadow-xs" onClick={handleOpenNew}>
            <Plus className="h-4 w-4" />
            Nuevo Insumo
          </Button>
        }
      />

      {/* Metrics Banner */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-primary">
              <Package className="h-4 w-4" />
              <span className="text-xs font-medium">Insumos en Stock</span>
            </div>
            <p className="text-2xl font-bold">{totalItemsCount}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Productos controlados</p>
          </CardContent>
        </Card>

        <Card className={`border-2 ${lowStockItems.length > 0 ? "bg-amber-500/10 border-amber-500/40" : "bg-emerald-500/5 border-emerald-500/20"}`}>
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1">
              {lowStockItems.length > 0 ? (
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              ) : (
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span className="text-xs font-medium">
                {lowStockItems.length > 0 ? "Alertas de Reposición" : "Stock Saludable"}
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {lowStockItems.length}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {lowStockItems.length > 0 ? "Insumos bajo el nivel mínimo" : "Todos los insumos al día"}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-emerald-500/5 border-emerald-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-1 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
              <span className="text-xs font-medium">Valor del Inventario</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalInventoryValueUsd, "USD")}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              ~ Bs. {totalInventoryValueVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search & Category Filter Pills */}
      <div className="px-4 pt-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por insumo, químico, proveedor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setSelectedCategory("all")}
          >
            Todos ({items.length})
          </Button>
          <Button
            variant={selectedCategory === "low_stock" ? "default" : "outline"}
            size="sm"
            className={`h-7 text-xs rounded-full shrink-0 ${
              lowStockItems.length > 0 && selectedCategory !== "low_stock" ? "border-amber-500/50 text-amber-600" : ""
            }`}
            onClick={() => setSelectedCategory("low_stock")}
          >
            ⚠️ Reposición ({lowStockItems.length})
          </Button>
          <Button
            variant={selectedCategory === "quimicos" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setSelectedCategory("quimicos")}
          >
            🧪 Químicos
          </Button>
          <Button
            variant={selectedCategory === "accesorios" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setSelectedCategory("accesorios")}
          >
            🧽 Microfibras
          </Button>
          <Button
            variant={selectedCategory === "aromaterapia" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setSelectedCategory("aromaterapia")}
          >
            ✨ Aromas
          </Button>
          <Button
            variant={selectedCategory === "herramientas" ? "default" : "outline"}
            size="sm"
            className="h-7 text-xs rounded-full shrink-0"
            onClick={() => setSelectedCategory("herramientas")}
          >
            🔧 Herramientas
          </Button>
        </div>
      </div>

      {/* Inventory List */}
      <div className="px-4 pt-3 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4 h-28 bg-muted/40" />
              </Card>
            ))}
          </div>
        ) : filteredItems.length > 0 ? (
          filteredItems.map((item) => {
            const isLowStock = item.quantity <= item.min_stock_alert;
            const isOutOfStock = item.quantity === 0;
            const totalItemValue = item.quantity * (item.cost_usd || 0);

            return (
              <Card
                key={item.id}
                className={`overflow-hidden transition-all ${
                  isOutOfStock
                    ? "border-destructive/40 bg-destructive/5"
                    : isLowStock
                    ? "border-amber-500/40 bg-amber-500/5"
                    : "hover:shadow-xs"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="font-semibold text-base leading-tight text-foreground">
                          {item.name}
                        </h4>
                        {isOutOfStock ? (
                          <Badge variant="destructive" className="text-[10px] px-2 py-0">
                            Agotado
                          </Badge>
                        ) : isLowStock ? (
                          <Badge variant="secondary" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] px-2 py-0">
                            Stock Bajo (Mín: {item.min_stock_alert})
                          </Badge>
                        ) : (
                          <Badge variant="default" className="text-[10px] px-2 py-0 bg-emerald-600 text-white">
                            Óptimo
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {getCategoryBadge(item.category)}
                        {item.supplier && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Truck className="h-3 w-3" /> {item.supplier}
                          </span>
                        )}
                      </div>

                      {/* Financial info */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 border-t text-xs text-muted-foreground">
                        <div>
                          <span>Costo Unitario: </span>
                          <strong className="text-foreground">{formatCurrency(item.cost_usd, "USD")}</strong>
                        </div>
                        <div>
                          <span>Valor en Stock: </span>
                          <strong className="text-foreground">{formatCurrency(totalItemValue, "USD")}</strong>
                        </div>
                        {item.last_restocked && (
                          <div className="col-span-2 sm:col-span-1">
                            <span>Último reabastecimiento: </span>
                            <strong className="text-foreground">{item.last_restocked}</strong>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right Stock Controls */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {/* Quantity display */}
                      <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                          <span className={`text-2xl font-black ${isOutOfStock ? "text-destructive" : isLowStock ? "text-amber-600 dark:text-amber-400" : "text-foreground"}`}>
                            {item.quantity}
                          </span>
                          <span className="text-xs text-muted-foreground font-medium">
                            {item.unit}
                          </span>
                        </div>
                      </div>

                      {/* Quick Adjust Buttons (+ / -) */}
                      <div className="flex items-center gap-1 bg-background border rounded-lg p-0.5 shadow-2xs">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md"
                          onClick={() => handleAdjustStock(item.id, -1)}
                          disabled={item.quantity <= 0}
                          title="Restar 1 unidad"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-xs font-bold px-1.5 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 rounded-md text-primary"
                          onClick={() => handleAdjustStock(item.id, 1)}
                          title="Sumar 1 unidad"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 mt-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleOpenEdit(item)}
                          title="Editar insumo"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          title="Eliminar insumo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
            <Package className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-base">No hay insumos encontrados</p>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              {searchQuery
                ? "No se encontraron productos para tu búsqueda."
                : "Agrega tus insumos de lavado y detailing para controlar el stock de tu equipo."}
            </p>
            <Button size="sm" onClick={handleOpenNew}>
              <Plus className="h-4 w-4 mr-1" />
              Nuevo Insumo
            </Button>
          </div>
        )}
      </div>

      {/* Dialog for Add / Edit Item */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveItem}>
            <DialogHeader>
              <DialogTitle>
                {isNewItem ? "Registrar Nuevo Insumo" : "Editar Insumo"}
              </DialogTitle>
              <DialogDescription>
                Control de inventario, químicos y herramientas de lavado de AutoSpa.
              </DialogDescription>
            </DialogHeader>

            {editingItem && (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="item_name">Nombre del Insumo / Producto *</Label>
                  <Input
                    id="item_name"
                    required
                    value={editingItem.name}
                    onChange={(e) =>
                      setEditingItem({ ...editingItem, name: e.target.value })
                    }
                    placeholder="Ej. Shampoo pH Neutro Concentrado"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="item_cat">Categoría *</Label>
                    <select
                      id="item_cat"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                      value={editingItem.category}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          category: e.target.value as InventoryCategory,
                        })
                      }
                    >
                      <option value="quimicos">Químicos y Lavado</option>
                      <option value="accesorios">Microfibras y Accesorios</option>
                      <option value="herramientas">Herramientas & Máquinas</option>
                      <option value="aromaterapia">Aromas & Fragancias</option>
                      <option value="otros">Otros</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="item_unit">Unidad de Medida *</Label>
                    <select
                      id="item_unit"
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                      value={editingItem.unit}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          unit: e.target.value as InventoryUnit,
                        })
                      }
                    >
                      <option value="galones">Galones</option>
                      <option value="litros">Litros</option>
                      <option value="unidades">Unidades</option>
                      <option value="frascos">Frascos</option>
                      <option value="paquetes">Paquetes</option>
                      <option value="cajas">Cajas</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="item_qty">Cantidad en Stock *</Label>
                    <Input
                      id="item_qty"
                      type="number"
                      min="0"
                      step="1"
                      required
                      value={editingItem.quantity}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          quantity: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="item_min">Alerta Stock Mínimo *</Label>
                    <Input
                      id="item_min"
                      type="number"
                      min="1"
                      step="1"
                      required
                      value={editingItem.min_stock_alert}
                      onChange={(e) =>
                        setEditingItem({
                          ...editingItem,
                          min_stock_alert: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="item_cost">Costo Unitario (USD $)</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="item_cost"
                        type="number"
                        step="0.1"
                        min="0"
                        className="pl-6"
                        value={editingItem.cost_usd}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            cost_usd: parseFloat(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="item_supplier">Proveedor / Distribuidor</Label>
                    <Input
                      id="item_supplier"
                      value={editingItem.supplier || ""}
                      onChange={(e) =>
                        setEditingItem({ ...editingItem, supplier: e.target.value })
                      }
                      placeholder="Meguiar's / 3M"
                    />
                  </div>
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
                {isSaving ? "Guardando..." : isNewItem ? "Crear Insumo" : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
