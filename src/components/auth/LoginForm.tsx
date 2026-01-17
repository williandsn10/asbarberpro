import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex relative">
      {/* Background image - visible only on mobile */}
      <div 
        className="absolute inset-0 lg:hidden bg-cover bg-center"
        style={{
          backgroundImage: `url('https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80')`,
        }}
      >
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-background/85" />
      </div>

      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 relative">
        {/* Background for desktop only */}
        <div className="hidden lg:block absolute inset-0 bg-background" />
        {/* Subtle gradient background - desktop only */}
        <div className="hidden lg:block absolute inset-0 bg-mesh-gradient opacity-50" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold italic text-center mb-10 text-foreground">
            Entrar
          </h1>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email input */}
            <input
              type="email"
              placeholder="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full h-14 px-4 bg-transparent border border-muted-foreground/30 
                         rounded-lg focus:border-primary/50 focus:outline-none transition-colors
                         text-foreground placeholder:text-muted-foreground"
            />

            {/* Password input with toggle */}
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full h-14 px-4 pr-12 bg-transparent border border-muted-foreground/30 
                           rounded-lg focus:border-primary/50 focus:outline-none transition-colors
                           text-foreground placeholder:text-muted-foreground"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {/* Forgot password - centered */}
            <Link 
              to="/esqueci-senha" 
              className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Esqueceu sua senha?
            </Link>

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 rounded-lg bg-muted-foreground/80 hover:bg-muted-foreground text-background font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Entrando...
                </>
              ) : (
                "Entrar"
              )}
            </Button>

            {/* Register link */}
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
