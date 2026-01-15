import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Loader2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function MyAppointments() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["all-my-appointments"],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase.from("appointments").select(`*, service:services(name, price), barber:barbers(name)`).eq("client_id", profile.id).order("appointment_date", { ascending: false }).order("appointment_time", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const cancelMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from("appointments").update({ status: "cancelled" }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["all-my-appointments"] }); toast({ title: "Agendamento cancelado" }); },
  });

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { scheduled: "bg-blue-500/20 text-blue-400", completed: "bg-green-500/20 text-green-400", cancelled: "bg-red-500/20 text-red-400" };
    const labels: Record<string, string> = { scheduled: "Agendado", completed: "Concluído", cancelled: "Cancelado" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div><h1 className="text-3xl font-bold text-gradient-gold">Meus Agendamentos</h1><p className="text-muted-foreground mt-1">Histórico de horários</p></div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Agendamentos</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : appointments.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum agendamento</p></div> : (
            <div className="space-y-3">{appointments.map((apt: any) => (
              <div key={apt.id} className="flex items-center justify-between p-4 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]"><p className="font-bold text-primary">{format(new Date(apt.appointment_date + "T12:00:00"), "dd/MM", { locale: ptBR })}</p><p className="text-sm">{apt.appointment_time?.slice(0, 5)}</p></div>
                  <div><p className="font-medium">{apt.service?.name}</p><p className="text-sm text-muted-foreground">{apt.barber?.name} • R$ {apt.service?.price.toFixed(2)}</p></div>
                </div>
                <div className="flex items-center gap-2">{getStatusBadge(apt.status)}{apt.status === "scheduled" && <Button variant="ghost" size="icon" onClick={() => cancelMutation.mutate(apt.id)} className="text-destructive"><XCircle className="w-4 h-4" /></Button>}</div>
              </div>
            ))}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
