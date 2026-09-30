import { Service, VehicleSizeCategory } from '@/lib/types';
import { formatCurrency, cn } from '@/lib/utils';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Droplets, Clock, Check, CheckCircle2 } from 'lucide-react';

interface ServiceCardProps {
  service: Service;
  vehicleSize?: VehicleSizeCategory;
  onSelect?: (service: Service) => void;
  selected?: boolean;
}

export function ServiceCard({ service, vehicleSize, onSelect, selected }: ServiceCardProps) {
  const price = vehicleSize && service.price_by_vehicle_size[vehicleSize] 
    ? service.price_by_vehicle_size[vehicleSize] 
    : service.base_price_usd;

  const priceLabel = vehicleSize ? formatCurrency(price) : `Desde ${formatCurrency(price)}`;

  return (
    <Card 
      className={cn(
        "flex flex-col overflow-hidden transition-all duration-200 cursor-pointer",
        selected ? "border-primary ring-1 ring-primary shadow-md" : "hover:border-primary/50"
      )}
      onClick={() => onSelect?.(service)}
    >
      <CardHeader className="p-4 pb-2">
        <div className="flex justify-between items-start gap-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
              <Droplets className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-semibold text-base line-clamp-1">{service.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{service.description}</p>
            </div>
          </div>
          {selected && <CheckCircle2 className="w-6 h-6 text-primary flex-shrink-0" />}
        </div>
      </CardHeader>
      
      <CardContent className="p-4 py-2 flex-grow">
        <div className="flex items-center gap-4 mb-4 text-sm font-medium">
          <div className="text-lg text-primary">{priceLabel}</div>
          <div className="flex items-center text-muted-foreground">
            <Clock className="w-4 h-4 mr-1.5" />
            {service.base_duration_minutes} min
          </div>
        </div>

        {service.includes && service.includes.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Incluye:</p>
            <ul className="space-y-1">
              {service.includes.slice(0, 3).map((item, idx) => (
                <li key={idx} className="flex items-start text-sm">
                  <Check className="w-4 h-4 text-primary mr-2 flex-shrink-0 mt-0.5" />
                  <span className="text-muted-foreground line-clamp-1">{item}</span>
                </li>
              ))}
              {service.includes.length > 3 && (
                <li className="text-xs text-muted-foreground pl-6">
                  + {service.includes.length - 3} más...
                </li>
              )}
            </ul>
          </div>
        )}
      </CardContent>

      <CardFooter className="p-4 pt-2">
        <Button 
          variant={selected ? "secondary" : "default"} 
          className="w-full h-11 md:h-12"
          onClick={(e) => {
            e.stopPropagation();
            onSelect?.(service);
          }}
        >
          {selected ? 'Seleccionado' : 'Seleccionar'}
        </Button>
      </CardFooter>
    </Card>
  );
}
