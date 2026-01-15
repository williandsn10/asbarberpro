import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Plus, Edit, Loader2, CheckCircle, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";

export default function Appointments() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
  const [formData, setFormData] = useState({ client_id: "", service_id: "", appointment_date: "", appointment_time: "", notes: "" });
  const [filterDate, setFilterDate] = useState(format(new Date(), "yyyy-MM-dd"));
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: appointments = [], isLoading } = useQuery({
    queryKey: ["appointments", filterDate],
    queryFn: async () => {
      const { data, error } = await supabase.from("appointments").select(`*, client:profiles!appointments_client_id_fkey(name, phone), service:services(name, price)`).eq("appointment_date", filterDate).order("appointment_time");
      if (error) throw error;
      return data;
    },
  });

  const { data: clients = [] } = useQuery({ queryKey: ["clients-list"], queryFn: async () => { const { data } = await supabase.from("profiles").select("id, name").eq("user_type", "client"); return data || []; } });
  const { data: services = [] } = useQuery({ queryKey: ["services-list"], queryFn: async () => { const { data } = await supabase.from("services").select("*"); return data || []; } });
  

  const createMutation = useMutation({
    mutationFn: async (data: any) => { const { error } = await supabase.from("appointments").insert(data); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast({ title: "Agendamento criado!" }); handleCloseDialog(); },
    onError: () => toast({ title: "Erro ao criar", variant: "destructive" }),
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "scheduled" | "completed" | "cancelled" }) => { const { error } = await supabase.from("appointments").update({ status }).eq("id", id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["appointments"] }); toast({ title: "Status atualizado!" }); },
  });

  const handleCloseDialog = () => { setIsDialogOpen(false); setSelectedAppointment(null); setFormData({ client_id: "", service_id: "", appointment_date: "", appointment_time: "", notes: "" }); };

  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); createMutation.mutate(formData); };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = { scheduled: "bg-blue-500/20 text-blue-400", completed: "bg-green-500/20 text-green-400", cancelled: "bg-red-500/20 text-red-400" };
    const labels: Record<string, string> = { scheduled: "Agendado", completed: "Concluído", cancelled: "Cancelado" };
    return <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>{labels[status]}</span>;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div><h1 className="text-3xl font-bold text-gradient-gold">Agendamentos</h1><p className="text-muted-foreground mt-1">Gerencie os horários marcados</p></div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-gold"><Plus className="w-4 h-4 mr-2" />Novo Agendamento</Button>
      </div>

      <Card className="glass-card">
        <CardContent className="pt-6"><div className="flex items-center gap-4"><Label>Data:</Label><Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className="w-auto bg-secondary" /></div></CardContent>
      </Card>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Calendar className="w-5 h-5 text-primary" />Agendamentos - {format(new Date(filterDate + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : appointments.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum agendamento</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Horário</TableHead><TableHead>Cliente</TableHead><TableHead>Serviço</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {appointments.map((apt: any) => (
                  <TableRow key={apt.id}>
                    <TableCell className="font-bold text-primary">{apt.appointment_time?.slice(0, 5)}</TableCell>
                    <TableCell>{apt.client?.name}</TableCell>
                    <TableCell>{apt.service?.name}</TableCell>
                    
                    <TableCell>{getStatusBadge(apt.status)}</TableCell>
                    <TableCell className="text-right">
                      {apt.status === "scheduled" && <>
                        <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "completed" })} className="text-green-500"><CheckCircle className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => updateStatusMutation.mutate({ id: apt.id, status: "cancelled" })} className="text-destructive"><XCircle className="w-4 h-4" /></Button>
                      </>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="glass-card">
          <DialogHeader><DialogTitle>Novo Agendamento</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Cliente</Label><Select value={formData.client_id} onValueChange={(v) => setFormData({ ...formData, client_id: v })}><SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select></div>
              <div className="space-y-2"><Label>Serviço</Label><Select value={formData.service_id} onValueChange={(v) => setFormData({ ...formData, service_id: v })}><SelectTrigger className="bg-secondary"><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{services.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.name} - R$ {s.price}</SelectItem>)}</SelectContent></Select></div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Data</Label><Input type="date" value={formData.appointment_date} onChange={(e) => setFormData({ ...formData, appointment_date: e.target.value })} required className="bg-secondary" /></div>
                <div className="space-y-2"><Label>Horário</Label><Input type="time" value={formData.appointment_time} onChange={(e) => setFormData({ ...formData, appointment_time: e.target.value })} required className="bg-secondary" /></div>
              </div>
              <div className="space-y-2"><Label>Observações</Label><Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-secondary" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button><Button type="submit" className="bg-gradient-gold">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
