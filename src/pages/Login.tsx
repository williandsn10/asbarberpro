import { LoginForm } from "@/components/auth/LoginForm";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";

export default function Login() {
  const { user, profile, isLoading, isAdmin } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Se já está logado, redirecionar baseado no tipo
  if (user && profile) {
    return <Navigate to={isAdmin ? "/admin" : "/cliente"} replace />;
  }

  return <LoginForm />;
}
