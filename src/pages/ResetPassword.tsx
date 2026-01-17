import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Loader2, ArrowLeft, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Link inválido",
          description: "O link de recuperação expirou ou é inválido.",
          variant: "destructive",
        });
        navigate("/esqueci-senha");
      }
    };
    checkSession();
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Erro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Erro",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: password,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a senha. Tente novamente.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setIsSuccess(true);
    toast({
      title: "Senha atualizada!",
      description: "Sua senha foi redefinida com sucesso.",
    });
    
    // Sign out and redirect to login after 2 seconds
    setTimeout(async () => {
      await supabase.auth.signOut();
      navigate("/login");
    }, 2000);
    
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Back link */}
          <Link 
            to="/login" 
            className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao login
          </Link>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold italic text-center mb-4 text-foreground">
            Nova senha
          </h1>
          <p className="text-muted-foreground text-center mb-10">
            Digite sua nova senha abaixo
          </p>

          {isSuccess ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  Senha atualizada!
                </h2>
                <p className="text-muted-foreground">
                  Redirecionando para a página de login...
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Password input */}
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Nova senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
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

              {/* Confirm password input */}
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirmar nova senha"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full h-14 px-4 pr-12 bg-transparent border border-muted-foreground/30 
                             rounded-lg focus:border-primary/50 focus:outline-none transition-colors
                             text-foreground placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <p className="text-sm text-muted-foreground">
                A senha deve ter pelo menos 6 caracteres.
              </p>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-lg bg-muted-foreground/80 hover:bg-muted-foreground text-background font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Redefinir senha"
                )}
              </Button>
            </form>
          )}
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
