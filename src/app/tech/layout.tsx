"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { BottomNav } from "@/components/shared/bottom-nav";

export default function TechnicianLayout({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login");
      } else if (user?.role !== "technician") {
        router.push("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading || !isAuthenticated || user?.role !== "technician") {
    return null;
  }

  return (
    <div className="min-h-dvh flex flex-col bg-background text-foreground">
      <main className="flex-1 pb-20">
        {children}
      </main>
      <BottomNav role="technician" />
    </div>
  );
}
