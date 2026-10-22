'use client';

import React, { useState, useEffect } from 'react';
import { Clock, AlertTriangle, Zap, Calendar, Timer } from 'lucide-react';
import { getBookingTimeStatus, BookingTimeStatus } from '@/lib/utils';
import { cn } from '@/lib/utils';

interface TimeRemainingBadgeProps {
  booking?: {
    scheduled_date?: string;
    scheduled_time_slot?: string;
    status?: string;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  showCountdown?: boolean; // Permite alternar entre texto descriptivo y cuenta regresiva activa
}

export function TimeRemainingBadge({
  booking,
  className,
  size = 'md',
  showIcon = true,
  showCountdown = true,
}: TimeRemainingBadgeProps) {
  // Estado local para refrescar la cuenta regresiva segundo a segundo
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!booking?.scheduled_date) return;
    // Si la orden ya terminó o está cancelada, no gastamos ciclos de reloj
    if (['completed', 'cancelled', 'invoiced', 'closed'].includes(booking.status || '')) return;

    const interval = setInterval(() => {
      setTick((prev) => (prev + 1) % 1000000);
    }, 1000);

    return () => clearInterval(interval);
  }, [booking?.scheduled_date, booking?.status]);

  if (!booking?.scheduled_date) return null;

  const status: BookingTimeStatus = getBookingTimeStatus(booking);

  // Si ya terminó o está cancelada, no mostramos badge de tiempo restante
  if (status.isCompletedOrCancelled) {
    return null;
  }

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-bold',
  };

  const iconSizes = {
    sm: 11,
    md: 13,
    lg: 16,
  };

  // Texto preferido si showCountdown está activo y hay countdown disponible
  const displayText = showCountdown && status.countdown?.label 
    ? status.countdown.label 
    : status.timeRemainingText;

  // 1. Caso VENCIDA / RETRASADA
  if (status.isOverdue) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-extrabold rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 animate-pulse shadow-sm font-mono',
          sizeClasses[size],
          className
        )}
        title={`Vencida: ${status.timeRemainingText}`}
      >
        {showIcon && <AlertTriangle size={iconSizes[size]} className="shrink-0 text-rose-500" />}
        <span>{status.timeRemainingText}</span>
      </span>
    );
  }

  // 2. Caso EN CURSO (Turno activo)
  if (status.isInProgress) {
    return (
      <span
        className={cn(
          'inline-flex items-center font-bold rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shadow-sm font-mono',
          sizeClasses[size],
          className
        )}
        title="El turno se encuentra activo en este momento"
      >
        {showIcon && <Zap size={iconSizes[size]} className="shrink-0 text-emerald-500 animate-bounce" />}
        <span>{showCountdown && status.countdown?.label ? status.countdown.label : status.timeRemainingText}</span>
      </span>
    );
  }

  // 3. Caso PRÓXIMA A INICIAR (Faltan menos de 2 horas)
  if (status.urgencyLevel === 'soon') {
    return (
      <span
        className={cn(
          'inline-flex items-center font-extrabold rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shadow-sm font-mono',
          sizeClasses[size],
          className
        )}
        title="Cuenta regresiva de inicio de turno"
      >
        {showIcon && <Timer size={iconSizes[size]} className="shrink-0 text-amber-500 animate-pulse" />}
        <span>{status.countdown?.label ? `Inicia en ${status.countdown.label}` : status.timeRemainingText}</span>
      </span>
    );
  }

  // 4. Caso PROGRAMADA FUTURA (Cuenta regresiva activa)
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full bg-primary/10 text-primary border border-primary/25 font-mono',
        sizeClasses[size],
        className
      )}
      title="Tiempo restante para el inicio del servicio"
    >
      {showIcon && <Clock size={iconSizes[size]} className="shrink-0 text-primary" />}
      <span>{status.countdown?.label ? `Inicia en ${status.countdown.label}` : status.timeRemainingText}</span>
    </span>
  );
}
