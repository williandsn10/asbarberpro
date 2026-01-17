import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, Loader2, Save, AlertTriangle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface WorkingHours {
  opening_time: string;
  closing_time: string;
  slot_interval: number;
}

export default function Settings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<WorkingHours>({
    opening_time: "08:00",
    closing_time: "19:00",
    slot_interval: 30,
  });
  const [confirmText, setConfirmText] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", "working_hours"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "working_hours")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (settings?.value) {
      const value = settings.value as unknown as WorkingHours;
      setFormData({
        opening_time: value.opening_time || "08:00",
        closing_time: value.closing_time || "19:00",
        slot_interval: value.slot_interval || 30,
      });
    }
  }, [settings]);

  const updateMutation = useMutation({
    mutationFn: async (data: WorkingHours) => {
      const { error } = await supabase
        .from("settings")
        .update({ value: JSON.parse(JSON.stringify(data)) })
        .eq("key", "working_hours");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configurações", variant: "destructive" });
    },
  });

  // Delete mutations
  const deleteAppointmentsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["appointments"] });
      toast({ title: "Todos os agendamentos foram excluídos!" });
      setDeleteDialogOpen(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir agendamentos", variant: "destructive" });
    },
  });

  const deleteServicesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Todos os serviços foram excluídos!" });
      setDeleteDialogOpen(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir serviços", variant: "destructive" });
    },
  });

  const deleteBarbersMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("barbers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["barbers"] });
      toast({ title: "Todos os barbeiros foram excluídos!" });
      setDeleteDialogOpen(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir barbeiros", variant: "destructive" });
    },
  });

  const deleteBlockedTimesMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("blocked_times").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-times"] });
      toast({ title: "Todos os bloqueios foram excluídos!" });
      setDeleteDialogOpen(null);
    },
    onError: () => {
      toast({ title: "Erro ao excluir bloqueios", variant: "destructive" });
    },
  });

  const resetAllMutation = useMutation({
    mutationFn: async () => {
      // Delete in order to respect foreign keys
      const { error: appointmentsError } = await supabase.from("appointments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (appointmentsError) throw appointmentsError;
      
      const { error: blockedError } = await supabase.from("blocked_times").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (blockedError) throw blockedError;
      
      const { error: servicesError } = await supabase.from("services").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (servicesError) throw servicesError;
      
      const { error: barbersError } = await supabase.from("barbers").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (barbersError) throw barbersError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({ title: "Todos os dados foram resetados!" });
      setDeleteDialogOpen(null);
      setConfirmText("");
    },
    onError: () => {
      toast({ title: "Erro ao resetar dados", variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDeleteConfirm = (type: string) => {
    switch (type) {
      case "appointments":
        deleteAppointmentsMutation.mutate();
        break;
      case "services":
        deleteServicesMutation.mutate();
        break;
      case "barbers":
        deleteBarbersMutation.mutate();
        break;
      case "blocked_times":
        deleteBlockedTimesMutation.mutate();
        break;
      case "reset_all":
        if (confirmText === "CONFIRMAR") {
          resetAllMutation.mutate();
        }
        break;
    }
  };

  const isDeleting = 
    deleteAppointmentsMutation.isPending || 
    deleteServicesMutation.isPending || 
    deleteBarbersMutation.isPending || 
    deleteBlockedTimesMutation.isPending || 
    resetAllMutation.isPending;

  // Generate time options for select
  const generateTimeOptions = () => {
    const options = [];
    for (let hour = 0; hour < 24; hour++) {
      for (let min = 0; min < 60; min += 30) {
        const time = `${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`;
        options.push(time);
      }
    }
    return options;
  };

  const timeOptions = generateTimeOptions();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gradient-gold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações da barbearia</p>
      </div>

      <Card className="glass-card max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Horário de Funcionamento
          </CardTitle>
          <CardDescription>
            Configure o horário de abertura, fechamento e intervalo entre agendamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="opening_time">Horário de Abertura</Label>
                <Select
                  value={formData.opening_time}
                  onValueChange={(value) => setFormData({ ...formData, opening_time: value })}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing_time">Horário de Fechamento</Label>
                <Select
                  value={formData.closing_time}
                  onValueChange={(value) => setFormData({ ...formData, closing_time: value })}
                >
                  <SelectTrigger className="bg-secondary">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {timeOptions.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="slot_interval">Intervalo entre Horários (minutos)</Label>
              <Select
                value={formData.slot_interval.toString()}
                onValueChange={(value) =>
                  setFormData({ ...formData, slot_interval: parseInt(value) })
                }
              >
                <SelectTrigger className="bg-secondary">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutos</SelectItem>
                  <SelectItem value="30">30 minutos</SelectItem>
                  <SelectItem value="45">45 minutos</SelectItem>
                  <SelectItem value="60">60 minutos</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Define a cada quantos minutos um novo horário estará disponível para agendamento
              </p>
            </div>

            <div className="p-4 rounded-lg bg-secondary/50">
              <h4 className="font-medium mb-2">Prévia dos Horários</h4>
              <p className="text-sm text-muted-foreground">
                Os clientes poderão agendar de <strong>{formData.opening_time}</strong> até{" "}
                <strong>{formData.closing_time}</strong>, a cada{" "}
                <strong>{formData.slot_interval} minutos</strong>.
              </p>
            </div>

            <Button
              type="submit"
              className="bg-gradient-gold"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="glass-card max-w-2xl border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Zona de Perigo
          </CardTitle>
          <CardDescription>
            Ações irreversíveis - use com extremo cuidado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Delete Appointments */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-destructive/20">
            <div>
              <h4 className="font-medium">Limpar Agendamentos</h4>
              <p className="text-sm text-muted-foreground">Remove todos os agendamentos do sistema</p>
            </div>
            <AlertDialog open={deleteDialogOpen === "appointments"} onOpenChange={(open) => setDeleteDialogOpen(open ? "appointments" : null)}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todos os agendamentos?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Todos os agendamentos (passados e futuros) serão permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteConfirm("appointments")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteAppointmentsMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir Tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Services */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-destructive/20">
            <div>
              <h4 className="font-medium">Limpar Serviços</h4>
              <p className="text-sm text-muted-foreground">Remove todos os serviços cadastrados</p>
            </div>
            <AlertDialog open={deleteDialogOpen === "services"} onOpenChange={(open) => setDeleteDialogOpen(open ? "services" : null)}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todos os serviços?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Todos os serviços serão permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteConfirm("services")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteServicesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir Tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Barbers */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-destructive/20">
            <div>
              <h4 className="font-medium">Limpar Barbeiros</h4>
              <p className="text-sm text-muted-foreground">Remove todos os barbeiros cadastrados</p>
            </div>
            <AlertDialog open={deleteDialogOpen === "barbers"} onOpenChange={(open) => setDeleteDialogOpen(open ? "barbers" : null)}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todos os barbeiros?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Todos os barbeiros serão permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteConfirm("barbers")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteBarbersMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir Tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Delete Blocked Times */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-secondary/50 border border-destructive/20">
            <div>
              <h4 className="font-medium">Limpar Bloqueios</h4>
              <p className="text-sm text-muted-foreground">Remove todos os bloqueios de datas</p>
            </div>
            <AlertDialog open={deleteDialogOpen === "blocked_times"} onOpenChange={(open) => setDeleteDialogOpen(open ? "blocked_times" : null)}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir todos os bloqueios?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Todos os bloqueios de datas serão permanentemente excluídos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteConfirm("blocked_times")}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    {deleteBlockedTimesMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir Tudo"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {/* Reset All */}
          <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/10 border border-destructive">
            <div>
              <h4 className="font-medium text-destructive">⚠️ RESET TOTAL</h4>
              <p className="text-sm text-muted-foreground">Apaga TODOS os dados (exceto admins e configurações)</p>
            </div>
            <AlertDialog open={deleteDialogOpen === "reset_all"} onOpenChange={(open) => {
              setDeleteDialogOpen(open ? "reset_all" : null);
              if (!open) setConfirmText("");
            }}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isDeleting}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  RESET
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-destructive">⚠️ RESET TOTAL DO SISTEMA</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-3">
                    <p>Esta ação é <strong>IRREVERSÍVEL</strong> e irá excluir:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm">
                      <li>Todos os agendamentos</li>
                      <li>Todos os serviços</li>
                      <li>Todos os barbeiros</li>
                      <li>Todos os bloqueios de datas</li>
                    </ul>
                    <p className="font-medium">Para confirmar, digite "CONFIRMAR" abaixo:</p>
                    <Input
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      placeholder="Digite CONFIRMAR"
                      className="mt-2"
                    />
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => handleDeleteConfirm("reset_all")}
                    className="bg-destructive hover:bg-destructive/90"
                    disabled={confirmText !== "CONFIRMAR" || resetAllMutation.isPending}
                  >
                    {resetAllMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "RESETAR TUDO"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
