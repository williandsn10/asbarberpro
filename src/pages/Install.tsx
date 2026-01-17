import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Smartphone, Monitor, Check, Share, MoreVertical, Plus } from "lucide-react";

type Platform = 'ios' | 'android' | 'desktop';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function Install() {
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [isInstalled, setIsInstalled] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    // Detect platform
    const userAgent = navigator.userAgent;
    if (/iPad|iPhone|iPod/.test(userAgent)) {
      setPlatform('ios');
    } else if (/Android/.test(userAgent)) {
      setPlatform('android');
    }

    // Check if already installed (standalone mode)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    // Also check iOS standalone
    if ((navigator as any).standalone === true) {
      setIsInstalled(true);
    }
  }, []);

  useEffect(() => {
    // Capture beforeinstallprompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  return (
    <div className="min-h-screen flex relative">
      {/* Background */}
      <div className="absolute inset-0 bg-cover bg-center" style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1621605815971-fbc98d665033?w=1200&q=80')`
      }}>
        <div className="absolute inset-0 bg-background/90" />
      </div>

      {/* Content */}
      <div className="w-full flex items-center justify-center p-6 sm:p-8 relative">
        <div className="absolute inset-0 bg-mesh-gradient opacity-30" />
        
        <div className="w-full max-w-md relative z-10 animate-fade-in">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img 
              alt="BarberPro" 
              className="w-20 h-20 object-contain" 
              src="/lovable-uploads/bdb7b21d-bfe1-49b9-81eb-ee1eeac51494.png" 
            />
          </div>
          
          {/* Title */}
          <h1 className="text-3xl sm:text-4xl font-bold italic text-center mb-2 text-foreground">
            Instalar App
          </h1>
          <p className="text-center text-muted-foreground mb-8">
            Adicione o BarberPro à sua tela inicial
          </p>

          {/* Already Installed Message */}
          {isInstalled && (
            <div className="glass-card p-6 rounded-xl mb-6 border border-primary/30 bg-primary/10">
              <div className="flex items-center justify-center gap-3 text-primary">
                <Check className="w-6 h-6" />
                <span className="font-semibold text-lg">App já instalado!</span>
              </div>
              <p className="text-center text-muted-foreground mt-2 text-sm">
                O BarberPro já está na sua tela inicial.
              </p>
            </div>
          )}

          {/* Platform-specific instructions */}
          {!isInstalled && (
            <div className="glass-card p-6 rounded-xl mb-6 border border-muted-foreground/20">
              {platform === 'ios' && <IOSInstructions />}
              {platform === 'android' && <AndroidInstructions deferredPrompt={deferredPrompt} onInstall={handleInstallClick} />}
              {platform === 'desktop' && <DesktopInstructions deferredPrompt={deferredPrompt} onInstall={handleInstallClick} />}
            </div>
          )}

          {/* Platform tabs */}
          {!isInstalled && (
            <div className="flex justify-center gap-2 mb-6">
              <button
                onClick={() => setPlatform('ios')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  platform === 'ios' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                iPhone
              </button>
              <button
                onClick={() => setPlatform('android')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  platform === 'android' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Android
              </button>
              <button
                onClick={() => setPlatform('desktop')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                  platform === 'desktop' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'bg-muted/50 text-muted-foreground hover:bg-muted'
                }`}
              >
                <Monitor className="w-4 h-4" />
                Desktop
              </button>
            </div>
          )}

          {/* Benefits */}
          <div className="glass-card p-5 rounded-xl mb-6 border border-muted-foreground/20">
            <h3 className="font-semibold text-foreground mb-3 text-center">Por que instalar?</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                Acesso rápido pela tela inicial
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                Funciona offline
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                Notificações de agendamentos
              </li>
              <li className="flex items-center gap-2">
                <Check className="w-4 h-4 text-primary shrink-0" />
                Experiência de app nativo
              </li>
            </ul>
          </div>

          {/* Back link */}
          <Link to="/login">
            <Button 
              variant="ghost" 
              className="w-full h-12 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function IOSInstructions() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-foreground">
        <Smartphone className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Instalar no iPhone</h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            1
          </div>
          <div>
            <p className="text-foreground font-medium">Toque no botão Compartilhar</p>
            <p className="text-sm text-muted-foreground">Na barra inferior do Safari</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <Share className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Compartilhar</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            2
          </div>
          <div>
            <p className="text-foreground font-medium">Role e toque em</p>
            <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
              <Plus className="w-5 h-5 text-primary" />
              <span className="text-sm text-muted-foreground">Adicionar à Tela de Início</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
            3
          </div>
          <div>
            <p className="text-foreground font-medium">Confirme tocando em "Adicionar"</p>
            <p className="text-sm text-muted-foreground">O ícone aparecerá na sua tela inicial</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function AndroidInstructions({ 
  deferredPrompt, 
  onInstall 
}: { 
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-foreground">
        <Smartphone className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Instalar no Android</h2>
      </div>

      {deferredPrompt && (
        <Button 
          onClick={onInstall}
          className="w-full h-12 bg-primary hover:bg-primary/90"
        >
          <Download className="w-5 h-5 mr-2" />
          Instalar BarberPro
        </Button>
      )}

      <div className={deferredPrompt ? "pt-2 border-t border-muted-foreground/20" : ""}>
        {deferredPrompt && (
          <p className="text-sm text-muted-foreground mb-4 text-center">Ou instale manualmente:</p>
        )}
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              1
            </div>
            <div>
              <p className="text-foreground font-medium">Toque no menu do Chrome</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                <MoreVertical className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Menu (3 pontos)</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              2
            </div>
            <div>
              <p className="text-foreground font-medium">Selecione "Instalar app"</p>
              <p className="text-sm text-muted-foreground">Ou "Adicionar à tela inicial"</p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              3
            </div>
            <div>
              <p className="text-foreground font-medium">Confirme a instalação</p>
              <p className="text-sm text-muted-foreground">O app será adicionado automaticamente</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DesktopInstructions({ 
  deferredPrompt, 
  onInstall 
}: { 
  deferredPrompt: BeforeInstallPromptEvent | null;
  onInstall: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 text-foreground">
        <Monitor className="w-5 h-5 text-primary" />
        <h2 className="font-semibold text-lg">Instalar no Computador</h2>
      </div>

      {deferredPrompt && (
        <Button 
          onClick={onInstall}
          className="w-full h-12 bg-primary hover:bg-primary/90"
        >
          <Download className="w-5 h-5 mr-2" />
          Instalar BarberPro
        </Button>
      )}

      <div className={deferredPrompt ? "pt-2 border-t border-muted-foreground/20" : ""}>
        {deferredPrompt && (
          <p className="text-sm text-muted-foreground mb-4 text-center">Ou instale manualmente:</p>
        )}
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              1
            </div>
            <div>
              <p className="text-foreground font-medium">Clique no ícone de instalação</p>
              <p className="text-sm text-muted-foreground">Na barra de endereço do Chrome ou Edge</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-lg">
                <Download className="w-5 h-5 text-primary" />
                <span className="text-sm text-muted-foreground">Ícone de download</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold text-sm">
              2
            </div>
            <div>
              <p className="text-foreground font-medium">Clique em "Instalar"</p>
              <p className="text-sm text-muted-foreground">O app abrirá em sua própria janela</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
