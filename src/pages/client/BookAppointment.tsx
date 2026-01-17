import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar as CalendarIcon, Scissors, Clock, Loader2 } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface WorkingHours {
  opening_time: string;
  closing_time: string;
  slot_interval: number;
}

// Gerar slots dinamicamente baseado nas configurações
const generateTimeSlots = (openingTime: string, closingTime: string, interval: number): string[] => {
  const slots: string[] = [];
  const [openHour, openMin] = openingTime.split(":").map(Number);
  const [closeHour, closeMin] = closingTime.split(":").map(Number);
  
  let currentMinutes = openHour * 60 + openMin;
  const endMinutes = closeHour * 60 + closeMin;
  
  while (currentMinutes < endMinutes) {
    const hour = Math.floor(currentMinutes / 60);
    const min = currentMinutes % 60;
    slots.push(`${hour.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`);
    currentMinutes += interval;
  }
  
  return slots;
};

export default function BookAppointment() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    service_id: "",
    appointment_date: "",
    appointment_time: "",
    notes: "",
  });
  const [success, setSuccess] = useState(false);

  const { data: services = [] } = useQuery({
    queryKey: ["services"],
    queryFn: async () => {
      const { data } = await supabase.from("services").select("*").order("name");
      return data || [];
    },
  });

  const { data: barber } = useQuery({
    queryKey: ["default-barber"],
    queryFn: async () => {
      const { data } = await supabase
        .from("barbers")
        .select("*")
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();
      return data;
    },
  });

  // Buscar configurações de horário de funcionamento
  const { data: workingHoursSettings } = useQuery({
    queryKey: ["settings", "working_hours"],
    queryFn: async () => {
      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("key", "working_hours")
        .maybeSingle();
      return data?.value as unknown as WorkingHours | null;
    },
  });

  // Buscar dias fechados da semana
  const { data: closedDays = [] } = useQuery({
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

  // Gerar slots baseado nas configurações
  const allTimeSlots = useMemo(() => {
    const settings = workingHoursSettings || { opening_time: "08:00", closing_time: "19:00", slot_interval: 30 };
    return generateTimeSlots(settings.opening_time, settings.closing_time, settings.slot_interval);
  }, [workingHoursSettings]);

  // Buscar bloqueios para a data selecionada
  const { data: blockedTimes = [] } = useQuery({
    queryKey: ["blocked-times-for-date", formData.appointment_date],
    queryFn: async () => {
      if (!formData.appointment_date) return [];
      const { data } = await supabase
        .from("blocked_times")
        .select("*")
        .eq("blocked_date", formData.appointment_date);
      return data || [];
    },
    enabled: !!formData.appointment_date,
  });

  // Buscar agendamentos existentes para a data selecionada
  const { data: existingAppointments = [] } = useQuery({
    queryKey: ["existing-appointments", formData.appointment_date],
    queryFn: async () => {
      if (!formData.appointment_date) return [];
      const { data } = await supabase
        .from("appointments")
        .select("appointment_time")
        .eq("appointment_date", formData.appointment_date)
        .neq("status", "cancelled");
      return data || [];
    },
    enabled: !!formData.appointment_date,
  });

  // Verificar se o dia da semana está fechado
  const isDayOfWeekClosed = useMemo(() => {
    if (!formData.appointment_date) return false;
    const selectedDate = new Date(formData.appointment_date + "T00:00:00");
    const dayOfWeek = selectedDate.getDay();
    return closedDays.includes(dayOfWeek);
  }, [formData.appointment_date, closedDays]);

  // Verificar se a data inteira está bloqueada
  const isFullDayBlocked = useMemo(() => {
    return blockedTimes.some((block: any) => block.is_full_day);
  }, [blockedTimes]);

  // Filtrar horários disponíveis
  const availableSlots = useMemo(() => {
    if (!formData.appointment_date || isFullDayBlocked || isDayOfWeekClosed) return [];

    return allTimeSlots.filter((slot) => {
      // Verificar se está em período bloqueado
      const isBlocked = blockedTimes.some((block: any) => {
        if (block.is_full_day) return true;
        if (!block.start_time || !block.end_time) return false;
        const slotTime = slot;
        const startTime = block.start_time.slice(0, 5);
        const endTime = block.end_time.slice(0, 5);
        return slotTime >= startTime && slotTime < endTime;
      });

      // Verificar se já está agendado
      const isBooked = existingAppointments.some(
        (apt: any) => apt.appointment_time.slice(0, 5) === slot
      );

      return !isBlocked && !isBooked;
    });
  }, [formData.appointment_date, blockedTimes, existingAppointments, isFullDayBlocked, isDayOfWeekClosed, allTimeSlots]);

  const selectedService = services.find((s: any) => s.id === formData.service_id);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!profile) throw new Error("Não autenticado");
      if (!barber) throw new Error("Nenhum barbeiro disponível");
      const { error } = await supabase.from("appointments").insert({
        client_id: profile.id,
        service_id: formData.service_id,
        barber_id: barber.id,
        appointment_date: formData.appointment_date,
        appointment_time: formData.appointment_time,
        notes: formData.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["my-appointments"] });
      toast({
        title: "Agendamento enviado!",
        description: "Aguardando confirmação do barbeiro.",
      });
      setTimeout(() => navigate("/cliente/meus-agendamentos"), 2000);
    },
    onError: () => toast({ title: "Erro ao agendar", variant: "destructive" }),
  });

  if (success)
    return (
      <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
        <Clock className="w-20 h-20 text-yellow-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Agendamento Enviado!</h2>
        <p className="text-muted-foreground">Aguardando confirmação do barbeiro...</p>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold text-gradient-gold">Agendar Horário</h1>
        <p className="text-muted-foreground mt-1">Escolha o serviço e horário desejado</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 rounded-full ${step >= s ? "bg-primary" : "bg-secondary"}`}
          />
        ))}
      </div>

      {step === 1 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              Escolha o Serviço
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {services.map((s: any) => (
              <button
                key={s.id}
                onClick={() => {
                  setFormData({ ...formData, service_id: s.id });
                  setStep(2);
                }}
                className={`w-full p-4 rounded-lg text-left transition-colors ${
                  formData.service_id === s.id
                    ? "bg-primary/20 border-primary"
                    : "bg-secondary hover:bg-secondary/80"
                } border`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {s.duration_minutes} min
                    </p>
                  </div>
                  <span className="font-bold text-primary">R$ {s.price.toFixed(2)}</span>
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="w-5 h-5 text-primary" />
              Escolha a Data e Horário
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label>Data</Label>
              <div className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={formData.appointment_date ? new Date(formData.appointment_date + "T00:00:00") : undefined}
                  onSelect={(date) => {
                    if (date) {
                      const formatted = date.toISOString().split("T")[0];
                      setFormData({ ...formData, appointment_date: formatted, appointment_time: "" });
                    }
                  }}
                  disabled={(date) => {
                    // Desabilitar datas passadas
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    if (date < today) return true;
                    // Desabilitar dias fechados da semana
                    if (closedDays.includes(date.getDay())) return true;
                    return false;
                  }}
                  className="rounded-md border bg-secondary/50 pointer-events-auto"
                />
              </div>
              {formData.appointment_date && (
                <p className="text-center text-sm text-muted-foreground">
                  Data selecionada: <span className="text-primary font-medium">
                    {new Date(formData.appointment_date + "T00:00:00").toLocaleDateString("pt-BR", { 
                      weekday: 'long', 
                      day: 'numeric', 
                      month: 'long' 
                    })}
                  </span>
                </p>
              )}
            </div>

            {formData.appointment_date && (
              <div className="space-y-2">
                <Label>Horário Disponível</Label>
                {isDayOfWeekClosed ? (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                    <p className="text-destructive font-medium">
                      A barbearia não funciona neste dia da semana
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Por favor, escolha outro dia
                    </p>
                  </div>
                ) : isFullDayBlocked ? (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-center">
                    <p className="text-destructive font-medium">
                      Este dia não está disponível para agendamentos
                    </p>
                  </div>
                ) : availableSlots.length === 0 ? (
                  <div className="p-4 rounded-lg bg-muted text-center">
                    <p className="text-muted-foreground">
                      Nenhum horário disponível nesta data
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        type="button"
                        variant={formData.appointment_time === slot ? "default" : "outline"}
                        className={
                          formData.appointment_time === slot
                            ? "bg-gradient-gold"
                            : "hover:bg-primary/10"
                        }
                        onClick={() => setFormData({ ...formData, appointment_time: slot })}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                onClick={() => setStep(3)}
                disabled={!formData.appointment_date || !formData.appointment_time}
                className="flex-1 bg-gradient-gold"
              >
                Continuar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card className="glass-card">
          <CardHeader>
            <CardTitle>Confirmar Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-secondary/50 space-y-2">
              <p>
                <strong>Serviço:</strong> {selectedService?.name}
              </p>
              <p>
                <strong>Data:</strong> {formData.appointment_date.split("-").reverse().join("/")}
              </p>
              <p>
                <strong>Horário:</strong> {formData.appointment_time}
              </p>
              <p className="text-xl font-bold text-primary">
                Total: R$ {selectedService?.price.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Observações (opcional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Alguma preferência ou observação?"
                className="bg-secondary"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Voltar
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="flex-1 bg-gradient-gold"
              >
                {createMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Confirmar Agendamento"
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
