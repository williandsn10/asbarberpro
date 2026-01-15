import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Scissors, Clock, Loader2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function BookAppointment() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({ service_id: "", barber_id: "", appointment_date: "", appointment_time: "", notes: "" });
  const [success, setSuccess] = useState(false);

  const { data: services = [] } = useQuery({ queryKey: ["services"], queryFn: async () => { const { data } = await supabase.from("services").select("*").order("name"); return data || []; } });
  const { data: barbers = [] } = useQuery({ queryKey: ["barbers"], queryFn: async () => { const { data } = await supabase.from("barbers").select("*").eq("is_active", true); return data || []; } });

  const selectedService = services.find((s: any) => s.id === formData.service_id);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Não autenticado");
      const { error } = await supabase.from("appointments").insert({ client_id: profile.id, service_id: formData.service_id, barber_id: formData.barber_id, appointment_date: formData.appointment_date, appointment_time: formData.appointment_time, notes: formData.notes || null });
      if (error) throw error;
    },
    onSuccess: () => { setSuccess(true); queryClient.invalidateQueries({ queryKey: ["my-appointments"] }); toast({ title: "Agendamento confirmado!" }); setTimeout(() => navigate("/cliente/meus-agendamentos"), 2000); },
    onError: () => toast({ title: "Erro ao agendar", variant: "destructive" }),
  });

  if (success) return <div className="flex flex-col items-center justify-center py-20 animate-fade-in"><CheckCircle className="w-20 h-20 text-green-500 mb-4" /><h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2><p className="text-muted-foreground">Redirecionando...</p></div>;

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div><h1 className="text-3xl font-bold text-gradient-gold">Agendar Horário</h1><p className="text-muted-foreground mt-1">Escolha o serviço e horário desejado</p></div>

      <div className="flex gap-2 mb-6">{[1, 2, 3].map((s) => <div key={s} className={`flex-1 h-2 rounded-full ${step >= s ? "bg-primary" : "bg-secondary"}`} />)}</div>

      {step === 1 && (
        <Card className="glass-card"><CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" />Escolha o Serviço</CardTitle></CardHeader>
          <CardContent className="space-y-3">{services.map((s: any) => (
            <button key={s.id} onClick={() => { setFormData({ ...formData, service_id: s.id }); setStep(2); }} className={`w-full p-4 rounded-lg text-left transition-colors ${formData.service_id === s.id ? "bg-primary/20 border-primary" : "bg-secondary hover:bg-secondary/80"} border`}>
              <div className="flex justify-between items-center"><div><p className="font-medium">{s.name}</p><p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="w-3 h-3" />{s.duration_minutes} min</p></div><span className="font-bold text-primary">R$ {s.price.toFixed(2)}</span></div>
            </button>
          ))}</CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass-card"><CardHeader><CardTitle>Escolha o Barbeiro e Data</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2"><Label>Barbeiro</Label><Select value={formData.barber_id} onValueChange={(v) => setFormData({ ...formData, barber_id: v })}><SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{barbers.map((b: any) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Data</Label><Input type="date" min={new Date().toISOString().split("T")[0]} value={formData.appointment_date} onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} className="bg-secondary" /></div>
              <div className="space-y-2"><Label>Horário</Label><Input type="time" value={formData.appointment_time} onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })} className="bg-secondary" /></div>
            </div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(1)}>Voltar</Button><Button onClick={() => setStep(3)} disabled={!formData.barber_id || !formData.appointment_date || !formData.appointment_time} className="flex-1 bg-gradient-gold">Continuar</Button></div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="glass-card"><CardHeader><CardTitle>Confirmar Agendamento</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50 space-y-2"><p><strong>Serviço:</strong> {selectedService?.name}</p><p><strong>Barbeiro:</strong> {barbers.find((b: any) => b.id === formData.barber_id)?.name}</p><p><strong>Data:</strong> {formData.appointment_date.split("-").reverse().join("/")}</p><p><strong>Horário:</strong> {formData.appointment_time}</p><p className="text-xl font-bold text-primary">Total: R$ {selectedService?.price.toFixed(2)}</p></div>
            <div className="space-y-2"><Label>Observações (opcional)</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} placeholder="Alguma preferência ou observação?" className="bg-secondary" /></div>
            <div className="flex gap-2"><Button variant="outline" onClick={() => setStep(2)}>Voltar</Button><Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending} className="flex-1 bg-gradient-gold">{createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Agendamento"}</Button></div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
