import { Clock, User, Scissors, CheckCircle, XCircle } from "lucide-react";
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
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/20">
              <Clock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-lg font-bold text-primary">
                {appointment.appointment_time?.slice(0, 5)}
              </p>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyles[appointment.status]}`}>
                {statusLabels[appointment.status]}
              </span>
            </div>
          </div>
        </div>
        
        <div className="space-y-2 text-sm mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{appointment.client?.name || "Cliente"}</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Scissors className="w-4 h-4 text-muted-foreground" />
            <span>{appointment.service?.name || "Serviço"}</span>
            {appointment.service?.price && (
              <span className="text-primary font-medium ml-auto">
                R$ {appointment.service.price.toFixed(2)}
              </span>
            )}
          </div>
        </div>
        
        {/* Action buttons based on status */}
        {(appointment.status === "pending" || appointment.status === "scheduled") && (
          <div className="flex gap-2 pt-3 border-t border-border/50">
            {appointment.status === "pending" && onAccept && (
              <Button 
                size="sm" 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onAccept(appointment.id)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Aceitar
              </Button>
            )}
            
            {appointment.status === "scheduled" && onComplete && (
              <Button 
                size="sm" 
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => onComplete(appointment.id)}
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Concluir
              </Button>
            )}
            
            {onCancel && (
              <Button 
                size="sm" 
                variant="destructive"
                className="flex-1"
                onClick={() => onCancel(appointment.id)}
              >
                <XCircle className="w-4 h-4 mr-1" />
                {appointment.status === "pending" ? "Recusar" : "Cancelar"}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
