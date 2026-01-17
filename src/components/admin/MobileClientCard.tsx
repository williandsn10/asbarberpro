import { Phone, Mail, Calendar, Edit, Trash2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInDays } from "date-fns";
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

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function isFrequentClient(lastVisit?: string): boolean {
  if (!lastVisit) return false;
  const daysSinceVisit = differenceInDays(new Date(), new Date(lastVisit));
  return daysSinceVisit <= 30;
}

export function MobileClientCard({ client, lastVisit, onEdit, onDelete }: MobileClientCardProps) {
  const isFrequent = isFrequentClient(lastVisit);

  return (
    <Card className="glass-card">
      <CardContent className="p-4">
        {/* Header with Avatar and Name */}
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="text-primary font-semibold text-lg">
              {getInitials(client.name)}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{client.name}</h3>
            {isFrequent && (
              <div className="flex items-center gap-1 mt-0.5">
                <Star className="w-3 h-3 text-primary fill-primary" />
                <span className="text-xs text-primary">Cliente frequente</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Contact Info - Clickable */}
        <div className="space-y-2 mb-4">
          {client.phone && (
            <a 
              href={`tel:${client.phone.replace(/\D/g, "")}`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-[0.98]"
            >
              <Phone className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground">{client.phone}</span>
            </a>
          )}
          
          {client.email && (
            <a 
              href={`mailto:${client.email}`}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors active:scale-[0.98]"
            >
              <Mail className="w-4 h-4 text-primary" />
              <span className="text-sm text-foreground truncate">{client.email}</span>
            </a>
          )}
          
          {!client.phone && !client.email && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-secondary/30">
              <span className="text-sm text-muted-foreground">Sem contato cadastrado</span>
            </div>
          )}
        </div>
        
        {/* Dates Info */}
        <div className="flex items-center justify-between py-2 px-1 border-t border-border/50 text-xs text-muted-foreground mb-4">
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            <span>Cadastro: {format(new Date(client.created_at), "dd/MM/yy", { locale: ptBR })}</span>
          </div>
          
          <span>
            Visita: {lastVisit 
              ? format(new Date(lastVisit), "dd/MM/yy", { locale: ptBR })
              : "Nunca"
            }
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex-1 h-10"
            onClick={() => onEdit(client)}
          >
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 h-10 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onDelete(client)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Excluir
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
