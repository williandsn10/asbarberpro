import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Calendar, User, LogOut, Home } from "lucide-react";
import logo from "@/assets/logo.png";

export function ClientHeader() {
  const location = useLocation();
  const { signOut, profile } = useAuth();

  const menuItems = [
    { title: "Início", url: "/cliente", icon: Home },
    { title: "Agendar", url: "/cliente/agendar", icon: Calendar },
    { title: "Meus Agendamentos", url: "/cliente/meus-agendamentos", icon: User },
  ];

  return (
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto h-full flex items-center justify-between px-4">
        <Link to="/cliente" className="flex items-center gap-3">
          <img src={logo} alt="BarberPro" className="w-10 h-10 rounded-lg" />
          <span className="font-bold text-lg text-gradient-gold hidden sm:inline">BarberPro</span>
        </Link>

        <nav className="flex items-center gap-1">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url;
            return (
              <Link
                key={item.url}
                to={item.url}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <item.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{item.title}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground hidden md:inline">
            Olá, {profile?.name?.split(" ")[0]}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={signOut}
            className="text-muted-foreground hover:text-destructive"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
