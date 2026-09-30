import { BookingStatus } from '@/lib/types';
import { getStatusLabel, getStatusColor } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  FileEdit,
  CreditCard,
  CheckCircle,
  UserCheck,
  Navigation,
  MapPin,
  Loader,
  Search,
  CheckCircle2,
  FileText,
  Lock,
  XCircle,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';

interface StatusBadgeProps {
  status: BookingStatus;
  size?: 'sm' | 'md';
  className?: string;
}

const statusIcons: Record<BookingStatus, any> = {
  draft: FileEdit,
  pending_payment: CreditCard,
  confirmed: CheckCircle,
  assigned: UserCheck,
  en_route: Navigation,
  arrived: MapPin,
  in_progress: Loader,
  quality_check: Search,
  completed: CheckCircle2,
  invoiced: FileText,
  closed: Lock,
  cancelled: XCircle,
  rescheduled: RefreshCw,
  no_show: AlertTriangle,
};

export function StatusBadge({ status, size = 'md', className }: StatusBadgeProps) {
  const Icon = statusIcons[status];
  const label = getStatusLabel(status);
  const colorClass = getStatusColor(status);

  return (
    <Badge
      variant="outline"
      className={cn(
        "flex items-center gap-1.5 font-medium border-0",
        colorClass,
        size === 'sm' ? "text-[10px] px-2 py-0.5" : "text-xs px-2.5 py-1",
        className
      )}
    >
      <Icon className={cn(
        "flex-shrink-0",
        size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5",
        status === 'in_progress' && "animate-spin"
      )} />
      {label}
    </Badge>
  );
}
