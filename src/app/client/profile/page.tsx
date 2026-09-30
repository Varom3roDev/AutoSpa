"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  fetchCustomerAddresses,
  insertCustomerAddress,
  updateCustomerAddress,
  deleteCustomerAddress,
  setDefaultCustomerAddress,
} from "@/lib/supabase/api";
import type { CustomerAddress } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";
import { getInitials } from "@/lib/utils";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  CreditCard,
  Bell,
  Shield,
  LogOut,
  ChevronRight,
  Edit,
  Plus,
  Trash2,
  CheckCircle2,
  Eye,
  EyeOff,
  Building,
  Smartphone,
  Banknote,
  Lock,
} from "lucide-react";

export default function ProfilePage() {
  const { user, logout, updateProfile } = useAuth();
  const router = useRouter();
  const supabase = createClient();

  // State for addresses
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Dialog States
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isPaymentMethodsOpen, setIsPaymentMethodsOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSecurityOpen, setIsSecurityOpen] = useState(false);

  // Form states for Edit Profile
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBirthDate, setEditBirthDate] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Form states for Add Address
  const [addrLabel, setAddrLabel] = useState("Casa");
  const [addrLine, setAddrLine] = useState("");
  const [addrMunicipality, setAddrMunicipality] = useState("Chacao");
  const [addrReference, setAddrReference] = useState("");
  const [addrIsDefault, setAddrIsDefault] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  // Form states for Edit Address
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [editAddrLabel, setEditAddrLabel] = useState("Casa");
  const [editAddrLine, setEditAddrLine] = useState("");
  const [editAddrMunicipality, setEditAddrMunicipality] = useState("Chacao");
  const [editAddrReference, setEditAddrReference] = useState("");
  const [editAddrIsDefault, setEditAddrIsDefault] = useState(false);
  const [isUpdatingAddress, setIsUpdatingAddress] = useState(false);

  // Form states for Notifications
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPromo, setNotifPromo] = useState(false);
  const [notifSavedMessage, setNotifSavedMessage] = useState(false);

  // Form states for Security (Change Password)
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showSecPassword, setShowSecPassword] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<{ text: string; isError: boolean } | null>(null);

  // Load addresses
  useEffect(() => {
    async function loadData() {
      if (user?.id) {
        setIsLoadingAddresses(true);
        const data = await fetchCustomerAddresses(user.id);
        setAddresses(data);
        setIsLoadingAddresses(false);
      }
    }
    loadData();
  }, [user?.id]);

  // Set initial edit profile values when opening dialog
  const handleOpenEditProfile = () => {
    if (user) {
      setEditFullName(user.full_name || "");
      setEditPhone(user.phone || "");
      setEditBirthDate(user.birth_date || "");
      setProfileMessage(null);
      setIsEditProfileOpen(true);
    }
  };

  // Save profile updates
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMessage(null);

    const res = await updateProfile({
      full_name: editFullName.trim(),
      phone: editPhone.trim(),
      birth_date: editBirthDate,
    });

    setIsSavingProfile(false);
    if (res.success) {
      setProfileMessage("Perfil actualizado exitosamente");
      setTimeout(() => {
        setIsEditProfileOpen(false);
        setProfileMessage(null);
      }, 1000);
    } else {
      setProfileMessage(res.error || "Error al actualizar perfil");
    }
  };

  // Add new address
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addrLine.trim() || !user?.id) return;

    setIsSavingAddress(true);
    const newAddr = await insertCustomerAddress({
      customer_id: user.id,
      label: addrLabel,
      address_line: addrLine.trim(),
      municipality: addrMunicipality,
      city: "Caracas",
      zone_id: "zone-1",
      reference: addrReference.trim() || undefined,
      is_default: addrIsDefault || addresses.length === 0,
    });

    setIsSavingAddress(false);
    if (newAddr) {
      if (newAddr.is_default) {
        setAddresses(prev => [newAddr, ...prev.map(a => ({ ...a, is_default: false }))]);
      } else {
        setAddresses(prev => [newAddr, ...prev]);
      }
      setAddrLine("");
      setAddrReference("");
      setAddrIsDefault(false);
      setIsAddAddressOpen(false);
    }
  };

  // Open Edit address dialog
  const handleOpenEditAddress = (addr: CustomerAddress) => {
    setEditingAddressId(addr.id);
    setEditAddrLabel(addr.label || "Casa");
    setEditAddrLine(addr.address_line || "");
    setEditAddrMunicipality(addr.municipality || "Chacao");
    setEditAddrReference(addr.reference || "");
    setEditAddrIsDefault(addr.is_default || false);
    setIsEditAddressOpen(true);
  };

  // Update existing address
  const handleUpdateAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAddressId || !editAddrLine.trim() || !user?.id) return;

    setIsUpdatingAddress(true);
    const updated = await updateCustomerAddress(editingAddressId, {
      label: editAddrLabel,
      address_line: editAddrLine.trim(),
      municipality: editAddrMunicipality,
      reference: editAddrReference.trim() || undefined,
      is_default: editAddrIsDefault,
    });

    setIsUpdatingAddress(false);
    if (updated) {
      if (editAddrIsDefault) {
        await setDefaultCustomerAddress(user.id, editingAddressId);
        setAddresses(prev => prev.map(a => a.id === editingAddressId ? { ...updated, is_default: true } : { ...a, is_default: false }));
      } else {
        setAddresses(prev => prev.map(a => a.id === editingAddressId ? updated : a));
      }
      setIsEditAddressOpen(false);
    }
  };

  // Delete address
  const handleDeleteAddress = async (addrId: string) => {
    const success = await deleteCustomerAddress(addrId);
    if (success) {
      setAddresses(prev => prev.filter(a => a.id !== addrId));
    }
  };

  // Set default address
  const handleSetDefaultAddress = async (addrId: string) => {
    if (!user?.id) return;
    const success = await setDefaultCustomerAddress(user.id, addrId);
    if (success) {
      setAddresses(prev => prev.map(a => ({
        ...a,
        is_default: a.id === addrId
      })));
    }
  };

  // Change password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setSecurityMessage({ text: "La contraseña debe tener al menos 6 caracteres", isError: true });
      return;
    }
    if (newPassword !== confirmPassword) {
      setSecurityMessage({ text: "Las contraseñas no coinciden", isError: true });
      return;
    }

    setIsSavingPassword(true);
    setSecurityMessage(null);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setIsSavingPassword(false);
    if (error) {
      setSecurityMessage({ text: error.message || "Error al actualizar contraseña", isError: true });
    } else {
      setSecurityMessage({ text: "Contraseña actualizada exitosamente", isError: false });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => {
        setIsSecurityOpen(false);
        setSecurityMessage(null);
      }, 1500);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push("/login");
  };

  if (!user) return null;

  return (
    <div className="min-h-dvh bg-background pb-32">
      <PageHeader title="Mi Perfil" />

      {/* User Card */}
      <div className="px-4 pt-4">
        <Card className="border shadow-xs">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center shrink-0 shadow-sm border border-primary/20">
              <span className="text-xl font-bold tracking-wider">
                {getInitials(user.full_name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold truncate">{user.full_name}</h2>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                  <Phone className="h-3.5 w-3.5 shrink-0" />
                  <span>{user.phone}</span>
                </div>
              )}
              {user.birth_date && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                  <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>Cumpleaños: {user.birth_date}</span>
                </div>
              )}
            </div>
            <Button
              variant="outline"
              size="icon"
              className="shrink-0 h-10 w-10 rounded-full"
              onClick={handleOpenEditProfile}
              title="Editar Perfil"
            >
              <Edit className="h-4 w-4 text-primary" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Saved addresses */}
      <div className="px-4 pt-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Direcciones guardadas
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-primary text-xs font-semibold px-2"
            onClick={() => setIsAddAddressOpen(true)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar
          </Button>
        </div>

        <div className="space-y-2.5">
          {isLoadingAddresses ? (
            <p className="text-xs text-muted-foreground">Cargando direcciones...</p>
          ) : addresses.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-4 text-center">
                <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No tienes direcciones guardadas</p>
                <p className="text-xs text-muted-foreground mb-3">
                  Agrega tu ubicación para solicitar lavados más rápido.
                </p>
                <Button size="sm" onClick={() => setIsAddAddressOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Agregar Dirección
                </Button>
              </CardContent>
            </Card>
          ) : (
            addresses.map((addr) => (
              <Card key={addr.id} className="overflow-hidden border shadow-xs">
                <CardContent className="p-3.5 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{addr.label}</p>
                      {addr.is_default ? (
                        <span className="text-[10px] font-bold bg-primary/15 text-primary rounded-full px-2 py-0.5">
                          Principal
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors underline"
                        >
                          Hacer principal
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {addr.address_line}
                    </p>
                    <p className="text-[11px] text-muted-foreground font-medium">
                      {addr.municipality}, Caracas {addr.reference ? `• Ref: ${addr.reference}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      onClick={() => handleOpenEditAddress(addr)}
                      title="Editar dirección"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDeleteAddress(addr.id)}
                      title="Eliminar dirección"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Menu options */}
      <div className="px-4 pt-6">
        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-3">
          Configuración
        </h3>
        <Card className="border shadow-xs overflow-hidden">
          <CardContent className="p-0 divide-y">
            <button
              onClick={() => setIsPaymentMethodsOpen(true)}
              className="flex items-center gap-3.5 w-full px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center shrink-0">
                <CreditCard className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold">Métodos de pago</span>
                <p className="text-xs text-muted-foreground">Pago Móvil, Efectivo USD, Zelle</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setIsNotificationsOpen(true)}
              className="flex items-center gap-3.5 w-full px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                <Bell className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold">Notificaciones</span>
                <p className="text-xs text-muted-foreground">Alertas de llegada, WhatsApp, avisos</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button
              onClick={() => setIsSecurityOpen(true)}
              className="flex items-center gap-3.5 w-full px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <span className="text-sm font-semibold">Privacidad y seguridad</span>
                <p className="text-xs text-muted-foreground">Cambiar contraseña, seguridad</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6 mx-4" />

      {/* Logout */}
      <div className="px-4">
        <Button
          variant="outline"
          className="w-full h-12 text-destructive border-destructive/30 hover:bg-destructive/10 font-semibold"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Cerrar Sesión
        </Button>
      </div>

      {/* ================= MODAL: EDITAR PERFIL ================= */}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Actualiza tus datos personales de contacto y cumpleaños.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProfile} className="space-y-4 py-2">
            {profileMessage && (
              <div className={`p-3 text-xs rounded-lg ${profileMessage.includes("éxito") || profileMessage.includes("exitosamente") ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" : "bg-destructive/10 text-destructive border border-destructive/20"}`}>
                {profileMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="editName">Nombre Completo</Label>
              <Input
                id="editName"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Tu nombre y apellido"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editPhone">Teléfono (WhatsApp)</Label>
              <Input
                id="editPhone"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                placeholder="+58 412 1234567"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editBirthDate">Fecha de Cumpleaños</Label>
              <Input
                id="editBirthDate"
                type="date"
                value={editBirthDate}
                onChange={(e) => setEditBirthDate(e.target.value)}
                max={new Date().toISOString().split("T")[0]}
              />
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isSavingProfile} className="w-full">
                {isSavingProfile ? "Guardando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: AGREGAR DIRECCIÓN ================= */}
      <Dialog open={isAddAddressOpen} onOpenChange={setIsAddAddressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nueva Dirección</DialogTitle>
            <DialogDescription>
              Ingresa el lugar donde se prestará el servicio de lavado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddAddress} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="addrLabel">Etiqueta (Ej. Casa, Oficina, Galpón)</Label>
              <div className="flex gap-2">
                {["Casa", "Oficina", "Apto", "Otro"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={addrLabel === type ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setAddrLabel(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addrMunicipality">Municipio (Caracas)</Label>
              <select
                id="addrMunicipality"
                value={addrMunicipality}
                onChange={(e) => setAddrMunicipality(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Chacao">Chacao</option>
                <option value="Baruta">Baruta</option>
                <option value="El Hatillo">El Hatillo</option>
                <option value="Sucre">Sucre</option>
                <option value="Libertador">Libertador</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addrLine">Dirección Detallada</Label>
              <Input
                id="addrLine"
                value={addrLine}
                onChange={(e) => setAddrLine(e.target.value)}
                placeholder="Av. / Calle, Edificio / Casa, Piso / Nro"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="addrRef">Punto de Referencia (Opcional)</Label>
              <Input
                id="addrRef"
                value={addrReference}
                onChange={(e) => setAddrReference(e.target.value)}
                placeholder="Frente a la farmacia, portón negro..."
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="addrDefault"
                checked={addrIsDefault}
                onChange={(e) => setAddrIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="addrDefault" className="text-xs font-medium cursor-pointer">
                Establecer como dirección principal
              </Label>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isSavingAddress || !addrLine.trim()} className="w-full">
                {isSavingAddress ? "Guardando..." : "Guardar Dirección"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: EDITAR DIRECCIÓN ================= */}
      <Dialog open={isEditAddressOpen} onOpenChange={setIsEditAddressOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Dirección</DialogTitle>
            <DialogDescription>
              Modifica los datos del lugar donde se prestará el servicio.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateAddress} className="space-y-3.5 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="editAddrLabel">Etiqueta</Label>
              <div className="flex gap-2">
                {["Casa", "Oficina", "Apto", "Otro"].map((type) => (
                  <Button
                    key={type}
                    type="button"
                    variant={editAddrLabel === type ? "default" : "outline"}
                    size="sm"
                    className="flex-1 text-xs"
                    onClick={() => setEditAddrLabel(type)}
                  >
                    {type}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editAddrMunicipality">Municipio (Caracas)</Label>
              <select
                id="editAddrMunicipality"
                value={editAddrMunicipality}
                onChange={(e) => setEditAddrMunicipality(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="Chacao">Chacao</option>
                <option value="Baruta">Baruta</option>
                <option value="El Hatillo">El Hatillo</option>
                <option value="Sucre">Sucre</option>
                <option value="Libertador">Libertador</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editAddrLine">Dirección Detallada</Label>
              <Input
                id="editAddrLine"
                value={editAddrLine}
                onChange={(e) => setEditAddrLine(e.target.value)}
                placeholder="Av. / Calle, Edificio / Casa, Piso / Nro"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="editAddrRef">Punto de Referencia (Opcional)</Label>
              <Input
                id="editAddrRef"
                value={editAddrReference}
                onChange={(e) => setEditAddrReference(e.target.value)}
                placeholder="Frente a la farmacia, portón negro..."
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="editAddrDefault"
                checked={editAddrIsDefault}
                onChange={(e) => setEditAddrIsDefault(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
              />
              <Label htmlFor="editAddrDefault" className="text-xs font-medium cursor-pointer">
                Establecer como dirección principal
              </Label>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isUpdatingAddress || !editAddrLine.trim()} className="w-full">
                {isUpdatingAddress ? "Actualizando..." : "Guardar Cambios"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: MÉTODOS DE PAGO ================= */}
      <Dialog open={isPaymentMethodsOpen} onOpenChange={setIsPaymentMethodsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-primary" />
              Métodos de Pago Disponibles
            </DialogTitle>
            <DialogDescription>
              Aceptamos los siguientes métodos de pago en Caracas:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-sm">
            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-primary">
                <Smartphone className="h-4 w-4" />
                <span>Pago Móvil (Bolívares a Tasa BCV)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Banco:</strong> Banesco (0134) o Mercantil (0105)<br />
                <strong>Teléfono:</strong> 0416-6315114<br />
                <strong>C.I. / RIF:</strong> V-12.345.678
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-600">
                <Banknote className="h-4 w-4" />
                <span>Efectivo en Dólares ($ USD)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Puedes pagar directamente al técnico al finalizar el servicio. Agradecemos billetes en buen estado.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-purple-600">
                <Building className="h-4 w-4" />
                <span>Zelle</span>
              </div>
              <p className="text-xs text-muted-foreground">
                <strong>Correo:</strong> pagos@autospacaracas.com<br />
                <strong>Titular:</strong> AutoSpa Servicios C.A.
              </p>
            </div>

            <div className="p-3 rounded-lg border bg-muted/40 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-blue-600">
                <CreditCard className="h-4 w-4" />
                <span>Punto de Venta / Tarjeta</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Nuestros técnicos cuentan con punto de venta inalámbrico al momento del servicio.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button className="w-full" onClick={() => setIsPaymentMethodsOpen(false)}>
              Entendido
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: NOTIFICACIONES ================= */}
      <Dialog open={isNotificationsOpen} onOpenChange={setIsNotificationsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-amber-500" />
              Preferencias de Notificación
            </DialogTitle>
            <DialogDescription>
              Configura cómo deseas recibir avisos sobre tus reservas y servicios.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {notifSavedMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 text-xs rounded-lg">
                Preferencias guardadas correctamente
              </div>
            )}

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
              <div>
                <p className="font-semibold text-sm">Avisos por WhatsApp</p>
                <p className="text-xs text-muted-foreground">Confirmación de cita y aviso cuando el técnico esté en camino</p>
              </div>
              <input
                type="checkbox"
                checked={notifWhatsapp}
                onChange={(e) => setNotifWhatsapp(e.target.checked)}
                className="h-5 w-5 text-primary rounded"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
              <div>
                <p className="font-semibold text-sm">Notificaciones Push / Alertas en Vivo</p>
                <p className="text-xs text-muted-foreground">Actualizaciones en tiempo real del estado del lavado</p>
              </div>
              <input
                type="checkbox"
                checked={notifPush}
                onChange={(e) => setNotifPush(e.target.checked)}
                className="h-5 w-5 text-primary rounded"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
              <div>
                <p className="font-semibold text-sm">Recibos por Correo Electrónico</p>
                <p className="text-xs text-muted-foreground">Comprobantes y resumen de factura de cada servicio</p>
              </div>
              <input
                type="checkbox"
                checked={notifEmail}
                onChange={(e) => setNotifEmail(e.target.checked)}
                className="h-5 w-5 text-primary rounded"
              />
            </div>

            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40">
              <div>
                <p className="font-semibold text-sm">Promociones y Descuentos</p>
                <p className="text-xs text-muted-foreground">Cupones de regalo por cumpleaños y fines de semana</p>
              </div>
              <input
                type="checkbox"
                checked={notifPromo}
                onChange={(e) => setNotifPromo(e.target.checked)}
                className="h-5 w-5 text-primary rounded"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="w-full"
              onClick={() => {
                setNotifSavedMessage(true);
                setTimeout(() => {
                  setIsNotificationsOpen(false);
                  setNotifSavedMessage(false);
                }, 1000);
              }}
            >
              Guardar Preferencias
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= MODAL: PRIVACIDAD Y SEGURIDAD ================= */}
      <Dialog open={isSecurityOpen} onOpenChange={setIsSecurityOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-600" />
              Privacidad y Seguridad
            </DialogTitle>
            <DialogDescription>
              Gestiona la seguridad de tu cuenta y cambia tu contraseña.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="space-y-3.5 py-2">
            {securityMessage && (
              <div
                className={`p-3 text-xs rounded-lg ${
                  securityMessage.isError
                    ? "bg-destructive/10 text-destructive border border-destructive/20"
                    : "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20"
                }`}
              >
                {securityMessage.text}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="newPass">Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="newPass"
                  type={showSecPassword ? "text" : "password"}
                  placeholder="Mínimo 6 caracteres"
                  className="pl-9 pr-9 h-11"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowSecPassword(!showSecPassword)}
                  className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  tabIndex={-1}
                >
                  {showSecPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPass">Confirmar Nueva Contraseña</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="confirmPass"
                  type={showSecPassword ? "text" : "password"}
                  placeholder="Repite la contraseña"
                  className="pl-9 pr-9 h-11"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button type="submit" disabled={isSavingPassword || !newPassword} className="w-full">
                {isSavingPassword ? "Actualizando..." : "Actualizar Contraseña"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
