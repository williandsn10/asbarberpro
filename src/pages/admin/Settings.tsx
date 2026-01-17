import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Settings as SettingsIcon, Clock, Loader2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

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
    </div>
  );
}
