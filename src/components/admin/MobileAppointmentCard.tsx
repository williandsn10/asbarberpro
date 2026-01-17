import { Phone, User, Scissors, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Appointment {
  id: string;
  appointment_time: string;
  status: string;
  client?: { name: string; phone: string | null };
  service?: { name: string; price: number };
}

interface MobileAppointmentCardProps {
  appointment: Appointment;
  onAccept?: (id: string) => void;
  onComplete?: (id: string) => void;
  onCancel?: (id: string) => void;
}

const statusStyles: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  scheduled: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/20 text-red-400 border-red-500/30",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  scheduled: "Confirmado",
  completed: "Concluído",
  cancelled: "Cancelado",
};

export function MobileAppointmentCard({ 
  appointment, 
  onAccept, 
  onComplete, 
  onCancel 
}: MobileAppointmentCardProps) {
  const phoneNumber = appointment.client?.phone?.replace(/\D/g, "");
  
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        {/* Header with time badge and status */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="px-3 py-2 rounded-lg bg-primary/20 border border-primary/30">
              <p className="text-xl font-bold text-primary tabular-nums">
                {appointment.appointment_time?.slice(0, 5)}
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <User className="w-4 h-4 text-muted-foreground" />
                <span className="font-semibold text-foreground">
                  {appointment.client?.name || "Cliente"}
                </span>
              </div>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusStyles[appointment.status]}`}>
            {statusLabels[appointment.status]}
          </span>
        </div>
        
        {/* Phone - Clickable to call */}
        {phoneNumber && (
          <a 
            href={`tel:${phoneNumber}`}
            className="flex items-center gap-3 p-3 mb-3 rounded-lg bg-secondary/50 
                       hover:bg-secondary transition-colors active:scale-[0.98]"
          >
            <Phone className="w-4 h-4 text-primary" />
            <span className="text-sm">{appointment.client?.phone}</span>
            <span className="text-xs text-muted-foreground ml-auto">Tocar para ligar</span>
          </a>
        )}
        
        {/* Service and Price */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 mb-4">
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">{appointment.service?.name || "Serviço"}</span>
          </div>
          {appointment.service?.price && (
            <span className="text-base font-bold text-primary">
              R$ {appointment.service.price.toFixed(2)}
            </span>
          )}
        </div>
        
        {/* Action buttons based on status - Larger for touch */}
        {(appointment.status === "pending" || appointment.status === "scheduled") && (
          <div className="flex gap-3 pt-3 border-t border-border/50">
            {appointment.status === "pending" && onAccept && (
              <Button 
                className="flex-1 h-11 bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-transform"
                onClick={() => onAccept(appointment.id)}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Aceitar
              </Button>
            )}
            
            {appointment.status === "scheduled" && onComplete && (
              <Button 
                className="flex-1 h-11 bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-transform"
                onClick={() => onComplete(appointment.id)}
              >
                <CheckCircle className="w-5 h-5 mr-2" />
                Concluir
              </Button>
            )}
            
            {onCancel && (
              <Button 
                variant="destructive"
                className="flex-1 h-11 active:scale-[0.98] transition-transform"
                onClick={() => onCancel(appointment.id)}
              >
                <XCircle className="w-5 h-5 mr-2" />
                {appointment.status === "pending" ? "Recusar" : "Cancelar"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
