import { Vehicle } from '@/lib/types';
import { getVehicleTypeLabel } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Car, Truck, Bus, Bike, Edit } from 'lucide-react';

interface VehicleCardProps {
  vehicle: Vehicle;
  onEdit?: () => void;
  onSelect?: () => void;
  selected?: boolean;
  showActions?: boolean;
}

export function VehicleCard({ vehicle, onEdit, onSelect, selected, showActions }: VehicleCardProps) {
  const getTypeIcon = () => {
    switch (vehicle.type) {
      case 'sedan':
      case 'coupe':
      case 'hatchback':
        return <Car className="w-5 h-5" />;
      case 'pickup':
      case 'truck':
      case 'suv':
        return <Truck className="w-5 h-5" />;
      case 'van':
        return <Bus className="w-5 h-5" />;
      case 'motorcycle':
        return <Bike className="w-5 h-5" />;
      default:
        return <Car className="w-5 h-5" />;
    }
  };

  return (
    <Card 
      className={cn(
        "transition-all duration-200 cursor-pointer overflow-hidden",
        selected ? "border-primary ring-1 ring-primary shadow-sm" : "hover:border-primary/50",
      )}
      onClick={onSelect}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <div className={cn(
              "flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center",
              selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            )}>
              {getTypeIcon()}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg uppercase tracking-wider truncate">
                  {vehicle.plate}
                </h3>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-secondary text-secondary-foreground">
                  {getVehicleTypeLabel(vehicle.type)}
                </span>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {vehicle.brand} {vehicle.model} • {vehicle.year}
              </p>
              <div className="flex items-center gap-1.5 mt-1">
                <div 
                  className="w-3 h-3 rounded-full border shadow-sm bg-muted-foreground/30"
                />
                <span className="text-xs text-muted-foreground capitalize">
                  {vehicle.color}
                </span>
              </div>
            </div>
          </div>
          
          {showActions && onEdit && (
            <div className="flex-shrink-0 ml-3">
              <Button 
                variant="ghost" 
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="h-10 w-10 rounded-full"
              >
                <Edit className="w-5 h-5 text-muted-foreground" />
                <span className="sr-only">Editar vehículo</span>
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
