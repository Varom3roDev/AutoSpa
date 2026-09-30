"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { getInitials } from "@/lib/utils";
import {
  Wrench,
  Users,
  MapPin,
  Settings,
  CreditCard,
  BarChart3,
  Package,
  Bell,
  LogOut,
  ChevronRight,
  Palette,
} from "lucide-react";

const menuItems = [
  {
    label: "Servicios y Precios",
    href: "/admin/services",
    icon: Wrench,
    description: "Gestiona tu catálogo",
  },
  {
    label: "Técnicos",
    href: "/admin/technicians",
    icon: Users,
    description: "Personal y cuadrillas",
  },
  {
    label: "Zonas de Cobertura",
    href: "/admin/zones",
    icon: MapPin,
    description: "Áreas de servicio",
  },
  {
    label: "Pagos y Caja",
    href: "/admin/payments",
    icon: CreditCard,
    description: "Control financiero",
  },
  {
    label: "Reportes",
    href: "/admin/reports",
    icon: BarChart3,
    description: "Métricas y estadísticas",
  },
  {
    label: "Inventario",
    href: "/admin/inventory",
    icon: Package,
    description: "Insumos y stock",
  },
  {
    label: "Notificaciones",
    href: "/admin/notifications",
    icon: Bell,
    description: "Configurar alertas",
  },
  {
    label: "Configuración",
    href: "/admin/settings",
    icon: Settings,
    description: "Horarios, políticas, empresa",
  },
];

export default function MorePage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-dvh bg-background">
      <PageHeader 
        title="Más opciones" 
        action={<img src="/logo.png" alt="AutoSpa VZLA" className="h-11 md:h-12 w-auto object-contain drop-shadow-[0_2px_12px_rgba(213,174,51,0.35)]" />}
      />

      {/* User info */}
      <div className="px-4 pt-4">
        <Link href="/admin/profile">
          <Card className="hover:bg-muted/50 border border-[#2B313A] hover:border-[#d5ae33]/40 transition-colors active:bg-muted cursor-pointer shadow-md">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-[#eecb52] to-[#d5ae33] text-[#0B0E11] font-extrabold text-base flex items-center justify-center shrink-0 shadow-md">
                {getInitials(user?.full_name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{user?.full_name || "Admin"}</p>
                <p className="text-sm text-muted-foreground">Administrador</p>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/50 shrink-0" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Menu items */}
      <div className="px-4 pt-4 space-y-1">
        {menuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-muted/50 active:bg-muted transition-colors">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{item.label}</p>
                <p className="text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </Link>
        ))}
      </div>

      <Separator className="my-4 mx-4" />

      {/* Logout */}
      <div className="px-4 pb-24">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-3 rounded-lg hover:bg-destructive/10 active:bg-destructive/20 transition-colors w-full text-left"
        >
          <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
            <LogOut className="h-4 w-4 text-destructive" />
          </div>
          <span className="font-medium text-sm text-destructive">
            Cerrar Sesión
          </span>
        </button>
      </div>
    </div>
  );
}

