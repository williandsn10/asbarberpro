import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { GlowInput } from "@/components/ui/glow-input";
import { Eye, EyeOff, Loader2, Mail, Lock, User, Phone, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

export function RegisterForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    return value;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(formatPhone(e.target.value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({
        title: "Senhas não coincidem",
        description: "Por favor, verifique as senhas digitadas.",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Senha muito curta",
        description: "A senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, name, phone);

    if (error) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message || "Ocorreu um erro ao criar sua conta.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    toast({
      title: "Conta criada!",
      description: "Bem-vindo ao BarberPro!",
    });

    navigate("/cliente");
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Image (hidden on mobile) */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1200&q=80"
          alt="Barbearia moderna"
          className="w-full h-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-l from-background via-background/60 to-transparent" />
        
        {/* Decorative elements */}
        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-background/80 to-transparent" />
        
        {/* Floating quote */}
        <div className="absolute bottom-12 right-8 left-8 glass-card p-6 rounded-xl max-w-md ml-auto">
          <p className="text-foreground/90 italic text-lg">
            "Agende seus horários de forma rápida e prática."
          </p>
          <p className="text-primary mt-2 font-medium">— BarberPro</p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-background relative">
        {/* Subtle gradient background */}
        <div className="absolute inset-0 bg-mesh-gradient opacity-50" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Logo and header */}
          <div className="text-center mb-6">
            <img src={logo} alt="BarberPro" className="mx-auto w-20 h-20 object-contain mb-4" />
            <h1 className="text-3xl font-bold">
              <span className="text-gradient-gold">BarberPro</span>
            </h1>
            <p className="text-muted-foreground mt-2">
              Crie sua conta para agendar horários
            </p>
          </div>

          {/* Glass form card */}
          <form onSubmit={handleSubmit} className="glass-card p-6 sm:p-8 rounded-2xl space-y-4">
            <GlowInput
              label="Nome completo"
              type="text"
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              icon={<User className="w-4 h-4" />}
            />

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
              label="Telefone"
              type="tel"
              placeholder="(00) 00000-0000"
              value={phone}
              onChange={handlePhoneChange}
              icon={<Phone className="w-4 h-4" />}
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

            <GlowInput
              label="Confirmar senha"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              icon={<Lock className="w-4 h-4" />}
              endIcon={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="hover:text-foreground transition-colors p-1"
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              }
            />

            <Button
              type="submit"
              className="w-full bg-gradient-gold hover:opacity-90 text-primary-foreground font-semibold h-11 group mt-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando conta...
                </>
              ) : (
                <>
                  <span>Criar conta</span>
                  <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>

            <p className="text-sm text-muted-foreground text-center pt-2">
              Já tem uma conta?{" "}
              <Link 
                to="/login" 
                className="text-primary hover:underline font-medium"
              >
                Faça login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
