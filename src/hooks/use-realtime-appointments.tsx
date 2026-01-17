import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell } from "lucide-react";

export function useRealtimeAppointments() {
  const queryClient = useQueryClient();
  const isFirstLoadRef = useRef(true);

  useEffect(() => {
    const channel = supabase
      .channel("admin-appointments-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "appointments",
          filter: "status=eq.pending",
        },
        async (payload) => {
          // Skip notification on initial load
          if (isFirstLoadRef.current) {
            isFirstLoadRef.current = false;
            return;
          }

          // Fetch client and service details for the notification
          const { data: appointment } = await supabase
            .from("appointments")
            .select(`
              *,
              client:profiles!appointments_client_id_fkey(name),
              service:services(name)
            `)
            .eq("id", payload.new.id)
            .single();

          if (appointment) {
            const clientName = appointment.client?.name || "Cliente";
            const serviceName = appointment.service?.name || "Serviço";
            const time = appointment.appointment_time?.slice(0, 5);
            const date = new Date(appointment.appointment_date).toLocaleDateString("pt-BR");

            toast.info(
              `Novo agendamento pendente`,
              {
                description: `${clientName} - ${serviceName} em ${date} às ${time}`,
                duration: 8000,
                icon: <Bell className="w-5 h-5 text-primary" />,
              }
            );

            // Play notification sound
            try {
              const audio = new Audio("/notification.mp3");
              audio.volume = 0.5;
              audio.play().catch(() => {});
            } catch (e) {
              // Audio not available
            }
          }

          // Invalidate queries to refresh data
          queryClient.invalidateQueries({ queryKey: ["pending-appointments-count"] });
          queryClient.invalidateQueries({ queryKey: ["appointments"] });
          queryClient.invalidateQueries({ queryKey: ["today-appointments"] });
        }
      )
      .subscribe();

    // Mark first load as complete after a short delay
    const timer = setTimeout(() => {
      isFirstLoadRef.current = false;
    }, 2000);

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
}
