import { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: ReactNode;
  backHref?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, backHref, action, className }: PageHeaderProps) {
  return (
    <header className={cn(
      "sticky top-0 z-40 flex items-center justify-between px-4 py-3 bg-[#0B0E11]/85 backdrop-blur-md border-b border-[#2B313A]",
      className
    )}>
      <div className="flex items-center gap-3 overflow-hidden">
        {backHref && (
          <Link
            href={backHref}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-muted text-foreground touch-manipulation"
          >
            <ChevronLeft className="w-6 h-6" />
          </Link>
        )}
        <div className="flex flex-col min-w-0">
          <h1 className="text-lg font-semibold truncate text-foreground leading-tight">
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground truncate leading-tight">
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {action && (
        <div className="flex-shrink-0 ml-4">
          {action}
        </div>
      )}
    </header>
  );
}
