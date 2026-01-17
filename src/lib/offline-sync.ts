import { supabase } from "@/integrations/supabase/client";

const PENDING_APPOINTMENTS_KEY = "barberpro_pending_appointments";

export interface PendingAppointment {
  id: string;
  service_id: string;
  barber_id: string;
  client_id: string;
  appointment_date: string;
  appointment_time: string;
  notes?: string;
  created_at: string;
}

export function savePendingAppointment(appointment: Omit<PendingAppointment, "id" | "created_at">) {
  const pending = getPendingAppointments();
  const newAppointment: PendingAppointment = {
    ...appointment,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  pending.push(newAppointment);
  localStorage.setItem(PENDING_APPOINTMENTS_KEY, JSON.stringify(pending));
  return newAppointment;
}

export function getPendingAppointments(): PendingAppointment[] {
  try {
    const stored = localStorage.getItem(PENDING_APPOINTMENTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function clearPendingAppointments() {
  localStorage.removeItem(PENDING_APPOINTMENTS_KEY);
}

export function removePendingAppointment(id: string) {
  const pending = getPendingAppointments();
  const filtered = pending.filter((a) => a.id !== id);
  localStorage.setItem(PENDING_APPOINTMENTS_KEY, JSON.stringify(filtered));
}

export async function syncPendingAppointments(): Promise<{
  synced: number;
  failed: number;
}> {
  const pending = getPendingAppointments();
  
  if (pending.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const appointment of pending) {
    try {
      const { error } = await supabase.from("appointments").insert({
        service_id: appointment.service_id,
        barber_id: appointment.barber_id,
        client_id: appointment.client_id,
        appointment_date: appointment.appointment_date,
        appointment_time: appointment.appointment_time,
        notes: appointment.notes || null,
        status: "pending",
      });

      if (error) {
        console.error("Failed to sync appointment:", error);
        failed++;
      } else {
        removePendingAppointment(appointment.id);
        synced++;
      }
    } catch (err) {
      console.error("Error syncing appointment:", err);
      failed++;
    }
  }

  return { synced, failed };
}

export function hasPendingData(): boolean {
  return getPendingAppointments().length > 0;
}
