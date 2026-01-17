import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Scissors, Clock, DollarSign, Edit, Trash2 } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

interface MobileServiceCardProps {
  service: Service;
  onEdit: (service: Service) => void;
  onDelete: (service: Service) => void;
}

export function MobileServiceCard({ service, onEdit, onDelete }: MobileServiceCardProps) {
  return (
    <Card className="glass-card overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header com nome do serviço */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <Scissors className="w-5 h-5 text-primary" />
          </div>
          <h3 className="font-semibold text-lg">{service.name}</h3>
        </div>

        {/* Informações do serviço */}
        <div className="grid grid-cols-2 gap-3">
          {/* Preço */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
            <DollarSign className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Preço</p>
              <p className="font-semibold text-primary">
                R$ {service.price.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Duração */}
          <div className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Duração</p>
              <p className="font-medium">{service.duration_minutes} min</p>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="flex gap-3 pt-2 border-t border-border/50">
          <Button
            variant="outline"
            className="flex-1 h-11 active:scale-[0.98] transition-transform"
            onClick={() => onEdit(service)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button
            variant="outline"
            className="flex-1 h-11 text-destructive hover:text-destructive active:scale-[0.98] transition-transform"
            onClick={() => onDelete(service)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
