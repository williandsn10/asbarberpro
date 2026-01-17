import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { ClientLayout } from "@/components/layout/ClientLayout";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import AdminDashboard from "./pages/admin/Dashboard";
import Clients from "./pages/admin/Clients";
import Services from "./pages/admin/Services";
import Appointments from "./pages/admin/Appointments";
import BlockedTimes from "./pages/admin/BlockedTimes";
import Users from "./pages/admin/Users";
import AdminSettings from "./pages/admin/Settings";
import ClientDashboard from "./pages/client/Dashboard";
import BookAppointment from "./pages/client/BookAppointment";
import MyAppointments from "./pages/client/MyAppointments";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            
            {/* Admin Routes */}
            <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminLayout /></ProtectedRoute>}>
              <Route index element={<AdminDashboard />} />
              <Route path="clientes" element={<Clients />} />
              <Route path="servicos" element={<Services />} />
              <Route path="agendamentos" element={<Appointments />} />
              <Route path="bloqueios" element={<BlockedTimes />} />
              <Route path="usuarios" element={<Users />} />
              <Route path="configuracoes" element={<AdminSettings />} />
            </Route>

            {/* Client Routes */}
            <Route path="/cliente" element={<ProtectedRoute><ClientLayout /></ProtectedRoute>}>
              <Route index element={<ClientDashboard />} />
              <Route path="agendar" element={<BookAppointment />} />
              <Route path="meus-agendamentos" element={<MyAppointments />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
        <OfflineIndicator />
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
