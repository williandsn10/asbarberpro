import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Plus, Pencil, Trash2, CalendarOff, Loader2, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "@/hooks/use-mobile";

const DAYS_OF_WEEK = [
  { value: 0, label: "Dom", fullLabel: "Domingo" },
  { value: 1, label: "Seg", fullLabel: "Segunda" },
  { value: 2, label: "Ter", fullLabel: "Terça" },
  { value: 3, label: "Qua", fullLabel: "Quarta" },
  { value: 4, label: "Qui", fullLabel: "Quinta" },
  { value: 5, label: "Sex", fullLabel: "Sexta" },
  { value: 6, label: "Sáb", fullLabel: "Sábado" },
];

interface BlockedTime {
  id: string;
  blocked_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
  is_full_day: boolean;
  created_at: string;
}

interface FormData {
  blocked_date: string;
  start_time: string;
  end_time: string;
  reason: string;
  is_full_day: boolean;
}

const initialFormData: FormData = {
  blocked_date: "",
  start_time: "08:00",
  end_time: "18:00",
  reason: "",
  is_full_day: false,
};

export default function BlockedTimes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<BlockedTime | null>(null);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [closedDays, setClosedDays] = useState<number[]>([]);

  // Buscar dias fechados da semana
  const { data: closedDaysSettings, isLoading: isLoadingClosedDays } = useQuery({
    queryKey: ["settings", "closed_days"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "closed_days")
        .maybeSingle();
      return (data?.value as number[]) || [];
    },
  });

  useEffect(() => {
    if (closedDaysSettings) {
      setClosedDays(closedDaysSettings);
    }
  }, [closedDaysSettings]);

  // Mutation para salvar dias fechados
  const closedDaysMutation = useMutation({
    mutationFn: async (days: number[]) => {
      // Verificar se já existe a configuração
      const { data: existing } = await supabase
        .from("settings")
        .select("id")
        .eq("key", "closed_days")
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("settings")
          .update({ value: days })
          .eq("key", "closed_days");
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("settings")
          .insert({ key: "closed_days", value: days });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings", "closed_days"] });
      toast({ title: "Dias de funcionamento atualizados!" });
    },
    onError: () => {
      toast({ title: "Erro ao salvar configuração", variant: "destructive" });
    },
  });

  const toggleDay = (day: number) => {
    setClosedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const { data: blockedTimes = [], isLoading } = useQuery({
    queryKey: ["blocked-times"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blocked_times")
        .select("*")
        .gte("blocked_date", new Date().toISOString().split("T")[0])
        .order("blocked_date", { ascending: true });
      if (error) throw error;
      return data as BlockedTime[];
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const insertData = {
        blocked_date: data.blocked_date,
        start_time: data.is_full_day ? null : data.start_time,
        end_time: data.is_full_day ? null : data.end_time,
        reason: data.reason || null,
        is_full_day: data.is_full_day,
      };
      const { error } = await supabase.from("blocked_times").insert(insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-times"] });
      toast({ title: "Bloqueio criado com sucesso!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao criar bloqueio", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const updateData = {
        blocked_date: data.blocked_date,
        start_time: data.is_full_day ? null : data.start_time,
        end_time: data.is_full_day ? null : data.end_time,
        reason: data.reason || null,
        is_full_day: data.is_full_day,
      };
      const { error } = await supabase.from("blocked_times").update(updateData).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-times"] });
      toast({ title: "Bloqueio atualizado com sucesso!" });
      handleCloseDialog();
    },
    onError: () => {
      toast({ title: "Erro ao atualizar bloqueio", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blocked_times").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blocked-times"] });
      toast({ title: "Bloqueio removido com sucesso!" });
      setDeleteId(null);
    },
    onError: () => {
      toast({ title: "Erro ao remover bloqueio", variant: "destructive" });
    },
  });

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedItem(null);
    setFormData(initialFormData);
  };

  const handleEdit = (item: BlockedTime) => {
    setSelectedItem(item);
    setFormData({
      blocked_date: item.blocked_date,
      start_time: item.start_time || "08:00",
      end_time: item.end_time || "18:00",
      reason: item.reason || "",
      is_full_day: item.is_full_day,
    });
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return format(date, "dd/MM/yyyy (EEEE)", { locale: ptBR });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient-gold">Bloqueio de Horários</h1>
          <p className="text-muted-foreground mt-1 hidden sm:block">Gerencie períodos de indisponibilidade</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => !open && handleCloseDialog()}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-gold" onClick={() => setIsDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              {isMobile ? "Novo" : "Novo Bloqueio"}
            </Button>
          </DialogTrigger>
          <DialogContent className="glass-card border-border">
            <DialogHeader>
              <DialogTitle>{selectedItem ? "Editar Bloqueio" : "Novo Bloqueio"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="blocked_date">Data</Label>
                <Input
                  id="blocked_date"
                  type="date"
                  required
                  min={new Date().toISOString().split("T")[0]}
                  value={formData.blocked_date}
                  onChange={(e) => setFormData({ ...formData, blocked_date: e.target.value })}
                  className="bg-secondary"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is_full_day">Dia inteiro</Label>
                <Switch
                  id="is_full_day"
                  checked={formData.is_full_day}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_full_day: checked })}
                />
              </div>

              {!formData.is_full_day && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_time">Horário Início</Label>
                    <Input
                      id="start_time"
                      type="time"
                      required={!formData.is_full_day}
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end_time">Horário Fim</Label>
                    <Input
                      id="end_time"
                      type="time"
                      required={!formData.is_full_day}
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="bg-secondary"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="reason">Motivo (opcional)</Label>
                <Textarea
                  id="reason"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="Ex: Folga, Compromisso pessoal..."
                  className="bg-secondary"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  className="bg-gradient-gold"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {(createMutation.isPending || updateMutation.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {selectedItem ? "Salvar" : "Criar Bloqueio"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Seção Dias de Funcionamento */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Dias de Funcionamento
          </CardTitle>
          <CardDescription>
            Selecione os dias em que a barbearia funciona. Dias desmarcados não aparecerão para agendamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoadingClosedDays ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-2">
                {DAYS_OF_WEEK.map((day) => {
                  const isOpen = !closedDays.includes(day.value);
                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg border-2 transition-all active:scale-[0.98] ${
                        isOpen
                          ? "bg-green-500/20 border-green-500 text-green-400"
                          : "bg-secondary border-transparent text-muted-foreground"
                      }`}
                    >
                      <span className="text-xs sm:text-sm font-medium">{day.label}</span>
                      <span className="text-lg sm:text-xl mt-1">{isOpen ? "✓" : "✗"}</span>
                    </button>
                  );
                })}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <p className="text-sm text-muted-foreground">
                  {closedDays.length === 0 
                    ? "Funcionando todos os dias" 
                    : `Fechado: ${closedDays.sort().map(d => DAYS_OF_WEEK.find(day => day.value === d)?.fullLabel).join(", ")}`
                  }
                </p>
                <Button
                  onClick={() => closedDaysMutation.mutate(closedDays)}
                  disabled={closedDaysMutation.isPending}
                  className="bg-gradient-gold"
                >
                  {closedDaysMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Salvar Dias
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Bloqueios Específicos */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-primary" />
            Bloqueios Específicos
          </CardTitle>
          <CardDescription>
            Bloqueie datas ou horários específicos (feriados, folgas, etc.)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : blockedTimes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CalendarOff className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum bloqueio cadastrado</p>
            </div>
          ) : isMobile ? (
            <div className="space-y-3">
              {blockedTimes.map((item) => (
                <div key={item.id} className="glass-card p-4 rounded-lg space-y-3">
                  <div>
                    <p className="font-medium">{formatDate(item.blocked_date)}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.is_full_day ? (
                        <span className="text-destructive font-medium">Dia Inteiro</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                        </span>
                      )}
                    </p>
                    {item.reason && (
                      <p className="text-sm text-muted-foreground mt-1">{item.reason}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10"
                      onClick={() => handleEdit(item)}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 h-10 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(item.id)}
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Excluir
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Motivo</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {blockedTimes.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{formatDate(item.blocked_date)}</TableCell>
                    <TableCell>
                      {item.is_full_day ? (
                        <span className="text-destructive font-medium">Dia Inteiro</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {item.start_time?.slice(0, 5)} - {item.end_time?.slice(0, 5)}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.reason || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-1 justify-end">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(item)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(item.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle>Remover Bloqueio</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja remover este bloqueio? Os clientes poderão agendar neste horário.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
