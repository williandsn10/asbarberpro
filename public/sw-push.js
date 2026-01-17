// Push notification handler for service worker
// This file is imported by the main service worker

self.addEventListener("push", (event) => {
  console.log("[Service Worker] Push received");

  let data = {
    title: "BarberPro",
    body: "Você tem uma nova notificação",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      console.error("[Service Worker] Error parsing push data:", e);
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || "/pwa-192x192.png",
    badge: data.badge || "/pwa-192x192.png",
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: [
      {
        action: "open",
        title: "Ver Detalhes",
      },
      {
        action: "close",
        title: "Fechar",
      },
    ],
    requireInteraction: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  console.log("[Service Worker] Notification clicked");
  
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Determine the URL based on notification type
  const notificationData = event.notification.data || {};
  let targetUrl = "/cliente/meus-agendamentos"; // Default for clients
  
  // If this is a new appointment notification for admins, redirect to admin page
  if (notificationData.type === "new_appointment") {
    targetUrl = notificationData.url || "/admin/agendamentos";
  } else if (notificationData.url) {
    targetUrl = notificationData.url;
  }

  // Open the app
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      // Check if app is already open
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && "focus" in client) {
          // Navigate to the target URL if different
          if (!client.url.endsWith(targetUrl)) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      // Open new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

self.addEventListener("notificationclose", (event) => {
  console.log("[Service Worker] Notification closed");
});
