import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const redirectUrl = `${window.location.origin}/redefinir-senha`;

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) {
      toast({
        title: "Erro",
        description: "Não foi possível enviar o e-mail de recuperação.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    setEmailSent(true);
    toast({
      title: "E-mail enviado!",
      description: "Verifique sua caixa de entrada para redefinir sua senha.",
    });
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

          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img src={logo} alt="BarberPro" className="w-20 h-20 object-contain" />
          </div>

          {/* Title */}
          <h1 className="text-4xl sm:text-5xl font-bold italic text-center mb-4 text-foreground">
            Recuperar senha
          </h1>
          <p className="text-muted-foreground text-center mb-10">
            Digite seu e-mail para receber um link de recuperação
          </p>

          {emailSent ? (
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
                <Mail className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground mb-2">
                  E-mail enviado!
                </h2>
                <p className="text-muted-foreground">
                  Enviamos um link de recuperação para <strong>{email}</strong>. 
                  Verifique sua caixa de entrada e siga as instruções.
                </p>
              </div>
              <Button
                onClick={() => setEmailSent(false)}
                variant="outline"
                className="w-full h-12 rounded-lg"
              >
                Enviar novamente
              </Button>
            </div>
          ) : (
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

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 rounded-lg bg-muted-foreground/80 hover:bg-muted-foreground text-background font-semibold"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  "Enviar link de recuperação"
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
