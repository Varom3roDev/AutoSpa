"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  fetchAppNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  fetchNotificationSettings,
  updateNotificationSettings,
} from "@/lib/supabase/api";
import { formatDateTime } from "@/lib/utils";
import type { AppNotification, NotificationSettingsConfig, NotificationType } from "@/lib/types";
import {
  Bell,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Mail,
  Volume2,
  MessageSquare,
  Sparkles,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Save,
  Check,
} from "lucide-react";

export default function NotificationsAdminPage() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [settings, setSettings] = useState<NotificationSettingsConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>("all");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener("autospa_notifications_feed_updated", handleUpdate);
    window.addEventListener("autospa_notifications_settings_updated", handleUpdate);
    return () => {
      window.removeEventListener("autospa_notifications_feed_updated", handleUpdate);
      window.removeEventListener("autospa_notifications_settings_updated", handleUpdate);
    };
  }, []);

  async function loadData() {
    setIsLoading(true);
    const [notifsData, settsData] = await Promise.all([
      fetchAppNotifications(),
      fetchNotificationSettings(),
    ]);
    setNotifications(notifsData);
    setSettings(settsData);
    setIsLoading(false);
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === "all") return true;
    if (filterType === "unread") return !n.is_read;
    return n.type === filterType;
  });

  const handleMarkAsRead = async (id: string) => {
    await markNotificationAsRead(id);
    await loadData();
  };

  const handleMarkAllRead = async () => {
    await markAllNotificationsAsRead();
    await loadData();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      await updateNotificationSettings(settings);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case "booking":
        return <Calendar className="h-4 w-4 text-primary" />;
      case "payment":
        return <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "stock":
        return <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "tech":
        return <Smartphone className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
    }
  };

  const getNotificationBadge = (type: NotificationType) => {
    switch (type) {
      case "booking":
        return <Badge variant="outline" className="text-[10px] text-primary border-primary/30">Reserva</Badge>;
      case "payment":
        return <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">Pago</Badge>;
      case "stock":
        return <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-500/30">Inventario</Badge>;
      case "tech":
        return <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">Técnico</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">Sistema</Badge>;
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-12">
      <PageHeader
        title="Centro de Alertas y Notificaciones"
        action={
          unreadCount > 0 ? (
            <Button size="sm" variant="outline" className="gap-1 shadow-xs text-xs" onClick={handleMarkAllRead}>
              <CheckCircle2 className="h-4 w-4" />
              Marcar Todo Leído
            </Button>
          ) : undefined
        }
      />

      <Tabs defaultValue="feed" className="px-4 pt-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="feed" className="relative">
            Bandeja de Alertas
            {unreadCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                {unreadCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="config">
            Configurar Canales
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Live Notification Feed */}
        <TabsContent value="feed" className="space-y-3 mt-4">
          {/* Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <Button
              variant={filterType === "all" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full shrink-0"
              onClick={() => setFilterType("all")}
            >
              Todas ({notifications.length})
            </Button>
            <Button
              variant={filterType === "unread" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full shrink-0"
              onClick={() => setFilterType("unread")}
            >
              No Leídas ({unreadCount})
            </Button>
            <Button
              variant={filterType === "booking" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full shrink-0"
              onClick={() => setFilterType("booking")}
            >
              📅 Reservas
            </Button>
            <Button
              variant={filterType === "payment" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full shrink-0"
              onClick={() => setFilterType("payment")}
            >
              💵 Pagos
            </Button>
            <Button
              variant={filterType === "stock" ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full shrink-0"
              onClick={() => setFilterType("stock")}
            >
              ⚠️ Stock
            </Button>
          </div>

          {/* Feed List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-muted/40" />
                </Card>
              ))}
            </div>
          ) : filteredNotifs.length > 0 ? (
            filteredNotifs.map((notif) => (
              <Card
                key={notif.id}
                className={`overflow-hidden transition-all ${
                  !notif.is_read
                    ? "border-primary/40 bg-primary/5 shadow-2xs"
                    : "hover:shadow-xs"
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left Icon & Text */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="p-2 rounded-lg bg-background border shrink-0 mt-0.5">
                        {getNotificationIcon(notif.type)}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-sm leading-tight text-foreground">
                            {notif.title}
                          </h4>
                          {getNotificationBadge(notif.type)}
                          {!notif.is_read && (
                            <span className="w-2 h-2 rounded-full bg-primary" />
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                          {notif.message}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{formatDateTime(notif.created_at)}</span>
                          {notif.link && (
                            <Link
                              href={notif.link}
                              className="text-primary hover:underline font-semibold flex items-center gap-0.5"
                            >
                              Ver detalle <ArrowRight className="h-3 w-3" />
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right Mark as Read Button */}
                    {!notif.is_read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-foreground shrink-0"
                        onClick={() => handleMarkAsRead(notif.id)}
                        title="Marcar como leída"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center py-12 px-4 border rounded-xl bg-card">
              <Bell className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
              <p className="font-semibold text-base">Bandeja al día</p>
              <p className="text-xs text-muted-foreground mt-1">
                No tienes notificaciones pendientes con los filtros seleccionados.
              </p>
            </div>
          )}
        </TabsContent>

        {/* TAB 2: Channels Configuration & Templates */}
        <TabsContent value="config" className="space-y-4 mt-4">
          {settings && (
            <form onSubmit={handleSaveSettings} className="space-y-4">
              {/* WhatsApp Automation Settings */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Mensajería Automática por WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Envío automático de confirmaciones, llegada de técnicos y facturas a los clientes en Caracas.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="wa_phone">Número de WhatsApp Business Emisor</Label>
                    <Input
                      id="wa_phone"
                      value={settings.whatsapp_business_phone}
                      onChange={(e) =>
                        setSettings({ ...settings, whatsapp_business_phone: e.target.value })
                      }
                      placeholder="+58 416 6315114"
                    />
                  </div>

                  <div className="space-y-2.5 pt-2 border-t text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={settings.notify_on_new_booking}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_new_booking: e.target.checked })
                        }
                      />
                      <span>Confirmar reservas automáticamente al cliente vía WhatsApp</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={settings.notify_on_tech_en_route}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_tech_en_route: e.target.checked })
                        }
                      />
                      <span>Avisar cuando el técnico esté en camino a la ubicación</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={settings.notify_on_service_completed}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_service_completed: e.target.checked })
                        }
                      />
                      <span>Enviar aviso de servicio completado con recibo digital</span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Administrative Alerts */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-primary" /> Alertas para la Administración
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Alertas internas para el equipo de control de AutoSpa
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="admin_email">Correo de Notificaciones Administrativas</Label>
                    <Input
                      id="admin_email"
                      type="email"
                      value={settings.admin_notification_email}
                      onChange={(e) =>
                        setSettings({ ...settings, admin_notification_email: e.target.value })
                      }
                      placeholder="contacto@autospa.com.ve"
                    />
                  </div>

                  <div className="space-y-2.5 pt-2 border-t text-sm">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={settings.notify_on_payment_pending}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_payment_pending: e.target.checked })
                        }
                      />
                      <span>Alerta inmediata al reportarse un nuevo pago móvil o transferencia</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={settings.notify_on_low_stock}
                        onChange={(e) =>
                          setSettings({ ...settings, notify_on_low_stock: e.target.checked })
                        }
                      />
                      <span>Aviso de stock mínimo de químicos o insumos de lavado</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                        checked={settings.sound_alerts_enabled}
                        onChange={(e) =>
                          setSettings({ ...settings, sound_alerts_enabled: e.target.checked })
                        }
                      />
                      <span className="flex items-center gap-1">
                        <Volume2 className="h-4 w-4 text-muted-foreground" />
                        Activar alertas sonoras en el panel de administración
                      </span>
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* Message Templates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Plantillas de Mensajes WhatsApp
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Variables dinámicas disponibles: &#123;nombre&#125;, &#123;servicio&#125;, &#123;codigo&#125;, &#123;fecha&#125;, &#123;hora&#125;, &#123;tecnico&#125;, &#123;direccion&#125;.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="tpl_confirmed" className="text-xs font-semibold">
                      Plantilla: Reserva Confirmada
                    </Label>
                    <Textarea
                      id="tpl_confirmed"
                      rows={3}
                      value={settings.templates.booking_confirmed}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          templates: { ...settings.templates, booking_confirmed: e.target.value },
                        })
                      }
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="tpl_enroute" className="text-xs font-semibold">
                      Plantilla: Técnico en Camino
                    </Label>
                    <Textarea
                      id="tpl_enroute"
                      rows={3}
                      value={settings.templates.tech_en_route}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          templates: { ...settings.templates, tech_en_route: e.target.value },
                        })
                      }
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex items-center justify-between pt-2">
                {saveSuccess ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Check className="h-4 w-4" /> Configuración guardada correctamente
                  </span>
                ) : (
                  <span />
                )}
                <Button type="submit" disabled={isSaving} className="gap-1">
                  <Save className="h-4 w-4" />
                  {isSaving ? "Guardando..." : "Guardar Configuración"}
                </Button>
              </div>
            </form>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
