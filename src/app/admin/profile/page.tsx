"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle } from "lucide-react";
import { getInitials } from "@/lib/utils";

export default function ProfilePage() {
  const { user, updateProfile } = useAuth();
  
  const [fullName, setFullName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const displayFullName = fullName !== null ? fullName : (user?.full_name || "");
  const displayPhone = phone !== null ? phone : (user?.phone || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const result = await updateProfile({
      full_name: displayFullName,
      phone: displayPhone
    });

    if (result.success) {
      setMessage({ type: 'success', text: 'Perfil actualizado exitosamente' });
    } else {
      setMessage({ type: 'error', text: result.error || 'Hubo un error al actualizar' });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-dvh bg-muted/30">
      <PageHeader title="Mi Perfil" backHref="/admin/more" />

      <div className="p-4 space-y-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center mb-6">
              <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#eecb52] to-[#d5ae33] text-[#0B0E11] font-extrabold text-2xl flex items-center justify-center mb-4 shadow-lg gold-glow">
                {getInitials(user?.full_name)}
              </div>
              <h2 className="text-xl font-semibold text-center">{user?.full_name || "Admin"}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="full_name">Nombre Completo</Label>
                <Input 
                  id="full_name" 
                  value={displayFullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ej. Carlos Rodríguez"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input 
                  id="phone" 
                  value={displayPhone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="Ej. +584141234567"
                />
              </div>

              {message && (
                <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${
                  message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-destructive/15 text-destructive'
                }`}>
                  {message.type === 'success' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
