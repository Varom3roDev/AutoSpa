"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const loginSchema = z.object({
  email: z.string().email("Correo electrónico inválido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await login(data.email, data.password);
      if (result.success) {
        let dest = "/client";
        if (result.role === "technician") {
          dest = "/tech/agenda";
        } else if (result.role === "admin" || result.role === "superadmin") {
          dest = "/admin/dashboard";
        }
        window.location.href = dest;
      } else {
        setError(result.error || "Credenciales no encontradas");
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Credenciales inválidas");
      setIsLoading(false);
    }
  };

  const onInvalid = (formErrors: any) => {
    if (formErrors.email) {
      setError(formErrors.email.message || "Por favor ingresa un correo válido");
    } else if (formErrors.password) {
      setError(formErrors.password.message || "Por favor ingresa tu contraseña");
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border border-[#2B313A] bg-[#181A20] shadow-2xl">
        <CardHeader className="text-center space-y-1 pb-4">
          <div className="flex justify-center mb-1">
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-24 w-auto object-contain drop-shadow-[0_4px_16px_rgba(213,174,51,0.3)]" 
            />
          </div>
          <CardDescription className="text-xs text-[#848E9C]">
            Lavado profesional a domicilio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} className="space-y-4">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="pl-10 h-12"
                  autoCapitalize="none"
                  autoCorrect="off"
                  {...form.register("email")}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3.5 h-5 w-5 text-muted-foreground pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="pl-10 pr-12 h-12"
                  {...form.register("password")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowPassword((prev) => !prev);
                  }}
                  className="absolute right-1 top-1 h-10 w-10 z-10 flex items-center justify-center text-muted-foreground hover:text-foreground active:scale-90 transition-transform cursor-pointer focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 pointer-events-none" />
                  ) : (
                    <Eye className="h-5 w-5 pointer-events-none" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-12 text-lg cursor-pointer font-bold" disabled={isLoading}>
              {isLoading ? "Iniciando..." : "Iniciar Sesión"}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm">
            <span className="text-muted-foreground">¿No tienes cuenta? </span>
            <Link href="/register" className="text-primary hover:underline font-medium">
              Regístrate
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

