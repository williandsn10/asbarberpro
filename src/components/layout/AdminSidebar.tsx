import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  LayoutDashboard,
  Users,
  Scissors,
  Calendar,
  LogOut,
  Menu,
  Shield,
  CalendarOff,
  Settings,
} from "lucide-react";
import logo from "@/assets/logo.png";

const menuItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Clientes", url: "/admin/clientes", icon: Users },
  { title: "Serviços", url: "/admin/servicos", icon: Scissors },
  { title: "Agendamentos", url: "/admin/agendamentos", icon: Calendar },
  { title: "Bloqueios", url: "/admin/bloqueios", icon: CalendarOff },
  { title: "Usuários", url: "/admin/usuarios", icon: Shield },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

export function AdminSidebar() {
  const location = useLocation();
  const { signOut, profile } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  // Query para buscar contagem de agendamentos pendentes
  const { data: pendingCount = 0 } = useQuery({
    queryKey: ['pending-appointments-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');
      
      if (error) throw error;
      return count || 0;
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  });

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <Link to="/admin" className="flex items-center gap-3">
          <img src={logo} alt="BarberPro" className="w-10 h-10 object-contain flex-shrink-0" />
          {!collapsed && (
            <div>
              <h1 className="font-bold text-lg text-gradient-gold">BarberPro</h1>
              <p className="text-xs text-muted-foreground">Painel Admin</p>
            </div>
          )}
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                const isAgendamentos = item.url === "/admin/agendamentos";
                const tooltipText = isAgendamentos && pendingCount > 0
                  ? `${item.title} (${pendingCount} pendente${pendingCount > 1 ? 's' : ''})`
                  : item.title;
                
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      tooltip={tooltipText}
                    >
                      <Link
                        to={item.url}
                        className={cn(
                          "flex items-center gap-3 transition-colors",
                          isActive && "bg-sidebar-accent text-primary"
                        )}
                      >
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                        {isAgendamentos && pendingCount > 0 && !collapsed && (
                          <Badge 
                            variant="destructive" 
                            className="ml-auto h-5 min-w-[20px] px-1.5 text-xs animate-pulse"
                          >
                            {pendingCount}
                          </Badge>
                        )}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {!collapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium truncate">{profile?.name}</p>
            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
          </div>
        )}
        <Button
          variant="ghost"
          size={collapsed ? "icon" : "default"}
          onClick={signOut}
          className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
