import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThermalPrinterProvider } from "@/contexts/ThermalPrinterContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Dashboard from "./pages/Dashboard";
import Orders from "./pages/Orders";
import Menu from "./pages/Menu";
import Billing from "./pages/Billing";
import Staff from "./pages/Staff";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Branches from "./pages/Branches";
import StaffPerformance from "./pages/StaffPerformance";
import ActivityLog from "./pages/ActivityLog";

import Profile from "./pages/Profile";
import PrinterSetup from "./pages/PrinterSetup";
import Install from "./pages/Install";

import PublicMenu from "./pages/PublicMenu";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <ThermalPrinterProvider>
            <Routes>
              <Route path="/auth" element={<Auth />} />
              <Route path="/install" element={<Install />} />
              <Route path="/menu/:branchCode" element={<PublicMenu />} />
              <Route path="/" element={<ProtectedRoute allowedRoles={['admin', 'branch_admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="/orders" element={<ProtectedRoute allowedRoles={['branch_admin', 'billing']}><Orders /></ProtectedRoute>} />
              <Route path="/menu" element={<ProtectedRoute allowedRoles={['admin', 'branch_admin']}><Menu /></ProtectedRoute>} />
              <Route path="/billing" element={<ProtectedRoute allowedRoles={['branch_admin', 'billing']}><Billing /></ProtectedRoute>} />
              <Route path="/branches" element={<ProtectedRoute allowedRoles={['admin']}><Branches /></ProtectedRoute>} />
              <Route path="/staff" element={<ProtectedRoute allowedRoles={['admin', 'branch_admin']}><Staff /></ProtectedRoute>} />
              <Route path="/staff-performance" element={<ProtectedRoute allowedRoles={['admin', 'branch_admin']}><StaffPerformance /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute allowedRoles={['admin']}><Reports /></ProtectedRoute>} />
              
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="/printer-setup" element={<ProtectedRoute><PrinterSetup /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute allowedRoles={['admin']}><Settings /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ThermalPrinterProvider>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
