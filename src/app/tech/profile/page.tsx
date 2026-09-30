"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { getInitials } from "@/lib/utils";
import { LogOut, CheckCircle2, AlertCircle, Wrench, Shield, Phone, Mail } from "lucide-react";

export default function TechnicianProfilePage() {
  const { user, updateProfile, logout } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState<string | null>(null);
  const [phone, setPhone] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const displayFullName = fullName !== null ? fullName : (user?.full_name || "");
  const displayPhone = phone !== null ? phone : (user?.phone || "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const result = await updateProfile({
      full_name: displayFullName,
      phone: displayPhone,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Datos actualizados exitosamente" });
    } else {
      setMessage({ type: "error", text: result.error || "Error al actualizar perfil" });
    }

    setIsLoading(false);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      router.push("/login");
    } catch (err) {
      console.error("Error logging out:", err);
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background pb-28">
      <PageHeader 
        title="Mi Perfil" 
        backHref="/tech/agenda" 
        action={
          <img 
            src="/logo.png" 
            alt="AutoSpa VZLA" 
            className="h-10 md:h-12 w-auto object-contain drop-shadow-[0_2px_10px_rgba(213,174,51,0.35)]" 
          />
        }
      />

      <main className="p-4 max-w-lg mx-auto space-y-4">
        {/* Header Profile Badge */}
        <Card className="border border-[#2B313A] bg-[#181A20] shadow-md relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#d5ae33]/60 to-transparent" />
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-12 w-auto object-contain mb-3 drop-shadow-[0_2px_10px_rgba(213,174,51,0.35)]" 
            />
            <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-[#eecb52] to-[#d5ae33] text-[#0B0E11] font-extrabold text-2xl flex items-center justify-center mb-3 shadow-lg gold-glow">
              {getInitials(user?.full_name)}
            </div>
            <h2 className="text-xl font-bold text-white leading-tight">
              {user?.full_name || "Técnico AutoSpa"}
            </h2>
            <p className="text-xs text-[#848E9C] mt-1">{user?.email}</p>
            <div className="mt-3">
              <Badge className="bg-[#d5ae33]/15 text-[#d5ae33] border border-[#d5ae33]/30 px-3 py-1 font-semibold text-xs flex items-center gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Técnico Oficial AutoSpa
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Edit Info Form */}
        <Card className="border border-[#2B313A] bg-[#181A20] shadow-md">
          <CardContent className="pt-6">
            <h3 className="font-bold text-sm text-white mb-4 flex items-center gap-2">
              <Shield className="h-4 w-4 text-[#d5ae33]" />
              Información de Contacto
            </h3>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="full_name" className="text-xs text-[#848E9C]">Nombre Completo</Label>
                <Input
                  id="full_name"
                  value={displayFullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Tu nombre completo"
                  className="bg-[#0B0E11] border-[#2B313A] text-white"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs text-[#848E9C]">Teléfono de Contacto</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-2.5 h-4 w-4 text-[#848E9C]" />
                  <Input
                    id="phone"
                    value={displayPhone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+58 414..."
                    className="pl-9 bg-[#0B0E11] border-[#2B313A] text-white"
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`p-3 rounded-lg flex items-center gap-2 text-xs ${
                    message.type === "success"
                      ? "bg-[#0ECB81]/15 text-[#0ECB81] border border-[#0ECB81]/30"
                      : "bg-destructive/15 text-destructive border border-destructive/30"
                  }`}
                >
                  {message.type === "success" ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 shrink-0" />
                  )}
                  {message.text}
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#d5ae33] text-[#0B0E11] hover:bg-[#b89325] font-bold"
              >
                {isLoading ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Logout Section */}
        <Card className="border border-destructive/20 bg-destructive/5 shadow-md">
          <CardContent className="p-4 space-y-3">
            <div>
              <h4 className="font-bold text-sm text-white">Sesión Activa</h4>
              <p className="text-xs text-[#848E9C]">
                Cierra la sesión para cambiar de usuario o salir del sistema.
              </p>
            </div>
            <Button
              variant="destructive"
              disabled={isLoggingOut}
              onClick={handleLogout}
              className="w-full h-11 gap-2 font-semibold shadow-sm"
            >
              <LogOut className="h-4 w-4" />
              {isLoggingOut ? "Cerrando Sesión..." : "Cerrar Sesión"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
