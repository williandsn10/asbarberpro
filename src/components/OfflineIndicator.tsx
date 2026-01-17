import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { syncPendingAppointments, hasPendingData } from "@/lib/offline-sync";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export function OfflineIndicator() {
  const { isOnline, isOffline } = useNetworkStatus();
  const { toast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
    }
  }, [isOffline]);

  useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      
      // Sync pending data
      if (hasPendingData()) {
        setIsSyncing(true);
        syncPendingAppointments()
          .then(({ synced, failed }) => {
            if (synced > 0) {
              toast({
                title: "Dados sincronizados",
                description: `${synced} agendamento(s) sincronizado(s) com sucesso.`,
              });
            }
            if (failed > 0) {
              toast({
                title: "Erro na sincronização",
                description: `${failed} agendamento(s) não puderam ser sincronizados.`,
                variant: "destructive",
              });
            }
          })
          .finally(() => {
            setIsSyncing(false);
          });
      }

      // Hide reconnected message after 3 seconds
      const timer = setTimeout(() => {
        setShowReconnected(false);
        setWasOffline(false);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline, toast]);

  if (!isOffline && !showReconnected && !isSyncing) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 rounded-lg p-3 shadow-lg transition-all duration-300",
        isOffline
          ? "bg-amber-500/90 text-amber-950"
          : isSyncing
          ? "bg-blue-500/90 text-white"
          : "bg-green-500/90 text-white"
      )}
    >
      <div className="flex items-center gap-3">
        {isOffline ? (
          <>
            <WifiOff className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Você está offline</p>
              <p className="text-xs opacity-90">
                Os dados serão sincronizados quando conectar
              </p>
            </div>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-5 w-5 flex-shrink-0 animate-spin" />
            <div>
              <p className="font-medium text-sm">Sincronizando dados...</p>
              <p className="text-xs opacity-90">Aguarde um momento</p>
            </div>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm">Conexão restaurada</p>
              <p className="text-xs opacity-90">Todos os dados estão sincronizados</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
