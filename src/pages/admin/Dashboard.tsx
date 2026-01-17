import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Calendar, Scissors, DollarSign, Clock, TrendingUp, TrendingDown, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth, subDays, eachDayOfInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface WorkingHours {
  opening_time: string;
  closing_time: string;
  slot_interval: number;
}

const CHART_COLORS = [
  "hsl(45, 93%, 47%)",   // Gold
  "hsl(45, 80%, 55%)",   // Light gold
  "hsl(30, 70%, 50%)",   // Orange gold
  "hsl(45, 60%, 40%)",   // Dark gold
  "hsl(50, 85%, 60%)",   // Bright gold
];

export default function AdminDashboard() {
  const [revenuePeriod, setRevenuePeriod] = useState<string>("30");
  const today = new Date();
  const monthStart = startOfMonth(today);
  const monthEnd = endOfMonth(today);

  // Working hours settings
  const { data: workingHoursSettings } = useQuery({
    queryKey: ["working-hours-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("settings")
        .select("value")
        .eq("key", "working_hours")
        .maybeSingle();

      if (error) throw error;
      return data?.value as unknown as WorkingHours || { opening_time: "08:00", closing_time: "19:00", slot_interval: 30 };
    },
  });

  // Total clients
  const { data: clientsCount = 0 } = useQuery({
    queryKey: ["clients-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("user_type", "client");

      if (error) throw error;
      return count || 0;
    },
  });

  // Today's appointments
  const { data: todayAppointments = [] } = useQuery({
    queryKey: ["today-appointments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`
          *,
          client:profiles!appointments_client_id_fkey(name, phone),
          service:services(name, price, duration_minutes),
          barber:barbers(name)
        `)
        .eq("appointment_date", format(today, "yyyy-MM-dd"))
        .order("appointment_time", { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });

  // Completed services this month
  const { data: completedServicesCount = 0 } = useQuery({
    queryKey: ["completed-services-month"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("appointment_date", format(monthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(monthEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return count || 0;
    },
  });

  // Monthly revenue
  const { data: monthlyRevenue = 0 } = useQuery({
    queryKey: ["monthly-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("appointments")
        .select(`service:services(price)`)
        .eq("status", "completed")
        .gte("appointment_date", format(monthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(monthEnd, "yyyy-MM-dd"));

      if (error) throw error;
      return data?.reduce((sum, apt) => sum + (apt.service?.price || 0), 0) || 0;
    },
  });

  // Occupancy rate for current month
  const { data: occupancyRate = 0 } = useQuery({
    queryKey: ["occupancy-rate", workingHoursSettings],
    queryFn: async () => {
      if (!workingHoursSettings) return 0;

      const { data: appointments, error } = await supabase
        .from("appointments")
        .select("appointment_date, appointment_time")
        .gte("appointment_date", format(monthStart, "yyyy-MM-dd"))
        .lte("appointment_date", format(monthEnd, "yyyy-MM-dd"))
        .in("status", ["scheduled", "completed", "pending"]);

      if (error) throw error;

      // Calculate total available slots in the month
      const daysInMonth = eachDayOfInterval({ start: monthStart, end: today });
      const openHour = parseInt(workingHoursSettings.opening_time.split(":")[0]);
      const closeHour = parseInt(workingHoursSettings.closing_time.split(":")[0]);
      const slotsPerDay = ((closeHour - openHour) * 60) / workingHoursSettings.slot_interval;
      const totalSlots = daysInMonth.length * slotsPerDay;

      const bookedSlots = appointments?.length || 0;
      return totalSlots > 0 ? Math.round((bookedSlots / totalSlots) * 100) : 0;
    },
    enabled: !!workingHoursSettings,
  });

  // Popular times (last 30 days)
  const { data: popularTimesData = [] } = useQuery({
    queryKey: ["popular-times"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select("appointment_time")
        .gte("appointment_date", thirtyDaysAgo)
        .in("status", ["scheduled", "completed"]);

      if (error) throw error;

      // Group by hour
      const grouped = (data || []).reduce((acc, apt) => {
        const hour = apt.appointment_time?.slice(0, 5) || "00:00";
        acc[hour] = (acc[hour] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped)
        .map(([time, count]) => ({ time, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    },
  });

  // Revenue by period
  const { data: revenueChartData = [] } = useQuery({
    queryKey: ["revenue-chart", revenuePeriod],
    queryFn: async () => {
      const days = parseInt(revenuePeriod);
      const startDate = format(subDays(today, days), "yyyy-MM-dd");

      const { data, error } = await supabase
        .from("appointments")
        .select(`appointment_date, service:services(price)`)
        .eq("status", "completed")
        .gte("appointment_date", startDate)
        .order("appointment_date");

      if (error) throw error;

      // Group by date
      const grouped = (data || []).reduce((acc, apt) => {
        const date = apt.appointment_date;
        acc[date] = (acc[date] || 0) + (apt.service?.price || 0);
        return acc;
      }, {} as Record<string, number>);

      // Fill in missing dates with 0
      const dateRange = eachDayOfInterval({ start: subDays(today, days), end: today });
      return dateRange.map(date => {
        const dateStr = format(date, "yyyy-MM-dd");
        return {
          date: format(date, "dd/MM"),
          fullDate: dateStr,
          revenue: grouped[dateStr] || 0,
        };
      });
    },
  });

  // Popular services
  const { data: popularServicesData = [] } = useQuery({
    queryKey: ["popular-services"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");
      const { data, error } = await supabase
        .from("appointments")
        .select(`service:services(id, name)`)
        .gte("appointment_date", thirtyDaysAgo)
        .in("status", ["scheduled", "completed"]);

      if (error) throw error;

      // Count by service
      const grouped = (data || []).reduce((acc, apt) => {
        const serviceName = apt.service?.name || "Desconhecido";
        acc[serviceName] = (acc[serviceName] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(grouped)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
  });

  // Cancellation rate
  const { data: cancellationRate = 0 } = useQuery({
    queryKey: ["cancellation-rate"],
    queryFn: async () => {
      const thirtyDaysAgo = format(subDays(today, 30), "yyyy-MM-dd");
      
      const { count: totalCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .gte("appointment_date", thirtyDaysAgo);

      const { count: cancelledCount } = await supabase
        .from("appointments")
        .select("*", { count: "exact", head: true })
        .eq("status", "cancelled")
        .gte("appointment_date", thirtyDaysAgo);

      return totalCount && totalCount > 0 ? Math.round(((cancelledCount || 0) / totalCount) * 100) : 0;
    },
  });

  const revenueChartConfig = {
    revenue: {
      label: "Receita",
      color: "hsl(45, 93%, 47%)",
    },
  };

  const timesChartConfig = {
    count: {
      label: "Agendamentos",
      color: "hsl(45, 93%, 47%)",
    },
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-500/20 text-yellow-400",
      scheduled: "bg-blue-500/20 text-blue-400",
      completed: "bg-green-500/20 text-green-400",
      cancelled: "bg-red-500/20 text-red-400",
    };

    const labels: Record<string, string> = {
      pending: "Pendente",
      scheduled: "Agendado",
      completed: "Concluído",
      cancelled: "Cancelado",
    };

    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status]}`}>
        {labels[status]}
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gradient-gold">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
      </div>

      {/* Stats Cards - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="glass-card hover:shadow-gold/10 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Clientes
            </CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{clientsCount}</div>
            <p className="text-xs text-muted-foreground mt-1">cadastrados</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-gold/10 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Hoje
            </CardTitle>
            <Calendar className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{todayAppointments.length}</div>
            <p className="text-xs text-muted-foreground mt-1">agendamentos</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-gold/10 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Serviços/Mês
            </CardTitle>
            <Scissors className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{completedServicesCount}</div>
            <p className="text-xs text-muted-foreground mt-1">realizados</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-gold/10 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Receita/Mês
            </CardTitle>
            <DollarSign className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {monthlyRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">faturamento</p>
          </CardContent>
        </Card>

        <Card className="glass-card hover:shadow-gold/10 transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ocupação
            </CardTitle>
            <BarChart3 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{occupancyRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">do mês</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments - Moved to top */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Agenda de Hoje
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum agendamento para hoje</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {todayAppointments.map((appointment: any) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-primary">
                      {appointment.appointment_time?.slice(0, 5)}
                    </span>
                    <div>
                      <p className="text-sm font-medium">{appointment.client?.name}</p>
                      <p className="text-xs text-muted-foreground">{appointment.service?.name}</p>
                    </div>
                  </div>
                  {getStatusBadge(appointment.status)}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="glass-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary" />
              Faturamento por Período
            </CardTitle>
            <Select value={revenuePeriod} onValueChange={setRevenuePeriod}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">7 dias</SelectItem>
                <SelectItem value="30">30 dias</SelectItem>
                <SelectItem value="90">3 meses</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueChartConfig} className="h-[250px] w-full">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(45, 93%, 47%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis className="text-xs" tick={{ fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => `R$${value}`} />
                <ChartTooltip 
                  content={<ChartTooltipContent formatter={(value) => `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`} />} 
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(45, 93%, 47%)"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Popular Times Chart */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Horários Mais Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularTimesData.length === 0 ? (
              <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Sem dados suficientes
              </div>
            ) : (
              <ChartContainer config={timesChartConfig} className="h-[250px] w-full">
                <BarChart data={popularTimesData} layout="vertical" margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" horizontal={false} />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis dataKey="time" type="category" width={50} tick={{ fill: 'hsl(var(--muted-foreground))' }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="hsl(45, 93%, 47%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Charts Row - Now only 2 items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Popular Services */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Scissors className="w-5 h-5 text-primary" />
              Serviços Populares
            </CardTitle>
          </CardHeader>
          <CardContent>
            {popularServicesData.length === 0 ? (
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Sem dados suficientes
              </div>
            ) : (
              <ChartContainer config={{}} className="h-[200px] w-full">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Pie
                    data={popularServicesData}
                    dataKey="count"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                  >
                    {popularServicesData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
            {popularServicesData.length > 0 && (
              <div className="mt-4 space-y-2">
                {popularServicesData.map((service, index) => (
                  <div key={service.name} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-muted-foreground">{service.name}</span>
                    </div>
                    <span className="font-medium">{service.count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cancellation Rate */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-primary" />
              Taxa de Cancelamento
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center h-[280px]">
            <div className="relative">
              <svg className="w-32 h-32" viewBox="0 0 100 100">
                <circle
                  className="stroke-muted"
                  strokeWidth="8"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                />
                <circle
                  className="stroke-primary transition-all duration-500"
                  strokeWidth="8"
                  strokeLinecap="round"
                  fill="transparent"
                  r="40"
                  cx="50"
                  cy="50"
                  style={{
                    strokeDasharray: `${cancellationRate * 2.51} 251`,
                    transform: "rotate(-90deg)",
                    transformOrigin: "50% 50%",
                  }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold">{cancellationRate}%</span>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-4">Últimos 30 dias</p>
            <p className="text-xs text-muted-foreground mt-1">
              {cancellationRate < 10 ? "Excelente!" : cancellationRate < 20 ? "Bom" : "Atenção necessária"}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
