import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Convert base64 URL to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Convert ArrayBuffer to base64 URL string
function arrayBufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return "";
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Cache for VAPID public key
let cachedVapidKey: string | null = null;

async function getVapidPublicKey(): Promise<string | null> {
  if (cachedVapidKey) return cachedVapidKey;
  
  try {
    const { data, error } = await supabase.functions.invoke("get-vapid-key");
    if (error) {
      console.error("Error fetching VAPID key:", error);
      return null;
    }
    cachedVapidKey = data?.publicKey || null;
    return cachedVapidKey;
  } catch (error) {
    console.error("Error fetching VAPID key:", error);
    return null;
  }
}

export function usePushNotifications() {
  const { profile } = useAuth();
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [permission, setPermission] = useState<NotificationPermission>("default");

  // Check if push notifications are supported
  useEffect(() => {
    const supported = 
      "serviceWorker" in navigator && 
      "PushManager" in window && 
      "Notification" in window;
    
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
    }
  }, []);

  // Check existing subscription status
  useEffect(() => {
    async function checkSubscription() {
      if (!isSupported || !profile?.id) {
        setIsLoading(false);
        return;
      }

      try {
        // Check if user has any subscriptions in the database
        const { data, error } = await supabase
          .from("push_subscriptions")
          .select("id")
          .eq("user_id", profile.id)
          .limit(1);

        if (error) {
          console.error("Error checking subscription:", error);
        } else {
          setIsSubscribed(data && data.length > 0);
        }
      } catch (error) {
        console.error("Error checking subscription:", error);
      } finally {
        setIsLoading(false);
      }
    }

    checkSubscription();
  }, [isSupported, profile?.id]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported || !profile?.id) {
      toast.error("Notificações push não são suportadas neste navegador");
      return false;
    }

    try {
      setIsLoading(true);

      // Get VAPID public key from backend
      const vapidPublicKey = await getVapidPublicKey();
      
      if (!vapidPublicKey) {
        toast.error("Configuração de notificações não encontrada");
        console.error("VAPID_PUBLIC_KEY not configured");
        return false;
      }

      // Request notification permission
      const result = await Notification.requestPermission();
      setPermission(result);

      if (result !== "granted") {
        toast.error("Permissão para notificações foi negada");
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey.buffer as ArrayBuffer,
      });

      // Extract keys
      const p256dhBuffer = subscription.getKey("p256dh");
      const authBuffer = subscription.getKey("auth");
      const p256dhKey = arrayBufferToBase64Url(p256dhBuffer);
      const authKey = arrayBufferToBase64Url(authBuffer);

      // Save subscription to database
      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: profile.id,
          endpoint: subscription.endpoint,
          p256dh_key: p256dhKey,
          auth_key: authKey,
        },
        {
          onConflict: "user_id,endpoint",
        }
      );

      if (error) {
        console.error("Error saving subscription:", error);
        toast.error("Erro ao salvar configuração de notificações");
        return false;
      }

      setIsSubscribed(true);
      toast.success("Notificações ativadas com sucesso!");
      return true;
    } catch (error) {
      console.error("Error subscribing to push:", error);
      toast.error("Erro ao ativar notificações");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, profile?.id]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    if (!profile?.id) return false;

    try {
      setIsLoading(true);

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await subscription.unsubscribe();
      }

      // Remove from database
      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", profile.id);

      if (error) {
        console.error("Error removing subscription:", error);
        toast.error("Erro ao desativar notificações");
        return false;
      }

      setIsSubscribed(false);
      toast.success("Notificações desativadas");
      return true;
    } catch (error) {
      console.error("Error unsubscribing:", error);
      toast.error("Erro ao desativar notificações");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [profile?.id]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
  };
}
