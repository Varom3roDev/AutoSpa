'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/auth/auth-context';
import { fetchCustomerVehicles, insertVehicle, updateVehicle, deleteVehicle, getCachedCustomerVehicles } from '@/lib/supabase/api';
import { PageHeader } from '@/components/shared/page-header';
import { VehicleCard } from '@/components/vehicles/vehicle-card';
import { Vehicle, VehicleType, VehicleSizeCategory } from '@/lib/types';
import { Car, Plus, CalendarPlus, Trash2, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const vehicleSchema = z.object({
  plate: z.string().min(1, 'La placa es requerida'),
  brand: z.string().min(1, 'La marca es requerida'),
  model: z.string().min(1, 'El modelo es requerido'),
  year: z.string().regex(/^\d{4}$/, 'Año inválido'),
  color: z.string().min(1, 'El color es requerido'),
  type: z.string().min(1, 'El tipo es requerido'),
});

type VehicleFormValues = z.infer<typeof vehicleSchema>;

const VEHICLE_TYPE_OPTIONS: { label: string; value: VehicleType; size: VehicleSizeCategory }[] = [
  { label: 'Moto', value: 'motorcycle', size: 'small' },
  { label: 'Sedán', value: 'sedan', size: 'medium' },
  { label: 'Camioneta', value: 'suv', size: 'large' },
  { label: 'Van / Mini van (Camioneta)', value: 'van', size: 'xlarge' },
];

export default function ClientVehiclesPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => getCachedCustomerVehicles());
  const [isLoadingVehicles, setIsLoadingVehicles] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const cached = getCachedCustomerVehicles();
      return cached.length === 0;
    }
    return true;
  });
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [selectedType, setSelectedType] = useState<string>('sedan');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadVehicles();
  }, [user]);

  async function loadVehicles() {
    try {
      const data = await fetchCustomerVehicles(user?.id);
      setVehicles(data);
    } finally {
      setIsLoadingVehicles(false);
    }
  }

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear().toString(),
      color: '',
      type: 'sedan',
    },
  });

  const handleOpenAdd = () => {
    setEditingVehicle(null);
    setSelectedType('sedan');
    reset({
      plate: '',
      brand: '',
      model: '',
      year: new Date().getFullYear().toString(),
      color: '',
      type: 'sedan',
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (vehicle: Vehicle) => {
    setEditingVehicle(vehicle);
    setSelectedType(vehicle.type);
    reset({
      plate: vehicle.plate,
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year.toString(),
      color: vehicle.color,
      type: vehicle.type,
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: VehicleFormValues) => {
    setIsSaving(true);
    const selectedOption = VEHICLE_TYPE_OPTIONS.find((o) => o.value === values.type);

    try {
      if (editingVehicle) {
        // Edit mode
        await updateVehicle(editingVehicle.id, {
          plate: values.plate.toUpperCase(),
          brand: values.brand,
          model: values.model,
          year: parseInt(values.year, 10),
          color: values.color,
          type: values.type as VehicleType,
          size_category: selectedOption?.size || 'medium',
        });
      } else {
        // Add mode
        const vehiclePayload: Omit<Vehicle, 'id'> = {
          customer_id: user?.id || 'c_1',
          plate: values.plate.toUpperCase(),
          brand: values.brand,
          model: values.model,
          year: parseInt(values.year, 10),
          color: values.color,
          type: values.type as VehicleType,
          size_category: selectedOption?.size || 'medium',
          is_default: vehicles.length === 0,
        };
        await insertVehicle(vehiclePayload);
      }

      await loadVehicles();
      setIsDialogOpen(false);
      reset();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!editingVehicle) return;
    if (!confirm('¿Estás seguro de que deseas eliminar este paciente?')) return;
    setIsSaving(true);
    try {
      await deleteVehicle(editingVehicle.id);
      await loadVehicles();
      setIsDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen pb-32 relative">
      <PageHeader title="Mis Pacientes" />

      {/* Dialog Agregar / Editar Vehículo */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingVehicle ? 'Editar Paciente' : 'Registrar Paciente'}
            </DialogTitle>
            <DialogDescription>
              {editingVehicle
                ? 'Actualiza los datos del paciente para sus sesiones.'
                : 'Ingresa los datos de tu paciente para asociarlo a sus sesiones de cuidado.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="plate">Placa</Label>
              <Input
                id="plate"
                placeholder="AB123CD"
                className="uppercase"
                {...register('plate')}
              />
              {errors.plate && <p className="text-xs text-destructive">{errors.plate.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="brand">Marca</Label>
                <Input id="brand" placeholder="Renault" {...register('brand')} />
                {errors.brand && <p className="text-xs text-destructive">{errors.brand.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="model">Modelo</Label>
                <Input id="model" placeholder="Logan" {...register('model')} />
                {errors.model && <p className="text-xs text-destructive">{errors.model.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="year">Año</Label>
                <Input id="year" placeholder="2010" type="number" {...register('year')} />
                {errors.year && <p className="text-xs text-destructive">{errors.year.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="color">Color</Label>
                <Input id="color" placeholder="Vinotinto" {...register('color')} />
                {errors.color && <p className="text-xs text-destructive">{errors.color.message}</p>}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="type">Tipo de Paciente</Label>
              <Select
                value={selectedType}
                onValueChange={(val: string | null) => {
                  if (val) {
                    setSelectedType(val);
                    setValue('type', val);
                  }
                }}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Selecciona el tipo de paciente" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.type && <p className="text-xs text-destructive">{errors.type.message}</p>}
            </div>

            <DialogFooter className="pt-2 gap-2 flex-col sm:flex-row">
              {editingVehicle && (
                <Button
                  type="button"
                  variant="outline"
                  className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                  onClick={handleDelete}
                  disabled={isSaving}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Eliminar
                </Button>
              )}
              <div className="flex gap-2 flex-1 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  disabled={isSaving}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? 'Guardando...' : editingVehicle ? 'Guardar Cambios' : 'Guardar Paciente'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {isLoadingVehicles && vehicles.length === 0 ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl border border-border/40 bg-card/50 animate-pulse flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Car className="w-6 h-6 opacity-60" />
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-36 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-24 bg-muted/60 rounded animate-pulse" />
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Cargando pacientes...</span>
              </div>
            </div>
          </div>
        ) : vehicles.length > 0 ? (
          <div className="space-y-4">
            {vehicles.map((vehicle) => (
              <div key={vehicle.id} className="space-y-2">
                <VehicleCard
                  vehicle={vehicle}
                  showActions
                  onEdit={() => handleOpenEdit(vehicle)}
                  onSelect={() => router.push('/client/booking')}
                />
                <div className="flex justify-end pr-1">
                  <Link href="/client/booking">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 gap-1.5 text-primary border-primary/30 hover:bg-primary/10"
                    >
                      <CalendarPlus className="h-3.5 w-3.5" />
                      Reservar sesión para este paciente
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-8 mt-10 text-center border rounded-xl bg-muted/20">
            <div className="flex items-center justify-center w-12 h-12 mb-4 rounded-full bg-primary/10">
              <Car className="w-6 h-6 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">Aún no tienes pacientes registrados</h3>
            <p className="mb-6 text-sm text-muted-foreground text-balance">
              Registra tu primer paciente para comenzar a programar sesiones.
            </p>
          </div>
        )}
      </main>

      {/* Botón Flotante de Lujo con Acabado de Alta Gama y Animación Permanente */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 flex items-center justify-center">
        {/* Aura dorada ambiental con respiración continua */}
        <div className="absolute inset-0 -m-3 rounded-full bg-[#d5ae33]/25 blur-xl animate-pulse pointer-events-none" />

        {/* Botón Cápsula de Lujo con Bisel Metálico, Medallón 24K y Tipografía Dorada */}
        <button
          type="button"
          onClick={handleOpenAdd}
          aria-label="Registrar nuevo paciente"
          title="Registrar nuevo paciente"
          className="relative group flex items-center gap-3 px-6 py-3.5 rounded-full cursor-pointer select-none transition-all duration-300 active:scale-95 shadow-[0_12px_32px_rgba(0,0,0,0.85),0_0_24px_rgba(213,174,51,0.4)] hover:shadow-[0_14px_38px_rgba(213,174,51,0.6)] border-2 border-[#d5ae33]/80 hover:border-[#ffe885] bg-gradient-to-r from-[#181A20] via-[#241F14] to-[#181A20]"
        >
          {/* Reflejo de luz superior biselada (efecto cristal pulido) */}
          <div className="absolute inset-x-5 top-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#ffe885] to-transparent opacity-90" />

          {/* Medallón de oro 24k con ícono (+) en relieve */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center shadow-md transition-transform duration-300 group-hover:rotate-90 group-hover:scale-105"
            style={{
              background: 'linear-gradient(135deg, #FBE589 0%, #D5AE33 50%, #8F6E12 100%)',
              boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.9), 0 2px 5px rgba(0,0,0,0.6)',
            }}
          >
            <Plus className="w-5 h-5 text-[#0B0E11] stroke-[3]" />
          </div>

          {/* Etiqueta tipográfica dorada en relieve */}
          <span
            className="text-xs uppercase tracking-widest font-black text-transparent bg-clip-text"
            style={{
              backgroundImage: 'linear-gradient(135deg, #FFFFFF 0%, #F5D36C 45%, #D5AE33 100%)',
              letterSpacing: '0.12em',
            }}
          >
            Registrar Paciente
          </span>

          {/* Destello de brillo de lujo */}
          <Sparkles className="w-4 h-4 text-[#F5D36C] animate-pulse" />
        </button>
      </div>
    </div>
  );
}
