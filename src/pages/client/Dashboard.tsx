import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Calendar, Scissors, Clock, Plus } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function ClientDashboard() {
  const { profile } = useAuth();

  const { data: appointments = [] } = useQuery({
    queryKey: ["my-appointments"],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase.from("appointments").select(`*, service:services(name, price), barber:barbers(name)`).eq("client_id", profile.id).eq("status", "scheduled").gte("appointment_date", format(new Date(), "yyyy-MM-dd")).order("appointment_date").order("appointment_time").limit(5);
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-3xl font-bold">Olá, <span className="text-gradient-gold">{profile?.name?.split(" ")[0]}</span>!</h1><p className="text-muted-foreground mt-1">Bem-vindo ao BarberPro</p></div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass-card"><CardContent className="pt-6 text-center"><Calendar className="w-12 h-12 mx-auto mb-4 text-primary" /><h3 className="text-lg font-semibold mb-2">Agendar Horário</h3><p className="text-muted-foreground text-sm mb-4">Escolha o serviço, barbeiro e horário</p><Button asChild className="bg-gradient-gold"><Link to="/cliente/agendar"><Plus className="w-4 h-4 mr-2" />Novo Agendamento</Link></Button></CardContent></Card>
        <Card className="glass-card"><CardContent className="pt-6 text-center"><Clock className="w-12 h-12 mx-auto mb-4 text-primary" /><h3 className="text-lg font-semibold mb-2">Meus Agendamentos</h3><p className="text-muted-foreground text-sm mb-4">Veja e gerencie seus horários</p><Button asChild variant="outline"><Link to="/cliente/meus-agendamentos">Ver Agendamentos</Link></Button></CardContent></Card>
      </div>

      {appointments.length > 0 && (
        <Card className="glass-card"><CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" />Próximos Agendamentos</CardTitle></CardHeader>
          <CardContent><div className="space-y-3">{appointments.map((apt: any) => (
            <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
              <div><p className="font-medium">{apt.service?.name}</p><p className="text-sm text-muted-foreground">{apt.barber?.name}</p></div>
              <div className="text-right"><p className="font-bold text-primary">{format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM", { locale: ptBR })}</p><p className="text-sm">{apt.appointment_time?.slice(0, 5)}</p></div>
            </div>
          ))}</div></CardContent>
        </Card>
      )}
    </div>
  );
}
