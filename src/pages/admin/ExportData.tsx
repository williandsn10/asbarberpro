import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, Database, Users, Calendar, Scissors, Shield, Clock, Bell, Copy, Check } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface ExportOption {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  tableName: string;
}

const exportOptions: ExportOption[] = [
  { id: "appointments", label: "Agendamentos", description: "Todos os agendamentos com dados de clientes e serviços", icon: Calendar, tableName: "appointments" },
  { id: "profiles", label: "Clientes / Usuários", description: "Perfis de clientes e administradores", icon: Users, tableName: "profiles" },
  { id: "services", label: "Serviços", description: "Catálogo de serviços com preços e duração", icon: Scissors, tableName: "services" },
  { id: "barbers", label: "Barbeiros", description: "Lista de barbeiros cadastrados", icon: Users, tableName: "barbers" },
  { id: "blocked_times", label: "Bloqueios de Horário", description: "Horários bloqueados na agenda", icon: Clock, tableName: "blocked_times" },
  { id: "user_roles", label: "Papéis de Usuário", description: "Atribuições de roles (admin/user)", icon: Shield, tableName: "user_roles" },
  { id: "settings", label: "Configurações", description: "Configurações do sistema", icon: Database, tableName: "settings" },
  { id: "push_subscriptions", label: "Inscrições Push", description: "Inscrições de notificações push", icon: Bell, tableName: "push_subscriptions" },
];

function convertToCSV(data: Record<string, unknown>[]): string {
  if (!data || data.length === 0) return "";
  const headers = Object.keys(data[0]);
  const csvRows = [
    headers.join(","),
    ...data.map(row =>
      headers.map(h => {
        const val = row[h];
        const str = val === null || val === undefined ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
        return `"${str.replace(/"/g, '""')}"`;
      }).join(",")
    ),
  ];
  return csvRows.join("\n");
}

function downloadCSV(csv: string, filename: string) {
  const BOM = "\uFEFF";
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const tableSQLSchemas: { name: string; sql: string }[] = [
  {
    name: "barbers",
    sql: `CREATE TABLE public.barbers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.barbers ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "services",
    sql: `CREATE TABLE public.services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_minutes INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "user_roles",
    sql: `CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "profiles",
    sql: `CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  user_type user_type NOT NULL DEFAULT 'client'::user_type,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "appointments",
    sql: `CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  barber_id UUID NOT NULL REFERENCES public.barbers(id),
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status appointment_status NOT NULL DEFAULT 'pending'::appointment_status,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "blocked_times",
    sql: `CREATE TABLE public.blocked_times (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  start_time TIME,
  end_time TIME,
  is_full_day BOOLEAN NOT NULL DEFAULT false,
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.blocked_times ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "settings",
    sql: `CREATE TABLE public.settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;`,
  },
  {
    name: "push_subscriptions",
    sql: `CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;`,
  },
];

const enumsSQL = `-- Enums necessários (criar ANTES das tabelas)
CREATE TYPE public.user_type AS ENUM ('admin', 'client');
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.appointment_status AS ENUM ('pending', 'scheduled', 'completed', 'cancelled');
`;

const functionsSQL = `-- Funções auxiliares (criar DEPOIS das tabelas)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path TO 'public' AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;
`;

const fullSQL = [enumsSQL, ...tableSQLSchemas.map(t => `-- Tabela: ${t.name}\n${t.sql}`), functionsSQL].join("\n\n");

export default function ExportData() {
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast.success("SQL copiado!");
    setTimeout(() => setCopied(null), 2000);
  };

  const exportTable = async (tableName: string, label: string) => {
    setLoading(tableName);
    try {
      const { data, error } = await supabase.from(tableName as any).select("*");
      if (error) throw error;
      if (!data || data.length === 0) {
        toast.info(`Nenhum dado encontrado em "${label}".`);
        return;
      }
      const csv = convertToCSV(data as unknown as Record<string, unknown>[]);
      downloadCSV(csv, tableName);
      toast.success(`"${label}" exportado com sucesso!`);
    } catch (err: any) {
      toast.error(`Erro ao exportar "${label}": ${err.message}`);
    } finally {
      setLoading(null);
    }
  };

  const exportAll = async () => {
    setLoadingAll(true);
    for (const opt of exportOptions) {
      try {
        const { data, error } = await supabase.from(opt.tableName as any).select("*");
        if (error) throw error;
        if (data && data.length > 0) {
          const csv = convertToCSV(data as unknown as Record<string, unknown>[]);
          downloadCSV(csv, opt.tableName);
        }
      } catch {
        // skip silently
      }
    }
    toast.success("Exportação completa!");
    setLoadingAll(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
        <p className="text-muted-foreground">Exporte dados em CSV ou copie o SQL das tabelas para migração.</p>
      </div>

      <Tabs defaultValue="csv" className="w-full">
        <TabsList>
          <TabsTrigger value="csv">
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </TabsTrigger>
          <TabsTrigger value="sql">
            <Database className="w-4 h-4 mr-2" />
            SQL das Tabelas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv" className="space-y-4 mt-4">
          <div className="flex justify-end">
            <Button onClick={exportAll} disabled={loadingAll} className="gap-2">
              {loadingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              Exportar Tudo
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {exportOptions.map(opt => (
              <Card key={opt.id} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <opt.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{opt.label}</CardTitle>
                      <CardDescription className="text-xs">{opt.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={loading === opt.tableName}
                    onClick={() => exportTable(opt.tableName, opt.label)}
                  >
                    {loading === opt.tableName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    Exportar CSV
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="sql" className="space-y-4 mt-4">
          {/* Copiar tudo */}
          <Card className="border-border">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">SQL Completo (todas as tabelas)</CardTitle>
                  <CardDescription className="text-xs">Inclui enums, funções e todas as tabelas. Cole em outro banco para migrar.</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 shrink-0"
                  onClick={() => copyToClipboard(fullSQL, "full")}
                >
                  {copied === "full" ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  {copied === "full" ? "Copiado!" : "Copiar Tudo"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg text-xs overflow-auto max-h-60 whitespace-pre-wrap font-mono text-muted-foreground">
                {fullSQL}
              </pre>
            </CardContent>
          </Card>

          {/* Tabelas individuais */}
          <div className="grid gap-4">
            {tableSQLSchemas.map(t => (
              <Card key={t.name} className="border-border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">{t.name}</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 h-8"
                      onClick={() => copyToClipboard(t.sql, t.name)}
                    >
                      {copied === t.name ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied === t.name ? "Copiado!" : "Copiar"}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="bg-muted p-3 rounded-lg text-xs overflow-auto max-h-40 whitespace-pre-wrap font-mono text-muted-foreground">
                    {t.sql}
                  </pre>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
