import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, isLoading, isAdmin, isAdminLoading } = useAuth();

  // Aguardar carregamento completo incluindo verificação de admin
  if (isLoading || (user && isAdminLoading)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Só redirecionar quando isAdminLoading for false
  if (user) {
    return <Navigate to={isAdmin ? "/admin" : "/cliente"} replace />;
  }

  return <LoginForm />;
}
