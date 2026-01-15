import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Scissors, Plus, Edit, Trash2, Clock, DollarSign, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Service {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
}

export default function Services() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: "", price: "", duration_minutes: "" });

  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data, error } = await supabase.from("services").select("*").order("name");
      if (error) throw error;
      return data as Service[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: { name: string; price: number; duration_minutes: number }) => {
      const { error } = await supabase.from("services").insert(data);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Serviço criado com sucesso!" });
      handleCloseDialog();
    },
    onError: () => toast({ title: "Erro ao criar serviço", variant: "destructive" }),
  });

  const updateMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; price: number; duration_minutes: number }) => {
      const { error } = await supabase.from("services").update({ name: data.name, price: data.price, duration_minutes: data.duration_minutes }).eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Serviço atualizado!" });
      handleCloseDialog();
    },
    onError: () => toast({ title: "Erro ao atualizar", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("services").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Serviço removido!" });
      setIsDeleteDialogOpen(false);
    },
    onError: () => toast({ title: "Erro ao remover", variant: "destructive" }),
  });

  const handleCloseDialog = () => { setIsDialogOpen(false); setSelectedService(null); setFormData({ name: "", price: "", duration_minutes: "" }); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = { name: formData.name, price: parseFloat(formData.price), duration_minutes: parseInt(formData.duration_minutes) };
    selectedService ? updateMutation.mutate({ id: selectedService.id, ...data }) : createMutation.mutate(data);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-gold">Serviços</h1>
          <p className="text-muted-foreground mt-1">Gerencie os serviços oferecidos</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} className="bg-gradient-gold"><Plus className="w-4 h-4 mr-2" />Novo Serviço</Button>
      </div>

      <Card className="glass-card">
        <CardHeader><CardTitle className="flex items-center gap-2"><Scissors className="w-5 h-5 text-primary" />Serviços ({services.length})</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div> : services.length === 0 ? <div className="text-center py-8 text-muted-foreground"><Scissors className="w-12 h-12 mx-auto mb-3 opacity-50" /><p>Nenhum serviço cadastrado</p></div> : (
            <Table>
              <TableHeader><TableRow><TableHead>Serviço</TableHead><TableHead>Preço</TableHead><TableHead>Duração</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id}>
                    <TableCell className="font-medium">{service.name}</TableCell>
                    <TableCell><span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />R$ {service.price.toFixed(2)}</span></TableCell>
                    <TableCell><span className="flex items-center gap-1"><Clock className="w-3 h-3" />{service.duration_minutes} min</span></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedService(service); setFormData({ name: service.name, price: service.price.toString(), duration_minutes: service.duration_minutes.toString() }); setIsDialogOpen(true); }}><Edit className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedService(service); setIsDeleteDialogOpen(true); }} className="text-destructive"><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{selectedService ? "Editar" : "Novo"} Serviço</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2"><Label>Nome</Label><Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required className="bg-secondary" /></div>
              <div className="space-y-2"><Label>Preço (R$)</Label><Input type="number" step="0.01" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })} required className="bg-secondary" /></div>
              <div className="space-y-2"><Label>Duração (minutos)</Label><Input type="number" value={formData.duration_minutes} onChange={(e) => setFormData({ ...formData, duration_minutes: e.target.value })} required className="bg-secondary" /></div>
            </div>
            <DialogFooter><Button type="button" variant="outline" onClick={handleCloseDialog}>Cancelar</Button><Button type="submit" className="bg-gradient-gold">Salvar</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass-card">
          <AlertDialogHeader><AlertDialogTitle>Confirmar exclusão</AlertDialogTitle><AlertDialogDescription>Remover o serviço "{selectedService?.name}"?</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => selectedService && deleteMutation.mutate(selectedService.id)} className="bg-destructive">Remover</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
