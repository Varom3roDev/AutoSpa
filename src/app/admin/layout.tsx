"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { BottomNav } from "@/components/shared/bottom-nav";
import { AdminGlobalAlert } from "@/components/shared/admin-global-alert";
import { NotificationPermissionPrompt } from "@/components/shared/notification-permission-prompt";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "admin" && user?.role !== "superadmin") {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated || (user?.role !== "admin" && user?.role !== "superadmin")) {
    return null;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <AdminGlobalAlert />
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav role="admin" />
      <NotificationPermissionPrompt role="admin" />
    </div>
  );
}
