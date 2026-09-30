'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  fetchPaymentAccountsConfig, 
  reportBookingPayment, 
  updateBookingStatus,
  type ReportedPaymentData 
} from '@/lib/supabase/api';
import { formatCurrency, playAudioChime, cn } from '@/lib/utils';
import type { PaymentAccountConfig, PaymentMethodType } from '@/lib/types';
import { 
  Smartphone, 
  Send, 
  Building, 
  Banknote, 
  Copy, 
  Check, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ShieldCheck,
  RotateCcw
} from 'lucide-react';

interface PaymentReportCardProps {
  bookingId: string;
  bookingCode: string;
  totalUsd: number;
  totalVes: number;
  exchangeRate: number;
  currentStatus?: string;
  createdAt?: string;
  existingPayment?: ReportedPaymentData | null;
  onPaymentReported?: () => void;
  onExpired?: () => void;
  className?: string;
}

export function PaymentReportCard({
  bookingId,
  bookingCode,
  totalUsd,
  totalVes,
  exchangeRate,
  currentStatus = 'pending_payment',
  createdAt,
  existingPayment,
  onPaymentReported,
  onExpired,
  className,
}: PaymentReportCardProps) {
  const [accounts, setAccounts] = useState<PaymentAccountConfig | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('pago_movil');
  const [reference, setReference] = useState('');
  const [bank, setBank] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportedData, setReportedData] = useState<ReportedPaymentData | null>(existingPayment || null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Plazo límite: 30 minutos desde la creación
  const HOLD_MINUTES = 30;
  const HOLD_MS = HOLD_MINUTES * 60 * 1000;

  const [createdTime] = useState<number>(() => {
    if (createdAt) {
      const parsed = new Date(createdAt).getTime();
      if (!isNaN(parsed)) return parsed;
    }
    return Date.now();
  });

  const expiresAt = createdTime + HOLD_MS;
  const [timeLeftMs, setTimeLeftMs] = useState<number>(() => Math.max(0, expiresAt - Date.now()));
  const [isExpired, setIsExpired] = useState<boolean>(() => {
    return (
      expiresAt - Date.now() <= 0 &&
      !existingPayment &&
      currentStatus === 'pending_payment'
    );
  });

  useEffect(() => {
    fetchPaymentAccountsConfig().then(setAccounts);
  }, []);

  useEffect(() => {
    if (existingPayment) {
      setReportedData(existingPayment);
    }
  }, [existingPayment]);

  // Temporizador dinámico de 30 minutos
  useEffect(() => {
    if (reportedData || currentStatus !== 'pending_payment' || isExpired) return;

    const interval = setInterval(() => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) {
        setTimeLeftMs(0);
        setIsExpired(true);
        clearInterval(interval);
        
        // Auto-cancelar en el backend por expiración
        if (bookingId && bookingId.length > 5) {
          updateBookingStatus(bookingId, 'cancelled', 'Expirada automáticamente: tiempo de pago agotado (30 min)');
        }
        if (onExpired) onExpired();
      } else {
        setTimeLeftMs(remaining);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, reportedData, currentStatus, isExpired, bookingId, onExpired]);

  const minutesLeft = Math.floor(timeLeftMs / 60000);
  const secondsLeft = Math.floor((timeLeftMs % 60000) / 1000);
  const formattedTime = `${String(minutesLeft).padStart(2, '0')}:${String(secondsLeft).padStart(2, '0')}`;

  const copyToClipboard = async (text: string, key: string, label: string) => {
    let success = false;
    
    // Intento 1: API moderna navigator.clipboard
    if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        success = true;
      } catch (err) {
        success = false;
      }
    }

    // Intento 2: Fallback infalible con elemento textarea oculto (indispensable para HTTP / móviles en LAN)
    if (!success && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        textArea.setAttribute('readonly', '');
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        success = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.error('Fallback copy failed:', err);
      }
    }

    if (success) {
      setCopiedKey(key);
      setCopiedToast(`¡${label} copiado! (${text})`);
      playAudioChime('subtle');
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2500);
      setTimeout(() => {
        setCopiedToast(null);
      }, 3500);
    } else {
      setCopiedToast(`No se pudo copiar automáticamente. Puedes seleccionar: ${text}`);
      setTimeout(() => setCopiedToast(null), 4000);
    }
  };

  const handleReportPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedMethod !== 'efectivo_usd' && selectedMethod !== 'efectivo_ves') {
      if (!reference.trim()) {
        setErrorMessage('Por favor ingresa los últimos dígitos o número de referencia de tu pago.');
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const isCash = selectedMethod === 'efectivo_usd' || selectedMethod === 'efectivo_ves';
      const paymentPayload = {
        method: selectedMethod,
        reference: isCash ? 'EFECTIVO-EN-SITIO' : reference.trim(),
        bank: isCash ? 'Efectivo al Técnico' : (bank.trim() || 'Banesco'),
        amount_usd: totalUsd,
        amount_ves: totalVes,
        notes: notes.trim() || (isCash ? 'Pago acordado en efectivo al técnico' : ''),
      };

      const success = await reportBookingPayment(bookingId, paymentPayload);

      if (success) {
        playAudioChime('subtle');
        setReportedData({
          ...paymentPayload,
          reported_at: new Date().toISOString(),
        });
        if (onPaymentReported) {
          onPaymentReported();
        }
      } else {
        setErrorMessage('No se pudo registrar el pago. Por favor intenta de nuevo.');
      }
    } catch (err) {
      console.error('Error al reportar pago:', err);
      setErrorMessage('Ocurrió un error inesperado al reportar el pago.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const isConfirmed = currentStatus === 'confirmed' || currentStatus === 'assigned' || currentStatus === 'in_progress' || currentStatus === 'completed';

  // Si la orden ya está confirmada o pagada
  if (isConfirmed) {
    return (
      <Card className={cn("border-emerald-500/30 bg-emerald-500/5", className)}>
        <CardContent className="p-4 flex items-center gap-3">
          <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-2.5 rounded-full shrink-0">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div>
            <p className="font-semibold text-sm text-foreground">Pago Confirmado y Conciliado</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tu servicio está aprobado. El administrador ha validado los fondos y la orden está en curso.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si la reserva está cancelada o expiró sin pago reportado
  if (currentStatus === 'cancelled' || (isExpired && !reportedData && currentStatus === 'pending_payment')) {
    return (
      <Card className={cn("border-destructive/40 bg-destructive/5 shadow-sm text-center py-6 px-4", className)}>
        <CardContent className="space-y-4">
          <div className="w-12 h-12 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-foreground">Reserva Cancelada o Expirada</h3>
            <p className="text-xs text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
              El plazo de 30 minutos para reportar el pago ha vencido o la reserva fue cancelada, por lo que el horario quedó liberado.
            </p>
          </div>
          <div className="pt-2">
            <Link href="/client/booking">
              <Button className="w-full sm:w-auto px-6 h-11 text-sm font-semibold gap-1.5">
                <RotateCcw className="h-4 w-4" /> Iniciar Nueva Reserva
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Si el cliente ya reportó el pago y está esperando verificación del Admin
  if (reportedData) {
    const isCash = reportedData.method === 'efectivo_usd' || reportedData.method === 'efectivo_ves';
    return (
      <Card className={cn("border-amber-500/30 bg-amber-500/5 shadow-sm", className)}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-foreground">
              <Clock className="h-5 w-5 text-amber-500 animate-pulse" />
              {isCash ? 'Pago en Efectivo Notificado' : 'Pago Reportado (Por Verificar)'}
            </CardTitle>
            <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400 font-medium text-[11px]">
              En Verificación
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p className="text-xs text-muted-foreground">
            {isCash
              ? 'Has indicado que realizarás el pago en efectivo directamente al especialista al recibir el servicio.'
              : 'Hemos recibido tu reporte de pago. El administrador está validando la transferencia en banco para confirmar tu cita y asignar al técnico.'}
          </p>

          <div className="bg-background/80 rounded-lg p-3 border space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-muted-foreground font-sans">Método:</span>
              <span className="font-semibold capitalize text-foreground font-sans">
                {reportedData.method === 'pago_movil' && '📱 Pago Móvil'}
                {reportedData.method === 'zelle' && '⚡ Zelle'}
                {reportedData.method === 'transferencia' && '🏦 Transferencia Bancaria'}
                {isCash && '💵 Efectivo en Sitio'}
              </span>
            </div>
            {!isCash && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground font-sans">Referencia:</span>
                  <span className="font-bold text-primary font-mono">{reportedData.reference}</span>
                </div>
                {reportedData.bank && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground font-sans">Banco:</span>
                    <span className="text-foreground font-sans">{reportedData.bank}</span>
                  </div>
                )}
              </>
            )}
            <div className="flex justify-between border-t pt-1.5 mt-1 font-sans">
              <span className="text-muted-foreground">Monto reportado:</span>
              <span className="font-bold text-foreground">
                {reportedData.method === 'zelle' || reportedData.method === 'efectivo_usd'
                  ? formatCurrency(totalUsd, 'USD')
                  : `Ref. ${formatCurrency(totalVes, 'VES')} (${formatCurrency(totalUsd, 'USD')})`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11px] text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Recibirás confirmación en cuanto se apruebe
            </p>
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 text-primary hover:text-primary/80"
              onClick={() => setReportedData(null)}
            >
              Modificar reporte
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Vista de formulario para seleccionar método y reportar
  return (
    <Card className={cn("border-primary/20 shadow-md", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Métodos y Reporte de Pago
          </CardTitle>
          <Badge variant="outline" className="border-amber-500/40 text-amber-500 text-[11px]">
            Pendiente
          </Badge>
        </div>

        {/* Temporizador Regresivo (30 min hold) */}
        <div className={cn(
          "mt-2 rounded-xl p-3 border flex items-center justify-between transition-all",
          timeLeftMs < 5 * 60 * 1000 
            ? "bg-destructive/10 border-destructive/40 text-destructive animate-pulse" 
            : "bg-amber-500/10 border-amber-500/30 text-amber-500"
        )}>
          <div className="flex items-center gap-2.5">
            <Clock className={cn("h-5 w-5 shrink-0", timeLeftMs < 5 * 60 * 1000 ? "text-destructive" : "text-amber-500")} />
            <div>
              <p className="text-xs font-semibold text-foreground">Cupo apartado temporalmente</p>
              <p className="text-[11px] text-muted-foreground">Reporta tu pago antes de que expire:</p>
            </div>
          </div>
          <div className="text-right">
            <span className={cn(
              "font-mono font-bold text-xl tracking-wider",
              timeLeftMs < 5 * 60 * 1000 ? "text-destructive" : "text-amber-500"
            )}>
              {formattedTime}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Desglose rápido de monto */}
        <div className="bg-primary/5 rounded-xl p-3 border border-primary/20 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground uppercase tracking-wider font-semibold">Total a Cancelar</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(totalUsd, 'USD')}</p>
          </div>
          <div className="text-right">
            <p className="text-[11px] text-muted-foreground">Tasa BCV: {exchangeRate} Bs/$</p>
            <p className="text-base font-bold text-foreground">Ref. {formatCurrency(totalVes, 'VES')}</p>
          </div>
        </div>

        {/* Toast Flotante de Confirmación de Copiado */}
        {copiedToast && (
          <div className="p-2.5 bg-emerald-500/15 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 rounded-xl flex items-center justify-between animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex items-center gap-2 text-xs font-semibold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>{copiedToast}</span>
            </div>
            <span className="text-[10px] text-muted-foreground font-mono bg-background/50 px-1.5 py-0.5 rounded">Portapapeles</span>
          </div>
        )}

        {/* Pestañas de Métodos de Pago */}
        <Tabs 
          value={selectedMethod} 
          onValueChange={(val) => setSelectedMethod(val as PaymentMethodType)}
          className="w-full"
        >
          <TabsList className="grid grid-cols-4 w-full h-auto p-1 bg-muted/60">
            <TabsTrigger value="pago_movil" className="flex flex-col py-2 px-1 text-[11px] gap-1">
              <Smartphone className="h-4 w-4" />
              <span>Pago Móvil</span>
            </TabsTrigger>
            <TabsTrigger value="zelle" className="flex flex-col py-2 px-1 text-[11px] gap-1">
              <Send className="h-4 w-4 text-purple-400" />
              <span>Zelle</span>
            </TabsTrigger>
            <TabsTrigger value="transferencia" className="flex flex-col py-2 px-1 text-[11px] gap-1">
              <Building className="h-4 w-4 text-blue-400" />
              <span>Transf.</span>
            </TabsTrigger>
            <TabsTrigger value="efectivo_usd" className="flex flex-col py-2 px-1 text-[11px] gap-1">
              <Banknote className="h-4 w-4 text-emerald-400" />
              <span>Efectivo</span>
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: PAGO MOVIL */}
          <TabsContent value="pago_movil" className="mt-3 space-y-3">
            {(() => {
              const rawPhone = accounts?.pago_movil.phone || '0416-6315114';
              const cleanPhone = rawPhone.replace(/\D/g, ''); // solo dígitos para bancos
              const rawIdDoc = accounts?.pago_movil.id_doc || 'V-17894562';
              const cleanIdDoc = rawIdDoc.replace(/\D/g, ''); // solo dígitos de cédula
              const cleanAmountBs = totalVes.toFixed(2);

              return (
                <div className="bg-muted/40 p-3.5 rounded-xl border text-xs space-y-2.5">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">Banco Receptor:</span>
                    <span className="font-semibold text-foreground">{accounts?.pago_movil.bank || 'Banesco (0134)'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Teléfono Celular:</span>
                      <span className="font-mono font-bold text-foreground text-sm">{rawPhone}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-primary/30 transition-all cursor-pointer",
                        copiedKey === 'pm_phone' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-primary/10 text-primary"
                      )}
                      onClick={() => copyToClipboard(cleanPhone, 'pm_phone', 'Teléfono Celular')}
                    >
                      {copiedKey === 'pm_phone' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Cédula / RIF:</span>
                      <span className="font-mono font-bold text-foreground text-sm">{rawIdDoc}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-primary/30 transition-all cursor-pointer",
                        copiedKey === 'pm_id' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-primary/10 text-primary"
                      )}
                      onClick={() => copyToClipboard(cleanIdDoc, 'pm_id', 'Cédula / RIF')}
                    >
                      {copiedKey === 'pm_id' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiada!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Titular:</span>
                    <span className="font-medium text-foreground">{accounts?.pago_movil.account_holder || 'AutoSpa Caracas C.A.'}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-border/70 pt-2 bg-primary/5 p-2 rounded-lg">
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[11px]">Monto exacto en Bs:</span>
                      <span className="font-mono font-bold text-primary text-base">{formatCurrency(totalVes, 'VES')}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-primary/40 transition-all cursor-pointer",
                        copiedKey === 'pm_amount' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-primary/10 text-primary"
                      )}
                      onClick={() => copyToClipboard(cleanAmountBs, 'pm_amount', 'Monto en Bs')}
                    >
                      {copiedKey === 'pm_amount' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Monto</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground/80 italic pt-1 text-center">
                    💡 Al presionar Copiar se copia el número limpio sin guiones, listo para pegar en tu banco.
                  </p>
                </div>
              );
            })()}
          </TabsContent>

          {/* TAB 2: ZELLE */}
          <TabsContent value="zelle" className="mt-3 space-y-3">
            {(() => {
              const zelleEmail = accounts?.zelle.email || 'pagos@autospa.com.ve';
              const cleanAmountUsd = totalUsd.toFixed(2);

              return (
                <div className="bg-muted/40 p-3.5 rounded-xl border text-xs space-y-2.5">
                  <div className="flex justify-between items-center py-1">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">Correo Zelle:</span>
                      <span className="font-mono font-bold text-purple-400 text-sm">{zelleEmail}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-purple-500/30 transition-all cursor-pointer",
                        copiedKey === 'zelle_email' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-purple-500/10 text-purple-400"
                      )}
                      onClick={() => copyToClipboard(zelleEmail.trim(), 'zelle_email', 'Correo Zelle')}
                    >
                      {copiedKey === 'zelle_email' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Titular de la cuenta:</span>
                    <span className="font-medium text-foreground">{accounts?.zelle.account_holder || 'AutoSpa Services LLC'}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-border/70 pt-2 bg-purple-500/5 p-2 rounded-lg">
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[11px]">Monto exacto en USD:</span>
                      <span className="font-mono font-bold text-primary text-base">{formatCurrency(totalUsd, 'USD')}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-purple-500/30 transition-all cursor-pointer",
                        copiedKey === 'zelle_amount' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-purple-500/10 text-purple-400"
                      )}
                      onClick={() => copyToClipboard(cleanAmountUsd, 'zelle_amount', 'Monto USD')}
                    >
                      {copiedKey === 'zelle_amount' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Monto</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* TAB 3: TRANSFERENCIA */}
          <TabsContent value="transferencia" className="mt-3 space-y-3">
            {(() => {
              const rawAccountNum = accounts?.bank_transfer.account_number || '0134-0012-34-1234567890';
              const cleanAccountNum = rawAccountNum.replace(/\D/g, ''); // solo 20 dígitos para transferencias
              const rawRif = accounts?.bank_transfer.id_doc || 'J-50123456-7';
              const cleanRif = rawRif.replace(/[\s-]/g, ''); // formato limpio de RIF
              const cleanAmountBs = totalVes.toFixed(2);

              return (
                <div className="bg-muted/40 p-3.5 rounded-xl border text-xs space-y-2.5">
                  <div className="flex justify-between items-center py-1">
                    <span className="text-muted-foreground font-medium">Banco Receptor:</span>
                    <span className="font-semibold text-foreground">{accounts?.bank_transfer.bank || 'Banesco Banco Universal'}</span>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">N° de Cuenta:</span>
                      <span className="font-mono font-bold text-foreground text-xs">{rawAccountNum}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-blue-500/30 transition-all cursor-pointer",
                        copiedKey === 'bt_num' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-blue-500/10 text-blue-400"
                      )}
                      onClick={() => copyToClipboard(cleanAccountNum, 'bt_num', 'Número de Cuenta')}
                    >
                      {copiedKey === 'bt_num' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <div>
                      <span className="text-muted-foreground block text-[11px]">RIF de la Empresa:</span>
                      <span className="font-mono font-bold text-foreground text-sm">{rawRif}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-blue-500/30 transition-all cursor-pointer",
                        copiedKey === 'bt_rif' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-blue-500/10 text-blue-400"
                      )}
                      onClick={() => copyToClipboard(cleanRif, 'bt_rif', 'RIF')}
                    >
                      {copiedKey === 'bt_rif' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar</span>
                        </>
                      )}
                    </Button>
                  </div>

                  <div className="flex justify-between items-center py-1 border-t border-border/50">
                    <span className="text-muted-foreground font-medium">Titular:</span>
                    <span className="font-medium text-foreground">{accounts?.bank_transfer.account_holder || 'AutoSpa Caracas C.A.'}</span>
                  </div>

                  <div className="flex justify-between items-center border-t border-border/70 pt-2 bg-blue-500/5 p-2 rounded-lg">
                    <div>
                      <span className="text-muted-foreground font-semibold block text-[11px]">Monto exacto en Bs:</span>
                      <span className="font-mono font-bold text-primary text-base">{formatCurrency(totalVes, 'VES')}</span>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className={cn(
                        "h-8 px-2.5 text-xs gap-1 border-blue-500/30 transition-all cursor-pointer",
                        copiedKey === 'bt_amount' ? "bg-emerald-500/10 border-emerald-500 text-emerald-600 dark:text-emerald-400" : "hover:bg-blue-500/10 text-blue-400"
                      )}
                      onClick={() => copyToClipboard(cleanAmountBs, 'bt_amount', 'Monto en Bs')}
                    >
                      {copiedKey === 'bt_amount' ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" />
                          <span className="font-semibold">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>Copiar Monto</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })()}
          </TabsContent>

          {/* TAB 4: EFECTIVO */}
          <TabsContent value="efectivo_usd" className="mt-3 space-y-3">
            <div className="bg-emerald-500/5 border border-emerald-500/20 p-3.5 rounded-xl text-xs space-y-2">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Banknote className="h-4 w-4" /> Pago en Efectivo al Recibir el Servicio
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Paga directamente al técnico especialista cuando arribe a tu ubicación. Aceptamos dólares en efectivo en buen estado (sin roturas ni rayones) o bolívares en efectivo.
              </p>
              <p className="text-[11px] text-muted-foreground font-medium pt-1">
                Al confirmar esta opción, tu orden se notificará a la administración para la asignación inmediata de tu técnico.
              </p>
            </div>
          </TabsContent>
        </Tabs>

        {/* Formulario de Reporte */}
        <form onSubmit={handleReportPayment} className="space-y-3 pt-1">
          {errorMessage && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-destructive/10 text-destructive text-xs">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {selectedMethod !== 'efectivo_usd' && selectedMethod !== 'efectivo_ves' ? (
            <div className="grid grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <Label htmlFor="pay_reference" className="text-xs">
                  N° de Referencia <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="pay_reference"
                  placeholder="Ej. 184920"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  className="h-10 text-sm font-mono"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pay_bank" className="text-xs">
                  Banco Emisor
                </Label>
                <Input
                  id="pay_bank"
                  placeholder="Ej. Banesco, BDV..."
                  value={bank}
                  onChange={(e) => setBank(e.target.value)}
                  className="h-10 text-sm"
                />
              </div>
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full h-11 text-sm font-semibold shadow-md"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              'Enviando reporte...'
            ) : selectedMethod === 'efectivo_usd' || selectedMethod === 'efectivo_ves' ? (
              '💵 Confirmar Pago en Efectivo al Técnico'
            ) : (
              '💳 Reportar Pago al Administrador'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
