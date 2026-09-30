"use client";

import { useState, useEffect } from "react";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { fetchAppSettings, updateAppSettings } from "@/lib/supabase/api";
import { playAudioChime, cn } from "@/lib/utils";
import type { AppSettings } from "@/lib/types";
import {
  DollarSign,
  Megaphone,
  Phone,
  Save,
  CheckCircle2,
  AlertCircle,
  Droplets,
  Sparkles,
} from "lucide-react";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AppSettings>({
    id: "default",
    bcv_exchange_rate: 36.5,
    home_banner_title: "Lavado ecológico y premium",
    home_banner_text: "Ahorramos hasta 200L de agua por servicio en Caracas",
    support_whatsapp: "+58 416 6315114",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      const data = await fetchAppSettings();
      setSettings(data);
      setIsLoading(false);
    }
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);

    try {
      const rawRate = String(settings.bcv_exchange_rate).replace(',', '.');
      const parsedRate = parseFloat(rawRate) || 36.5;

      const updated = await updateAppSettings({
        bcv_exchange_rate: parsedRate,
        home_banner_title: (settings.home_banner_title || "").trim(),
        home_banner_text: (settings.home_banner_text || "").trim(),
        support_whatsapp: (settings.support_whatsapp || "").trim(),
      });
      setSettings(updated);
      setSaveSuccess(true);
      playAudioChime('subtle');
      setTimeout(() => setSaveSuccess(false), 4500);
    } catch (err: any) {
      setSaveError("Error al guardar la configuración.");
    } finally {
      setIsSaving(false);
    }
  };

  const rateNum = typeof settings.bcv_exchange_rate === 'string' 
    ? (parseFloat(String(settings.bcv_exchange_rate).replace(',', '.')) || 0) 
    : Number(settings.bcv_exchange_rate || 0);

  const sampleUSD = 25;
  const sampleVES = (sampleUSD * rateNum).toLocaleString("es-VE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader 
        title="Configuración General" 
        action={
          <Button
            type="submit"
            form="admin-settings-form"
            size="sm"
            className="gap-1.5 shadow-xs bg-primary text-black font-semibold hover:bg-primary/90 cursor-pointer h-9 px-3"
            disabled={isLoading || isSaving}
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? "Guardando..." : "Guardar"}</span>
          </Button>
        }
      />

      {/* Toast Flotante Superior Inmediato */}
      {saveSuccess && (
        <div className="fixed top-16 left-4 right-4 z-50 max-w-md mx-auto p-3 bg-emerald-600 text-white rounded-xl shadow-2xl flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <span className="text-xs font-semibold">Configuración guardada y sincronizada en tiempo real.</span>
          </div>
          <button 
            type="button" 
            onClick={() => setSaveSuccess(false)} 
            className="text-white/80 hover:text-white text-xs px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      <form id="admin-settings-form" onSubmit={handleSave} className="p-4 space-y-6 max-w-xl mx-auto pb-32">
        {/* Feedback alert */}
        {saveSuccess && (
          <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>Configuración guardada y actualizada en tiempo real para todos los usuarios.</span>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <span>{saveError}</span>
          </div>
        )}

        {/* BCV Exchange Rate */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-primary/10 text-primary">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Tasa de Cambio BCV</CardTitle>
                  <CardDescription className="text-xs">
                    Conversión automática de montos en dólares a Bolívares (VES)
                  </CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="font-mono">
                Bs. / USD
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bcv_rate">Tasa oficial BCV (Bs. por cada $1)</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  Bs.
                </span>
                <Input
                  id="bcv_rate"
                  type="text"
                  inputMode="decimal"
                  required
                  disabled={isLoading}
                  value={settings.bcv_exchange_rate}
                  onChange={(e) =>
                    setSettings({ ...settings, bcv_exchange_rate: e.target.value as any })
                  }
                  className="pl-11 text-base font-semibold"
                  placeholder="36.50"
                />
              </div>
            </div>

            {/* Live conversion sample */}
            <div className="p-3 bg-muted/50 rounded-lg border text-xs space-y-1">
              <span className="text-muted-foreground font-medium">Ejemplo de conversión en reservas:</span>
              <p className="font-semibold text-foreground">
                ${sampleUSD}.00 USD = <span className="text-primary font-bold">Bs. {sampleVES}</span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Promotional / Announcement Banner */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-primary/10 text-primary">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">Banner Promocional / Informativo</CardTitle>
                <CardDescription className="text-xs">
                  Texto visible en la pantalla de inicio de los clientes
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="banner_title">Título del Banner</Label>
              <Input
                id="banner_title"
                required
                disabled={isLoading}
                value={settings.home_banner_title}
                onChange={(e) =>
                  setSettings({ ...settings, home_banner_title: e.target.value })
                }
                placeholder="Ej. Lavado ecológico y premium"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="banner_text">Descripción / Mensaje</Label>
              <Textarea
                id="banner_text"
                rows={2}
                required
                disabled={isLoading}
                value={settings.home_banner_text}
                onChange={(e) =>
                  setSettings({ ...settings, home_banner_text: e.target.value })
                }
                placeholder="Ej. Ahorramos hasta 200L de agua por servicio en Caracas"
              />
            </div>

            {/* Live preview */}
            <div className="space-y-1.5 pt-1">
              <Label className="text-xs text-muted-foreground">Vista previa para el cliente:</Label>
              <div className="border rounded-lg p-3 bg-card flex items-center gap-3 shadow-xs">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Droplets className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {settings.home_banner_title || "Título del banner"}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {settings.home_banner_text || "Mensaje del banner"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Support Phone */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-md bg-emerald-500/10 text-emerald-600">
                <Phone className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base">WhatsApp de Soporte</CardTitle>
                <CardDescription className="text-xs">
                  Número receptor de consultas y pagos móviles
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="support_phone">Número de contacto (con código de país)</Label>
              <Input
                id="support_phone"
                required
                disabled={isLoading}
                value={settings.support_whatsapp}
                onChange={(e) =>
                  setSettings({ ...settings, support_whatsapp: e.target.value })
                }
                placeholder="+58 416 6315114"
              />
            </div>
          </CardContent>
        </Card>

        {/* Save button in-flow with proper clearance above BottomNav */}
        <div className="pt-2 pb-16">
          <Button
            type="submit"
            className={cn(
              "w-full gap-2 shadow-lg h-12 text-sm font-semibold cursor-pointer transition-all",
              saveSuccess 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white" 
                : "bg-primary text-black hover:bg-primary/90"
            )}
            size="lg"
            disabled={isLoading || isSaving}
          >
            {saveSuccess ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                <span>¡Guardado con Éxito!</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>{isSaving ? "Guardando cambios..." : "Guardar Configuración"}</span>
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
