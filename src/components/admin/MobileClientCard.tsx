import { Phone, Mail, Calendar, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Client {
  id: string;
  user_id: string | null;
  name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
  updated_at: string;
}

interface MobileClientCardProps {
  client: Client;
  lastVisit?: string;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
}

export function MobileClientCard({ client, lastVisit, onEdit, onDelete }: MobileClientCardProps) {
  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-foreground">{client.name}</h3>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(client)}>
              <Edit className="w-4 h-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-destructive hover:text-destructive"
              onClick={() => onDelete(client)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        <div className="space-y-2 text-sm">
          {client.phone && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Phone className="w-3.5 h-3.5" />
              <span>{client.phone}</span>
            </div>
          )}
          
          {client.email && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Mail className="w-3.5 h-3.5" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Calendar className="w-3.5 h-3.5" />
              <span className="text-xs">Cadastro: {format(new Date(client.created_at), "dd/MM/yy", { locale: ptBR })}</span>
            </div>
            
            <span className="text-xs text-muted-foreground">
              Última visita: {lastVisit 
                ? format(new Date(lastVisit), "dd/MM/yy", { locale: ptBR })
                : "Nunca"
              }
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
