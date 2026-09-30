"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Droplets, Mail, Lock, User, Phone, Calendar, Eye, EyeOff } from "lucide-react";

import { useAuth } from "@/lib/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const registerSchema = z.object({
  fullName: z.string().min(2, "Ingresa tu nombre completo"),
  email: z.string().email("Correo electrónico inválido"),
  phone: z.string().min(10, "Ingresa un número telefónico válido (+58...)"),
  birthDate: z.string().min(1, "Ingresa tu fecha de cumpleaños"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phone: "+58 ",
      birthDate: "",
      password: "",
    },
  });

  const onSubmit = async (data: RegisterFormValues) => {
    setIsLoading(true);
    setError(null);
    try {
      const cleanFullName = (data.fullName || "").trim().replace(/\s+/g, ' ');
      const cleanEmail = (data.email || "").trim().toLowerCase();
      const cleanPhone = (data.phone || "").trim();
      const cleanBirthDate = (data.birthDate || "").trim();

      const result = await signUp(cleanEmail, data.password, cleanFullName, cleanPhone, cleanBirthDate);
      if (result.success) {
        router.push("/client");
      } else {
        setError(result.error || "No se pudo completar el registro");
      }
    } catch (err: any) {
      setError(err.message || "Error al crear cuenta");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-sm border border-[#2B313A] bg-[#181A20] shadow-2xl">
        <CardHeader className="text-center space-y-1 pb-2">
          <div className="flex justify-center mb-1">
            <img 
              src="/logo.png" 
              alt="AutoSpa VZLA" 
              className="h-20 w-auto object-contain drop-shadow-[0_4px_16px_rgba(213,174,51,0.3)]" 
            />
          </div>
          <CardTitle className="text-xl font-bold text-white">Crear Cuenta</CardTitle>
          <CardDescription className="text-xs text-[#848E9C]">
            Regístrate para solicitar lavados a domicilio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-3.5" autoComplete="off">
            {error && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-lg">
                {error}
              </div>
            )}
            
            <div className="space-y-1.5">
              <Label htmlFor="fullName">Nombre Completo</Label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="fullName"
                  placeholder="Ej. Carlos Mendoza"
                  className="pl-9 h-11"
                  autoComplete="off"
                  {...form.register("fullName")}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@correo.com"
                  className="pl-9 h-11"
                  autoComplete="off"
                  {...form.register("email")}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">Teléfono (WhatsApp)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  placeholder="+58 412 1234567"
                  className="pl-9 h-11"
                  autoComplete="off"
                  {...form.register("phone")}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.phone && (
                <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="birthDate">Fecha de Cumpleaños</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="birthDate"
                  type="date"
                  className="pl-9 h-11"
                  max={new Date().toISOString().split("T")[0]}
                  {...form.register("birthDate")}
                  disabled={isLoading}
                />
              </div>
              {form.formState.errors.birthDate && (
                <p className="text-xs text-destructive">{form.formState.errors.birthDate.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9 pr-9 h-11"
                  autoComplete="new-password"
                  {...form.register("password")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground focus:outline-none"
                  tabIndex={-1}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full h-11 text-base mt-2" disabled={isLoading}>
              {isLoading ? "Creando cuenta..." : "Registrarme"}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm">
            <span className="text-muted-foreground">¿Ya tienes cuenta? </span>
            <Link href="/login" className="text-primary hover:underline font-medium">
              Inicia sesión
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

