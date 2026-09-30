'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  Home,
  CalendarPlus,
  ClipboardList,
  Car,
  User,
  Calendar,
  Wrench,
  History,
  LayoutDashboard,
  Users,
  MoreHorizontal
} from 'lucide-react';

type Role = 'client' | 'technician' | 'admin';

interface BottomNavProps {
  role: Role;
}

export function BottomNav({ role }: BottomNavProps) {
  const pathname = usePathname();

  const navItems = {
    client: [
      { label: 'Inicio', icon: Home, href: '/client' },
      { label: 'Reservar', icon: CalendarPlus, href: '/client/booking' },
      { label: 'Mis Reservas', icon: ClipboardList, href: '/client/reservations' },
      { label: 'Vehículos', icon: Car, href: '/client/vehicles' },
      { label: 'Perfil', icon: User, href: '/client/profile' }
    ],
    technician: [
      { label: 'Agenda', icon: Calendar, href: '/tech/agenda' },
      { label: 'Orden Actual', icon: Wrench, href: '/tech/current' },
      { label: 'Historial', icon: History, href: '/tech/history' },
      { label: 'Perfil', icon: User, href: '/tech/profile' }
    ],
    admin: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/admin/dashboard' },
      { label: 'Agenda', icon: Calendar, href: '/admin/agenda' },
      { label: 'Órdenes', icon: ClipboardList, href: '/admin/orders' },
      { label: 'Clientes', icon: Users, href: '/admin/clients' },
      { label: 'Más', icon: MoreHorizontal, href: '/admin/more' }
    ]
  };

  const items = navItems[role];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0B0E11]/95 backdrop-blur-md border-t border-[#2B313A] shadow-2xl pb-safe">
      <div className="flex items-center justify-around h-16 md:h-20 max-w-md mx-auto md:max-w-none px-2">
        {items.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(`${item.href}/`);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full min-w-[48px] px-1 touch-manipulation transition-colors",
                isActive ? "text-primary" : "text-muted-foreground hover:text-primary/80"
              )}
            >
              <Icon className={cn("w-6 h-6 mb-1 md:w-7 md:h-7", isActive && "stroke-[2.5px]")} />
              <span className={cn(
                "text-[10px] md:text-xs font-medium text-center truncate w-full",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
