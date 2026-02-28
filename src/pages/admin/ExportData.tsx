import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, Database, Users, Calendar, Scissors, Shield, Clock, Bell } from "lucide-react";
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

export default function ExportData() {
  const [loading, setLoading] = useState<string | null>(null);
  const [loadingAll, setLoadingAll] = useState(false);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Exportar Dados</h1>
          <p className="text-muted-foreground">Exporte os dados do sistema em formato CSV.</p>
        </div>
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
    </div>
  );
}
