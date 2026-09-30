"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  fetchPayments,
  fetchPaymentAccountsConfig,
  updatePaymentAccountsConfig,
  insertPaymentRecord,
  verifyPaymentRecord,
  fetchAppSettings,
} from "@/lib/supabase/api";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { PaymentRecord, PaymentAccountConfig, PaymentMethodType, AppSettings } from "@/lib/types";
import {
  CreditCard,
  DollarSign,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Smartphone,
  Banknote,
  Send,
  Building,
  Settings,
  ShieldCheck,
  TrendingUp,
  Receipt,
  FileCheck2,
  AlertCircle,
} from "lucide-react";

export default function PaymentsAdminPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [accounts, setAccounts] = useState<PaymentAccountConfig | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");

  // Modals state
  const [isManualPayOpen, setIsManualPayOpen] = useState(false);
  const [isAccountsOpen, setIsAccountsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Manual payment form state
  const [manualForm, setManualForm] = useState({
    customer_name: "",
    customer_phone: "",
    service_name: "Lavado Express",
    amount_usd: 15,
    payment_method: "pago_movil" as PaymentMethodType,
    reference: "",
    bank: "Banesco",
    notes: "",
  });

  // Accounts edit form state
  const [editingAccounts, setEditingAccounts] = useState<PaymentAccountConfig | null>(null);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_payments_updated", handleUpdate);
    window.addEventListener("autospa_payment_accounts_updated", handleUpdate);
    window.addEventListener("autospa_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_payments_updated", handleUpdate);
      window.removeEventListener("autospa_payment_accounts_updated", handleUpdate);
      window.removeEventListener("autospa_settings_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [pData, aData, sData] = await Promise.all([
      fetchPayments(),
      fetchPaymentAccountsConfig(),
      fetchAppSettings(),
    ]);
    setPayments(pData);
    setAccounts(aData);
    setEditingAccounts(aData);
    setSettings(sData);
    setIsLoading(false);
  }

  const rate = settings?.bcv_exchange_rate || 36.5;

  // Filtered payments
  const filteredPayments = payments.filter((p) => {
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      p.customer_name.toLowerCase().includes(q) ||
      (p.booking_code && p.booking_code.toLowerCase().includes(q)) ||
      (p.reference && p.reference.toLowerCase().includes(q)) ||
      p.service_name.toLowerCase().includes(q);

    const matchesMethod = methodFilter === "all" || p.payment_method === methodFilter;
    return matchesQuery && matchesMethod;
  });

  // Calculations
  const verifiedPayments = payments.filter((p) => p.status === "verified");
  const pendingPayments = payments.filter((p) => p.status === "pending_verification");

  const totalIncomeUsd = verifiedPayments.reduce((sum, p) => sum + p.amount_usd, 0);
  const totalIncomeVes = totalIncomeUsd * rate;

  const totalPendingUsd = pendingPayments.reduce((sum, p) => sum + p.amount_usd, 0);
  const totalPendingVes = totalPendingUsd * rate;

  const handleVerify = async (paymentId: string, bookingId?: string) => {
    await verifyPaymentRecord(paymentId, bookingId);
    await loadData();
  };

  const handleCreateManualPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.customer_name.trim() || manualForm.amount_usd <= 0) return;

    setIsSaving(true);
    try {
      await insertPaymentRecord({
        customer_name: manualForm.customer_name,
        customer_phone: manualForm.customer_phone,
        service_name: manualForm.service_name,
        amount_usd: Number(manualForm.amount_usd),
        amount_ves: Number(manualForm.amount_usd) * rate,
        payment_method: manualForm.payment_method,
        reference: manualForm.reference || undefined,
        bank: manualForm.bank,
        status: "verified",
        notes: manualForm.notes || undefined,
      });

      setManualForm({
        customer_name: "",
        customer_phone: "",
        service_name: "Lavado Express",
        amount_usd: 15,
        payment_method: "pago_movil",
        reference: "",
        bank: "Banesco",
        notes: "",
      });
      setIsManualPayOpen(false);
      await loadData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccounts = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccounts) return;
    setIsSaving(true);
    try {
      await updatePaymentAccountsConfig(editingAccounts);
      setAccounts(editingAccounts);
      setIsAccountsOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const getMethodBadge = (method: PaymentMethodType) => {
    switch (method) {
      case "pago_movil":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <Smartphone className="h-3 w-3" /> Pago Móvil
          </span>
        );
      case "efectivo_usd":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <DollarSign className="h-3 w-3" /> Efectivo USD
          </span>
        );
      case "efectivo_ves":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-500/10 text-amber-700 dark:text-amber-300">
            <Banknote className="h-3 w-3" /> Efectivo Bs.
          </span>
        );
      case "zelle":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300">
            <Send className="h-3 w-3" /> Zelle
          </span>
        );
      case "punto_venta":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-teal-500/10 text-teal-700 dark:text-teal-300">
            <CreditCard className="h-3 w-3" /> Punto de Venta
          </span>
        );
      case "transferencia":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-500/10 text-blue-700 dark:text-blue-300">
            <Building className="h-3 w-3" /> Transf. Bancaria
          </span>
        );
      default:
        return <Badge variant="outline">{method}</Badge>;
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-12">
      <PageHeader
        title="Pagos y Control de Caja"
        action={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="gap-1 shadow-xs"
              onClick={() => setIsAccountsOpen(true)}
            >
              <Settings className="h-4 w-4" />
              Cuentas
            </Button>
            <Button
              size="sm"
              className="gap-1 shadow-xs"
              onClick={() => setIsManualPayOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Registrar Cobro
            </Button>
          </div>
        }
      />

      {/* Financial Summary Cards */}
      <div className="px-4 pt-4 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="bg-emerald-500/5 border-emerald-500/20 col-span-2 sm:col-span-1">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" /> Ingresos Verificados
              </span>
              <span className="text-[10px] text-muted-foreground bg-background/80 px-1.5 py-0.5 rounded">
                Caja Real
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalIncomeUsd, "USD")}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
              ~ Bs. {totalIncomeVes.toLocaleString("es-VE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-amber-500/5 border-amber-500/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-amber-700 dark:text-amber-400 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" /> Por Conciliar / Cobrar
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {formatCurrency(totalPendingUsd, "USD")}
            </p>
            <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-0.5">
              {pendingPayments.length} orden{pendingPayments.length !== 1 ? "es" : ""} pendiente{pendingPayments.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-primary flex items-center gap-1">
                <TrendingUp className="h-3.5 w-3.5" /> Tasa Oficial BCV
              </span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              Bs. {rate.toFixed(2)}
            </p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Conversión oficial en tiempo real
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="transactions" className="px-4 pt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="transactions">
            Movimientos ({payments.length})
          </TabsTrigger>
          <TabsTrigger value="pending">
            Por Verificar ({pendingPayments.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: All Transactions */}
        <TabsContent value="transactions" className="space-y-3 mt-4">
          {/* Search & Filter Bar */}
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, código de orden o referencia..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Method Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <Button
                variant={methodFilter === "all" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full shrink-0"
                onClick={() => setMethodFilter("all")}
              >
                Todos
              </Button>
              <Button
                variant={methodFilter === "pago_movil" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full shrink-0"
                onClick={() => setMethodFilter("pago_movil")}
              >
                📱 Pago Móvil
              </Button>
              <Button
                variant={methodFilter === "efectivo_usd" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full shrink-0"
                onClick={() => setMethodFilter("efectivo_usd")}
              >
                💵 Efectivo $
              </Button>
              <Button
                variant={methodFilter === "zelle" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full shrink-0"
                onClick={() => setMethodFilter("zelle")}
              >
                ⚡ Zelle
              </Button>
              <Button
                variant={methodFilter === "punto_venta" ? "default" : "outline"}
                size="sm"
                className="h-7 text-xs rounded-full shrink-0"
                onClick={() => setMethodFilter("punto_venta")}
              >
                💳 Punto
              </Button>
            </div>
          </div>

          {/* Transactions List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-muted/40" />
                </Card>
              ))}
            </div>
          ) : filteredPayments.length > 0 ? (
            filteredPayments.map((p) => {
              const isVerified = p.status === "verified";

              return (
                <Card key={p.id} className="overflow-hidden hover:shadow-xs transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      {/* Left details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-base leading-tight">
                            {p.customer_name}
                          </h4>
                          {p.booking_code && (
                            <Badge variant="outline" className="font-mono text-[10px] px-1.5 py-0">
                              {p.booking_code}
                            </Badge>
                          )}
                          <Badge
                            variant={isVerified ? "default" : "secondary"}
                            className="text-[11px] px-2 py-0.2"
                          >
                            {isVerified ? "Cobrado / Verificado" : "Pendiente"}
                          </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground mb-2">
                          {p.service_name} • {formatDateTime(p.created_at)}
                        </p>

                        <div className="flex items-center gap-2 flex-wrap">
                          {getMethodBadge(p.payment_method)}
                          {p.reference && (
                            <span className="text-[11px] text-muted-foreground font-mono bg-muted px-1.5 py-0.5 rounded">
                              Ref: {p.reference}
                            </span>
                          )}
                          {p.bank && (
                            <span className="text-[11px] text-muted-foreground">
                              ({p.bank})
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Right amount */}
                      <div className="text-right shrink-0">
                        <p className="font-bold text-base text-foreground">
                          {formatCurrency(p.amount_usd, "USD")}
                        </p>
                        <p className="text-xs text-muted-foreground font-medium">
                          Bs. {(p.amount_usd * rate).toFixed(2)}
                        </p>

                        {!isVerified && (
                          <Button
                            size="sm"
                            className="h-7 text-xs mt-2 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => handleVerify(p.id, p.booking_id)}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Validar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          ) : (
            <div className="text-center py-12 px-4 border rounded-xl bg-card">
              <Receipt className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-semibold text-base">No hay pagos registrados</p>
              <p className="text-xs text-muted-foreground mt-1 mb-4">
                {searchQuery
                  ? "No se encontraron pagos con los filtros actuales."
                  : "Registra cobros directos o espera reservas de los clientes."}
              </p>
              <Button size="sm" onClick={() => setIsManualPayOpen(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Registrar Cobro
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Tab 2: Pending Verification */}
        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingPayments.length > 0 ? (
            pendingPayments.map((p) => (
              <Card key={p.id} className="border-amber-500/30 bg-amber-500/5">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                        <h4 className="font-semibold text-base">{p.customer_name}</h4>
                        {p.booking_code && (
                          <Badge variant="outline" className="font-mono text-[10px]">
                            {p.booking_code}
                          </Badge>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground mb-2">
                        {p.service_name} • Monto a verificar: <strong>{formatCurrency(p.amount_usd, "USD")}</strong> (Bs. {(p.amount_usd * rate).toFixed(2)})
                      </p>

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        {getMethodBadge(p.payment_method)}
                        {p.reference ? (
                          <span className="font-mono bg-background px-2 py-0.5 rounded border text-foreground font-semibold">
                            Ref: {p.reference}
                          </span>
                        ) : (
                          <span className="text-muted-foreground italic">
                            Pendiente por reporte de referencia
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 shrink-0">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                        onClick={() => handleVerify(p.id, p.booking_id)}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Aprobar Cobro
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 px-4 border rounded-xl bg-card">
              <FileCheck2 className="h-10 w-10 text-emerald-500/40 mx-auto mb-3" />
              <p className="font-semibold text-base">¡Caja al día!</p>
              <p className="text-xs text-muted-foreground mt-1">
                No tienes pagos pendientes por conciliar en este momento.
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialog 1: Manual Payment Entry */}
      <Dialog open={isManualPayOpen} onOpenChange={setIsManualPayOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleCreateManualPayment}>
            <DialogHeader>
              <DialogTitle>Registrar Cobro en Caja</DialogTitle>
              <DialogDescription>
                Ingresa una transacción manual o cobro directo en bolívares/dólares.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="pay_client">Nombre del Cliente *</Label>
                <Input
                  id="pay_client"
                  required
                  value={manualForm.customer_name}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, customer_name: e.target.value })
                  }
                  placeholder="Ej. Victor Romero"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pay_amount">Monto USD ($) *</Label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="pay_amount"
                      type="number"
                      step="1"
                      min="1"
                      required
                      className="pl-6"
                      value={manualForm.amount_usd}
                      onChange={(e) =>
                        setManualForm({
                          ...manualForm,
                          amount_usd: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    ~ Bs. {(manualForm.amount_usd * rate).toFixed(2)}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pay_method">Método de Pago *</Label>
                  <select
                    id="pay_method"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs transition-colors"
                    value={manualForm.payment_method}
                    onChange={(e) =>
                      setManualForm({
                        ...manualForm,
                        payment_method: e.target.value as PaymentMethodType,
                      })
                    }
                  >
                    <option value="pago_movil">Pago Móvil (VES)</option>
                    <option value="efectivo_usd">Efectivo (USD $)</option>
                    <option value="efectivo_ves">Efectivo (Bs.)</option>
                    <option value="zelle">Zelle (USD)</option>
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="punto_venta">Punto de Venta</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="pay_ref">N° de Referencia</Label>
                  <Input
                    id="pay_ref"
                    value={manualForm.reference}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, reference: e.target.value })
                    }
                    placeholder="Ej. 129482"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="pay_bank">Banco / Destino</Label>
                  <Input
                    id="pay_bank"
                    value={manualForm.bank}
                    onChange={(e) =>
                      setManualForm({ ...manualForm, bank: e.target.value })
                    }
                    placeholder="Banesco / Mercantil"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="pay_service">Servicio / Concepto</Label>
                <Input
                  id="pay_service"
                  value={manualForm.service_name}
                  onChange={(e) =>
                    setManualForm({ ...manualForm, service_name: e.target.value })
                  }
                  placeholder="Ej. Lavado Básico, Cera Líquida"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsManualPayOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Registrando..." : "Guardar en Caja"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog 2: Receiving Payment Accounts */}
      <Dialog open={isAccountsOpen} onOpenChange={setIsAccountsOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <form onSubmit={handleSaveAccounts}>
            <DialogHeader>
              <DialogTitle>Cuentas Receptoras de AutoSpa</DialogTitle>
              <DialogDescription>
                Datos bancarios y cuentas donde los clientes transfieren sus pagos en Caracas.
              </DialogDescription>
            </DialogHeader>

            {editingAccounts && (
              <div className="space-y-4 py-4">
                {/* Pago Móvil */}
                <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5 text-primary">
                    <Smartphone className="h-4 w-4" /> Pago Móvil
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px]">Banco</Label>
                      <Input
                        value={editingAccounts.pago_movil.bank}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            pago_movil: { ...editingAccounts.pago_movil, bank: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Teléfono</Label>
                      <Input
                        value={editingAccounts.pago_movil.phone}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            pago_movil: { ...editingAccounts.pago_movil, phone: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Cédula / RIF</Label>
                      <Input
                        value={editingAccounts.pago_movil.id_doc}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            pago_movil: { ...editingAccounts.pago_movil, id_doc: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Titular</Label>
                      <Input
                        value={editingAccounts.pago_movil.account_holder}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            pago_movil: { ...editingAccounts.pago_movil, account_holder: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Zelle */}
                <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                    <Send className="h-4 w-4" /> Zelle (USD)
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px]">Correo Zelle</Label>
                      <Input
                        value={editingAccounts.zelle.email}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            zelle: { ...editingAccounts.zelle, email: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">Nombre del Titular</Label>
                      <Input
                        value={editingAccounts.zelle.account_holder}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            zelle: { ...editingAccounts.zelle, account_holder: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>

                {/* Transferencia Bancaria */}
                <div className="p-3 border rounded-lg bg-muted/20 space-y-3">
                  <h4 className="font-semibold text-sm flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                    <Building className="h-4 w-4" /> Cuenta Bancaria Nacional
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <Label className="text-[11px]">Banco</Label>
                      <Input
                        value={editingAccounts.bank_transfer.bank}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            bank_transfer: { ...editingAccounts.bank_transfer, bank: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div>
                      <Label className="text-[11px]">RIF</Label>
                      <Input
                        value={editingAccounts.bank_transfer.id_doc}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            bank_transfer: { ...editingAccounts.bank_transfer, id_doc: e.target.value },
                          })
                        }
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-[11px]">Número de Cuenta (20 dígitos)</Label>
                      <Input
                        value={editingAccounts.bank_transfer.account_number}
                        onChange={(e) =>
                          setEditingAccounts({
                            ...editingAccounts,
                            bank_transfer: { ...editingAccounts.bank_transfer, account_number: e.target.value },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAccountsOpen(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Guardando..." : "Guardar Cuentas"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
