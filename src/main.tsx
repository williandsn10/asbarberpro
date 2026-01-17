import React from "react";
import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Register service worker for PWA
const updateSW = registerSW({
  onNeedRefresh() {
    // You can show a prompt to the user to refresh the app
    if (confirm("Nova versão disponível. Deseja atualizar?")) {
      updateSW(true);
    }
  },
  onOfflineReady() {
    console.log("BarberPro está pronto para uso offline!");
  },
  onRegistered(registration) {
    console.log("Service Worker registrado:", registration);
  },
  onRegisterError(error) {
    console.error("Erro ao registrar Service Worker:", error);
  },
});

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
