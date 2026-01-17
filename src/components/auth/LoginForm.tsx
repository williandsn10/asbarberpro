import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GlowInput } from "@/components/ui/glow-input";
import { Scissors, Eye, EyeOff, Loader2, Mail, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast({
        title: "Erro ao entrar",
        description: "E-mail ou senha incorretos.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      const userIsAdmin = !!roleData;
      
      toast({
        title: "Bem-vindo!",
        description: "Login realizado com sucesso.",
      });

      navigate(userIsAdmin ? "/admin" : "/cliente", { replace: true });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível obter dados do usuário.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Logo and header */}
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 bg-gradient-gold rounded-xl flex items-center justify-center shadow-gold mb-4 transform hover:scale-105 transition-transform duration-300">
              <Scissors className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold">
              <span className="text-gradient-gold">BarberPro</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Entre com suas credenciais para acessar
            </p>
          </div>

          {/* Glass form card */}
          <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-2xl space-y-5">
            <GlowInput
              label="E-mail"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              icon={<Mail className="w-4 h-4" />}
            />

            <GlowInput
              label="Senha"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              icon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <div className="text-right">
              <Link 
                to="#" 
                className="text-sm text-primary/80 hover:text-primary hover:underline transition-colors"
              >
                Esqueceu sua senha?
              </Link>
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold h-11 group"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center pt-2">
              Não tem uma conta?{" "}
              <Link 
                to="/cadastro" 
                className="text-primary hover:underline font-medium"
              >
                Cadastre-se
              </Link>
            </p>
          </form>
        </div>
      </div>

      {/* Right side - Image (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80"
          alt="Barbearia moderna"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Floating quote */}
        <div className="absolute bottom-12 left-8 right-8 glass-card p-6 rounded-xl max-w-md">
          <p className="text-foreground/90 italic text-lg">
            "A melhor experiência em barbearia que você pode ter."
          </p>
          <p className="text-primary mt-2 font-medium">— BarberPro</p>
        </div>
      </div>
    </div>
  );
}
