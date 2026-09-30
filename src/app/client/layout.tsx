"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { BottomNav } from "@/components/shared/bottom-nav";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "client") {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== "client") {
    return null;
  }

  const isBookingFlow = pathname?.startsWith("/client/booking");
  const isReservationDetail = pathname?.startsWith("/client/reservations/") && pathname !== "/client/reservations";
  const hideBottomNav = isBookingFlow || isReservationDetail;

  return (
    <div className="min-h-dvh flex flex-col bg-gray-50 dark:bg-gray-900">
      <main className={`flex-1 ${hideBottomNav ? "" : "pb-20"}`}>
        {children}
      </main>
      {!hideBottomNav && <BottomNav role="client" />}
    </div>
  );
}
